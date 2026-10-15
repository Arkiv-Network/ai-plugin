import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
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
// OS-local IPC only: no TCP address, HTTP, DNS, remote server, or disk state.
// One short-lived process per native session; no shared suppression across sessions.
export function endpoint(session,host){
 if(typeof session!=='string'||session.length<8||session.length>256||!['claude-code','codex'].includes(host))return null;
 const id=hash(`${host}\0${session}\0${process.getuid?.()??os.userInfo().username}`).slice(0,32);
 return process.platform==='win32'?`\\\\.\\pipe\\arkiv-context-${id}`:path.join(os.tmpdir(),`arkiv-context-${id}.sock`);
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
export function serve(address,{idle=idleMs}={}){
 let state=null,timer;const sockets=new Set();
 const server=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});socket.setTimeout(1000,()=>socket.destroy());let input='';
  socket.on('data',chunk=>{
   input+=chunk;if(input.length>limit)return socket.destroy();if(!input.includes('\n'))return;
   let m;try{m=JSON.parse(input.split('\n')[0]);}catch{return socket.destroy();}input='';
   if(!events.has(m.event))return socket.end('{}\n');
   clearTimeout(timer);timer=setTimeout(close,idle);
   if(m.event==='SessionEnd'){socket.end('{}\n');setImmediate(close);return;}
   const o=m.observation;
   if(!['FileChanged','CwdChanged','PostCompact'].includes(m.event)&&!validObservation(o))return socket.end('{}\n');
   const result=updateContext(state,o,m.event);state=result.state;
   socket.end(JSON.stringify({context:result.context})+'\n');
  });
 });
 function close(){clearTimeout(timer);state=null;for(const s of sockets)s.destroy();server.close();}
 server.on('error',()=>{clearTimeout(timer);state=null;});
 const mask=process.umask(0o077);
 try{server.listen(address,()=>{timer=setTimeout(close,idle);});}finally{process.umask(mask);}
 return {server,close};
}
export async function hook(input,host){
 if(!input||!events.has(input.hook_event_name))return {};
 const event=input.hook_event_name,address=endpoint(input.session_id,host);if(!address)return {};
 let observation;
 if(['SessionStart','UserPromptSubmit','CwdChanged','FileChanged'].includes(event))observation=await inspectSdk(event==='CwdChanged'?input.new_cwd:input.cwd);
 const message={event,...(observation?{observation:{facts:observation.facts,workspace:hash(observation.workspace??'unknown'),fingerprint:observation.fingerprint,declarationFingerprint:observation.declarationFingerprint}}:{})};
 let result=await exchange(address,message,150);
 if(result===null&&['SessionStart','UserPromptSubmit'].includes(event)){
  // The host starts the broker as an asynchronous hook. Spawning a detached
  // descendant here keeps Windows PowerShell waiting and discards context on timeout.
  for(let i=0;i<5&&result===null;i++){await new Promise(r=>setTimeout(r,40));result=await exchange(address,message,100);}
 }
 const context=typeof result?.context==='string'?result.context:'';
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
  const address=endpoint(event.session_id,host);if(address)serve(address);return;
 }
 const result=await hook(event,host);if(Object.keys(result).length)process.stdout.write(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(()=>{process.exitCode=0;});
