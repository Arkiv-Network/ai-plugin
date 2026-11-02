import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {inspectSdk,updateContext} from './sdk-context.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const events=new Set(['SessionStart','UserPromptSubmit','FileChanged','CwdChanged','PostCompact','SessionEnd']);
const limit=32768, idleMs=10*60*1000;
function validObservation(o){
 const f=o?.facts;
 return o&&typeof o.workspace==='string'&&o.workspace.length<=256&&f&&
  [null,'compatible','out_of_range','not_installed','mismatch','absent'].includes(f.state)&&
  (f.version===null||typeof f.version==='string'&&/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(f.version))&&
  (f.declarations===null||Number.isSafeInteger(f.declarations)&&f.declarations>=0&&f.declarations<=512)&&
  Object.keys(f).every(k=>['state','version','declarations','reason'].includes(k))&&
  (f.reason===undefined||f.reason===null||f.reason==='insufficient_evidence');
}
// The adapter cannot authenticate the process answering on the session's IPC name, so it
// injects only text composed entirely of this hook's own fact templates.
const factLines=[/^Previous facts emitted by this hook for the local workspace are invalidated\.$/,
 /^Installed declaration contents changed; previous declaration facts emitted by this hook are invalidated\.$/,
 /^SDK version category: (?:compatible|out_of_range|not_installed|mismatch|absent|unmeasured)\.$/,
 /^Installed SDK version: (?:\d{1,6}\.\d{1,6}\.\d{1,6}|unmeasured)\.$/,/^Installed declaration files inspected: (?:\d{1,3}|unmeasured)\.$/,
 /^Plugin-supported SDK range: >=1\.0\.0 <2\.$/,
 /^Scope: local package inspection only\. Each field is independent; unmeasured means insufficient local evidence for that field only\. Other supplied evidence and skill guidance retain their own scope\.$/];
export function knownContext(text){
 if(typeof text!=='string'||text.length>2048)return '';
 const [first,...rest]=text.split('\n');
 return first==='Arkiv SDK evidence for the local workspace:'&&rest.every(l=>factLines.some(r=>r.test(l)))?text:'';
}
// OS-local IPC only: no TCP address, HTTP, DNS, remote server, or disk state.
// One short-lived process per native session; no shared suppression across sessions.
function identity(session,host){
 if(typeof session!=='string'||session.length<8||session.length>256||!['claude-code','codex'].includes(host))return null;
 return `${host}\0${session}\0${process.getuid?.()??os.userInfo().username}`;
}
export function sessionProof(session,host){
 const value=identity(session,host);return value===null?null:hash(`arkiv-context-proof\0${value}`);
}
export function endpoint(session,host,{platform=process.platform,nodeVersion=process.versions.node}={}){
 const value=identity(session,host);if(value===null)return null;
 const id=hash(value).slice(0,32);
 if(platform==='win32')return `\\\\.\\pipe\\arkiv-context-${id}`;
 const [major,minor]=nodeVersion.split('.').map(Number);
 // Filesystem Unix sockets can survive a crash and prevent a new broker from
 // binding. Linux abstract sockets disappear with their final kernel reference.
 if(platform==='linux'&&(major>20||major===20&&minor>=8))return `\0arkiv-context-${id}`;
 // Do not create a persistent session-derived pathname on unsupported hosts.
 return null;
}
export async function exchange(address,message,timeout=300){
 return new Promise(resolve=>{let data='',done=false;const socket=net.createConnection(address);
  const end=value=>{if(done)return;done=true;socket.destroy();resolve(value);};
  socket.setTimeout(timeout,()=>end(null));socket.on('error',()=>end(null));
  socket.on('connect',()=>socket.write(JSON.stringify(message)+'\n'));
  socket.on('data',chunk=>{data+=chunk;if(data.length>limit)return end(null);if(data.includes('\n')){try{end(JSON.parse(data.split('\n')[0]));}catch{end(null);}}});
  socket.on('end',()=>end(null));
 });
}
export function serve(address,{idle=idleMs,proof}={}){
 if(typeof address!=='string'||typeof proof!=='string'||!/^[a-f0-9]{64}$/.test(proof))throw Error('Invalid IPC channel');
 let state=null,workspace=null,workspaceRevision=0,timer;const sockets=new Set(),replies=new Map();
 // An adapter that timed out before reading a reply resends the same request, possibly after
 // other hooks' requests. Replay that reply instead of applying the request twice, which
 // would suppress the change it carried. Recent replies only, bounded.
 const reply=(socket,m,text)=>{
  if(typeof m.requestId==='string'&&/^[A-Za-z0-9-]{1,64}$/.test(m.requestId)){replies.set(m.requestId,text);if(replies.size>32)replies.delete(replies.keys().next().value);}
  socket.end(text);
 };
 const server=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.setTimeout(1000,()=>socket.destroy());let input='';
  socket.on('data',chunk=>{
   input+=chunk;if(input.length>limit)return socket.destroy();if(!input.includes('\n'))return;
   let m;try{m=JSON.parse(input.split('\n')[0]);}catch{return socket.destroy();}input='';
   // Abstract names are enumerable by other local users. Knowing the address
   // must not allow them to inject facts, reset idle expiry or end a session.
   if(typeof m?.proof!=='string'||!/^[a-f0-9]{64}$/.test(m.proof)||!timingSafeEqual(Buffer.from(m.proof,'hex'),Buffer.from(proof,'hex')))return socket.end('{}\n');
   if(!events.has(m.event))return socket.end('{}\n');
   clearTimeout(timer);timer=setTimeout(close,idle);
   if(typeof m.requestId==='string'&&replies.has(m.requestId))return socket.end(replies.get(m.requestId));
   if(m.event==='SessionEnd'){socket.end('{}\n');setImmediate(close);return;}
   if(m.operation==='resolveWorkspace'){
    // Claude can report the launch cwd after a real CwdChanged event. Keep the
    // explicit native selection in session RAM; never infer it from shell text.
    const valid=p=>typeof p==='string'&&p.length<=4096&&path.isAbsolute(p);
    if(!valid(m.cwd))return socket.end('{}\n');
    const reset=!workspace||m.event==='SessionStart'&&m.source==='startup'||
     m.event==='SessionStart'&&m.source==='resume'&&m.cwd!==workspace.reported;
    if(reset){workspace={reported:m.cwd,selected:m.cwd};workspaceRevision++;}
    if(m.event==='CwdChanged'){
     workspace.selected=valid(m.newCwd)?m.newCwd:null;workspaceRevision++;
    }
    reply(socket,m,JSON.stringify({cwd:workspace.selected,workspaceRevision})+'\n');return;
   }
   if(m.workspaceRevision!==undefined&&m.workspaceRevision!==workspaceRevision)return socket.end('{"stale":true}\n');
   const o=m.observation;
   if(!['FileChanged','CwdChanged','PostCompact'].includes(m.event)&&!validObservation(o))return socket.end('{}\n');
   const result=updateContext(state,o,m.event,m.source);state=result.state;
   reply(socket,m,JSON.stringify({context:result.context})+'\n');
  });
 });
 function close(){clearTimeout(timer);state=null;workspace=null;for(const s of sockets)s.destroy();server.close();}
 server.on('error',()=>{clearTimeout(timer);state=null;workspace=null;});
 const mask=process.umask(0o077);
 try{server.listen(address,()=>{timer=setTimeout(close,idle);});}finally{process.umask(mask);}
 return {server,close};
}
export async function hook(input,host){
 if(!input||!events.has(input.hook_event_name))return {};
 const event=input.hook_event_name,address=endpoint(input.session_id,host);if(!address)return {};
 const source=event==='SessionStart'&&['startup','resume','compact','clear'].includes(input.source)?input.source:undefined;
 const proof=sessionProof(input.session_id,host);
 const request=async message=>{
  let result=await exchange(address,message,150);
  if(result===null&&['SessionStart','UserPromptSubmit'].includes(event)){
  // The host starts the broker as an asynchronous hook. Spawning a detached
  // descendant here keeps Windows PowerShell waiting and discards context on timeout.
   for(let i=0;i<12&&result===null;i++){await new Promise(r=>setTimeout(r,40));result=await exchange(address,message,100);}
  }
  return result;
 };
 // A fresh conversation has no earlier hook facts to invalidate, so it can report measured
 // facts without the broker. Resume and compaction cannot know earlier facts and stay silent.
 const fresh=event==='SessionStart'&&['startup','clear'].includes(source);
 const stateless=async()=>{
  if(!fresh)return {};
  const o=await inspectSdk(input.cwd);
  const context=updateContext(null,{facts:o.facts,workspace:hash(o.workspace??'unknown'),fingerprint:o.fingerprint,declarationFingerprint:o.declarationFingerprint},event,source).context;
  const output=knownContext(context)?{hookSpecificOutput:{hookEventName:event,additionalContext:context}}:{};
  if(host==='claude-code')output.hookSpecificOutput={...output.hookSpecificOutput,hookEventName:event,watchPaths:o.watchPaths};
  return output;
 };
 let observation,workspaceRevision;
 if(['SessionStart','UserPromptSubmit','CwdChanged','FileChanged'].includes(event)){
  let cwd=event==='CwdChanged'?input.new_cwd:input.cwd;
  if(host==='claude-code'){
   const selected=await request({event,source,proof,operation:'resolveWorkspace',requestId:randomUUID(),cwd:input.cwd,newCwd:input.new_cwd});
   if(!selected||!Number.isSafeInteger(selected.workspaceRevision))return selected===null?stateless():{};
   if(selected.cwd!==null&&!(typeof selected.cwd==='string'&&selected.cwd.length<=4096&&path.isAbsolute(selected.cwd)))return {};
   cwd=selected.cwd;workspaceRevision=selected.workspaceRevision;
  }
  observation=await inspectSdk(cwd);
 }
 const message={event,source,proof,requestId:randomUUID(),workspaceRevision,...(observation?{observation:{facts:observation.facts,workspace:hash(observation.workspace??'unknown'),fingerprint:observation.fingerprint,declarationFingerprint:observation.declarationFingerprint}}:{})};
 const result=await request(message);if(result?.stale)return {};
 if(result===null)return stateless();
 const context=knownContext(result?.context);
 const output={};
 if(context)output.hookSpecificOutput={hookEventName:event,additionalContext:context};
 if(host==='claude-code'&&observation){
  if(event==='SessionStart')output.hookSpecificOutput={...output.hookSpecificOutput,hookEventName:event,watchPaths:observation.watchPaths};
  else if(['FileChanged','CwdChanged'].includes(event))output.watchPaths=observation.watchPaths;
 }
 return output;
}
async function main(){
 const host=process.argv[2];if(!['claude-code','codex'].includes(host))return;
 let input='';for await(const b of process.stdin){input+=b;if(Buffer.byteLength(input)>limit)return;}
 const event=JSON.parse(input);
 if(process.argv[3]==='--broker'){
  if(!['SessionStart','UserPromptSubmit'].includes(event.hook_event_name))return;
  const address=endpoint(event.session_id,host);if(address)serve(address,{proof:sessionProof(event.session_id,host)});return;
 }
 const result=await hook(event,host);if(Object.keys(result).length)process.stdout.write(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{process.exitCode=0;});
