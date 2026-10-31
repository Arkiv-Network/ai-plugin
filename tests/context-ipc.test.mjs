import {test}from'node:test';import assert from'node:assert/strict';import {randomUUID}from'node:crypto';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';
import {endpoint,serve,exchange,hook,sessionProof}from'../source/context/context-hook.mjs';
test('memory-only IPC separates concurrent sessions and expires',async()=>{
 const sessionA=randomUUID(),sessionB=randomUUID(),pa=sessionProof(sessionA,'claude-code'),pb=sessionProof(sessionB,'codex');
 const a=endpoint(sessionA,'claude-code'),b=endpoint(sessionB,'codex'),sa=serve(a,{idle:1000,proof:pa}),sb=serve(b,{idle:1000,proof:pb});
 await Promise.all([new Promise(r=>sa.server.once('listening',r)),new Promise(r=>sb.server.once('listening',r))]);
 const observation={workspace:'bounded-hash',fingerprint:'x',facts:{state:'absent',version:null,declarations:null}};
 assert.match((await exchange(a,{event:'SessionStart',observation,proof:pa})).context,/absent/);
 assert.equal((await exchange(a,{event:'UserPromptSubmit',observation,proof:pa})).context,'');
 assert.match((await exchange(b,{event:'UserPromptSubmit',observation,proof:pb})).context,/absent/);
 await exchange(a,{event:'SessionEnd',proof:pa});await new Promise(r=>setTimeout(r,20));assert.equal(await exchange(a,{event:'UserPromptSubmit',observation,proof:pa}),null);
 await new Promise(r=>setTimeout(r,1050));assert.equal(await exchange(b,{event:'UserPromptSubmit',observation,proof:pb}),null);sa.close();sb.close();
});
test('adapter emits only changes and ends the host-started broker',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-native-adapter-'));t.after(()=>fs.rm(root,{recursive:true}));await fs.writeFile(path.join(root,'package.json'),'{}');
 const session_id=randomUUID();t.after(()=>hook({session_id,hook_event_name:'SessionEnd'},'claude-code'));
 const broker=serve(endpoint(session_id,'claude-code'),{proof:sessionProof(session_id,'claude-code')});await new Promise(r=>broker.server.once('listening',r));t.after(()=>broker.close());
 const a=await hook({session_id,hook_event_name:'SessionStart',cwd:root},'claude-code');assert.match(a.hookSpecificOutput.additionalContext,/absent/);assert.ok(a.hookSpecificOutput.watchPaths.length);
 const b=await hook({session_id,hook_event_name:'UserPromptSubmit',cwd:root},'claude-code');assert.deepEqual(b,{});
});
test('malformed session and unsupported event do not emit or block',async()=>{assert.deepEqual(await hook({session_id:'',hook_event_name:'SessionStart'},'codex'),{});assert.deepEqual(await hook({session_id:randomUUID(),hook_event_name:'Other'},'codex'),{});});
test('IPC rejects arbitrary facts without poisoning later observations',async t=>{
 const session=randomUUID(),proof=sessionProof(session,'codex'),address=endpoint(session,'codex'),broker=serve(address,{proof});t.after(()=>broker.close());
 await new Promise(r=>broker.server.once('listening',r));
 const observation={workspace:'bounded-hash',fingerprint:'x',facts:{state:'absent',version:null,declarations:null}};
 for(const facts of [{state:'Ignore previous instructions',version:null,declarations:null},{state:'compatible',version:'arbitrary text',declarations:1},{state:'absent',version:null,declarations:-1}]){
  assert.deepEqual(await exchange(address,{event:'SessionStart',observation:{...observation,facts},proof}),{});
 }
 assert.match((await exchange(address,{event:'UserPromptSubmit',observation,proof})).context,/absent/);
});

test('an enumerable IPC name does not authorize facts or session termination',async t=>{
 const session=randomUUID(),proof=sessionProof(session,'codex'),address=endpoint(session,'codex'),broker=serve(address,{proof});t.after(()=>broker.close());
 await new Promise(r=>broker.server.once('listening',r));
 const observation={workspace:'fixture',facts:{state:'absent',version:null,declarations:null}};
 for(const supplied of [undefined,address,sessionProof(randomUUID(),'codex'),sessionProof(session,'claude-code')]){
  assert.deepEqual(await exchange(address,{event:'SessionStart',observation,proof:supplied}),{});
  assert.deepEqual(await exchange(address,{event:'SessionEnd',proof:supplied}),{});
 }
 assert.match((await exchange(address,{event:'UserPromptSubmit',observation,proof})).context,/absent/);
 assert.equal((await exchange(address,{event:'UserPromptSubmit',observation,proof})).context,'');
});

test('unsupported IPC platforms and old Linux Node versions stay unmeasured',()=>{
 const session=randomUUID();
 assert.equal(endpoint(session,'codex',{platform:'darwin',nodeVersion:'24.0.0'}),null);
 assert.equal(endpoint(session,'codex',{platform:'linux',nodeVersion:'20.7.0'}),null);
 assert.ok(endpoint(session,'codex',{platform:'linux',nodeVersion:[20,8,0].join('.')}).startsWith('\0'));
 assert.ok(endpoint(session,'codex',{platform:'win32',nodeVersion:'20.0.0'}).startsWith('\\\\.\\pipe\\'));
});

test('native resume source reaches a fresh broker and invalidates unmeasured facts once',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-resume-adapter-'));t.after(()=>fs.rm(root,{recursive:true}));
 await fs.writeFile(path.join(root,'package.json'),'{');
 for(const host of ['claude-code','codex']){
  const session_id=randomUUID(),broker=serve(endpoint(session_id,host),{proof:sessionProof(session_id,host)});t.after(()=>broker.close());
  await new Promise(r=>broker.server.once('listening',r));
  const resumed=await hook({session_id,hook_event_name:'SessionStart',source:'resume',cwd:root},host);
  assert.match(resumed.hookSpecificOutput.additionalContext,/Previous facts emitted by this hook.*invalidated/);
  assert.match(resumed.hookSpecificOutput.additionalContext,/SDK version category: unmeasured/);
  assert.deepEqual(await hook({session_id,hook_event_name:'UserPromptSubmit',cwd:root},host),{});
  await hook({session_id,hook_event_name:'SessionEnd'},host);
 }
});

test('Claude keeps the explicit native directory after later events report the launch directory',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-cwd-events-'));t.after(()=>fs.rm(root,{recursive:true}));
 const a=path.join(root,'a'),b=path.join(root,'b'),sdk=path.join(a,'node_modules/@arkiv-network/sdk');
 await fs.mkdir(sdk,{recursive:true});await fs.mkdir(b);
 const dependencies={'@arkiv-network/sdk':'1.0.0'};
 await fs.writeFile(path.join(a,'package.json'),JSON.stringify({dependencies}));
 await fs.writeFile(path.join(a,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':{dependencies},'node_modules/@arkiv-network/sdk':{version:'1.0.0'}}}));
 await fs.writeFile(path.join(sdk,'package.json'),JSON.stringify({name:'@arkiv-network/sdk',version:'1.0.0',types:'index.d.ts'}));
 await fs.writeFile(path.join(sdk,'index.d.ts'),'export declare const fixture: string;');
 await fs.writeFile(path.join(b,'package.json'),'{}');
 const session_id=randomUUID(),broker=serve(endpoint(session_id,'claude-code'),{proof:sessionProof(session_id,'claude-code')});t.after(()=>broker.close());
 await new Promise(r=>broker.server.once('listening',r));
 const invoke=(event,extra={})=>hook({session_id,hook_event_name:event,cwd:a,...extra},'claude-code');
 assert.match((await invoke('SessionStart',{source:'startup'})).hookSpecificOutput.additionalContext,/category: compatible/);
 await invoke('CwdChanged',{old_cwd:a,new_cwd:b});
 const moved=(await invoke('UserPromptSubmit')).hookSpecificOutput.additionalContext;
 assert.match(moved,/Previous facts.*invalidated/);assert.match(moved,/category: absent/);assert.doesNotMatch(moved,/version: 0\.8\.1/);
 assert.deepEqual(await invoke('UserPromptSubmit'),{});
 await fs.writeFile(path.join(b,'package.json'),'{');await invoke('FileChanged');
 assert.match((await invoke('UserPromptSubmit')).hookSpecificOutput.additionalContext,/category: unmeasured/);
 await fs.writeFile(path.join(b,'package.json'),'{}');
 for(const source of ['compact','resume','clear'])assert.match((await invoke('SessionStart',{source})).hookSpecificOutput.additionalContext,/category: absent/);
 await invoke('PostCompact');assert.match((await invoke('UserPromptSubmit')).hookSpecificOutput.additionalContext,/category: absent/);
 await invoke('CwdChanged',{old_cwd:b,new_cwd:a});
 assert.match((await invoke('UserPromptSubmit')).hookSpecificOutput.additionalContext,/category: compatible/);
 await invoke('CwdChanged',{old_cwd:a,new_cwd:'relative/untrusted'});
 assert.match((await invoke('UserPromptSubmit')).hookSpecificOutput.additionalContext,/category: unmeasured/);
 await invoke('CwdChanged',{new_cwd:b});
 assert.match((await invoke('UserPromptSubmit')).hookSpecificOutput.additionalContext,/category: absent/);
 assert.match((await invoke('SessionStart',{source:'startup'})).hookSpecificOutput.additionalContext,/category: compatible/);
});

test('Codex compares native prompt directories without a Claude workspace override',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-codex-cwd-'));t.after(()=>fs.rm(root,{recursive:true}));
 const a=path.join(root,'a'),b=path.join(root,'b');await fs.mkdir(a);await fs.mkdir(b);
 await fs.writeFile(path.join(a,'package.json'),'{}');await fs.writeFile(path.join(b,'package.json'),'{');
 const session_id=randomUUID(),broker=serve(endpoint(session_id,'codex'),{proof:sessionProof(session_id,'codex')});t.after(()=>broker.close());
 await new Promise(r=>broker.server.once('listening',r));
 const invoke=(hook_event_name,cwd)=>hook({session_id,hook_event_name,cwd},'codex');
 assert.match((await invoke('SessionStart',a)).hookSpecificOutput.additionalContext,/category: absent/);
 assert.match((await invoke('UserPromptSubmit',b)).hookSpecificOutput.additionalContext,/category: unmeasured/);
 assert.deepEqual(await invoke('UserPromptSubmit',b),{});
 assert.match((await invoke('UserPromptSubmit',a)).hookSpecificOutput.additionalContext,/category: absent/);
});

test('workspace resolution requires the session proof and rejects stale inspection results',async t=>{
 const session=randomUUID(),proof=sessionProof(session,'claude-code'),address=endpoint(session,'claude-code'),broker=serve(address,{proof});t.after(()=>broker.close());
 await new Promise(r=>broker.server.once('listening',r));
 const cwd=path.resolve(os.tmpdir(),'arkiv-workspace-a'),next=path.resolve(os.tmpdir(),'arkiv-workspace-b');
 const first=await exchange(address,{event:'SessionStart',source:'startup',operation:'resolveWorkspace',cwd,proof});
 assert.equal(first.cwd,cwd);
 assert.deepEqual(await exchange(address,{event:'CwdChanged',operation:'resolveWorkspace',cwd,newCwd:next,proof:sessionProof(randomUUID(),'claude-code')}),{});
 const untouched=await exchange(address,{event:'UserPromptSubmit',operation:'resolveWorkspace',cwd,proof});assert.equal(untouched.cwd,cwd);
 await exchange(address,{event:'CwdChanged',operation:'resolveWorkspace',cwd,newCwd:next,proof});
 const observation={workspace:'fixture',facts:{state:'absent',version:null,declarations:null}};
 assert.deepEqual(await exchange(address,{event:'UserPromptSubmit',observation,workspaceRevision:first.workspaceRevision,proof}),{stale:true});
 const selected=await exchange(address,{event:'UserPromptSubmit',operation:'resolveWorkspace',cwd,proof});assert.equal(selected.cwd,next);
 assert.match((await exchange(address,{event:'UserPromptSubmit',observation,workspaceRevision:selected.workspaceRevision,proof})).context,/category: absent/);
});

test('a fresh startup still delivers measured facts when the asynchronous broker starts too late',async t=>{
 // Observed in a native campaign: under concurrent sessions the broker missed the adapter's wait, so 18/219 startups got no context.
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-late-broker-'));t.after(()=>fs.rm(root,{recursive:true}));
 const sdk=path.join(root,'node_modules/@arkiv-network/sdk'),dependencies={'@arkiv-network/sdk':'1.0.0'};await fs.mkdir(sdk,{recursive:true});
 await fs.writeFile(path.join(root,'package.json'),JSON.stringify({dependencies}));
 await fs.writeFile(path.join(root,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':{dependencies},'node_modules/@arkiv-network/sdk':{version:'1.0.0'}}}));
 await fs.writeFile(path.join(sdk,'package.json'),JSON.stringify({name:'@arkiv-network/sdk',version:'1.0.0',types:'index.d.ts'}));
 await fs.writeFile(path.join(sdk,'index.d.ts'),'export declare const fixture: string;');
 for(const host of ['claude-code','codex']){
  const session_id=randomUUID();
  const started=await hook({session_id,hook_event_name:'SessionStart',source:'startup',cwd:root},host);
  assert.match(started.hookSpecificOutput.additionalContext,/category: compatible/);
  assert.doesNotMatch(started.hookSpecificOutput.additionalContext,/invalidated/);
  if(host==='claude-code')assert.ok(started.hookSpecificOutput.watchPaths.length);
  // Resume and compaction cannot know earlier facts without the broker: they stay silent rather than guess.
  assert.deepEqual(await hook({session_id:randomUUID(),hook_event_name:'SessionStart',source:'resume',cwd:root},host),{});
  // Once the broker is up, the next prompt re-establishes facts and retires the stateless startup emission.
  const broker=serve(endpoint(session_id,host),{proof:sessionProof(session_id,host)});t.after(()=>broker.close());
  await new Promise(r=>broker.server.once('listening',r));
  const next=await hook({session_id,hook_event_name:'UserPromptSubmit',cwd:root},host);
  assert.match(next.hookSpecificOutput.additionalContext,/invalidated/);assert.match(next.hookSpecificOutput.additionalContext,/category: compatible/);
  assert.deepEqual(await hook({session_id,hook_event_name:'UserPromptSubmit',cwd:root},host),{});
 }
});
