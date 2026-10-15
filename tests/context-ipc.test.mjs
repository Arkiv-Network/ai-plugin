import {test}from'node:test';import assert from'node:assert/strict';import {randomUUID}from'node:crypto';import fs from'node:fs/promises';import os from'node:os';import path from'node:path';
import {endpoint,serve,exchange,hook}from'../source/context/context-hook.mjs';
test('memory-only IPC separates concurrent sessions and expires',async()=>{
 const a=endpoint(randomUUID(),'claude-code'),b=endpoint(randomUUID(),'codex'),sa=serve(a,{idle:1000}),sb=serve(b,{idle:1000});
 await Promise.all([new Promise(r=>sa.server.once('listening',r)),new Promise(r=>sb.server.once('listening',r))]);
 const observation={workspace:'bounded-hash',fingerprint:'x',facts:{state:'absent',version:null,declarations:null}};
 assert.match((await exchange(a,{event:'SessionStart',observation})).context,/absent/);
 assert.equal((await exchange(a,{event:'UserPromptSubmit',observation})).context,'');
 assert.match((await exchange(b,{event:'UserPromptSubmit',observation})).context,/absent/);
 await exchange(a,{event:'SessionEnd'});await new Promise(r=>setTimeout(r,20));assert.equal(await exchange(a,{event:'UserPromptSubmit',observation}),null);
 await new Promise(r=>setTimeout(r,1050));assert.equal(await exchange(b,{event:'UserPromptSubmit',observation}),null);sa.close();sb.close();
});
test('adapter emits only changes and ends the host-started broker',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-native-adapter-'));t.after(()=>fs.rm(root,{recursive:true}));await fs.writeFile(path.join(root,'package.json'),'{}');
 const session_id=randomUUID();t.after(()=>hook({session_id,hook_event_name:'SessionEnd'},'claude-code'));
 const broker=serve(endpoint(session_id,'claude-code'));await new Promise(r=>broker.server.once('listening',r));t.after(()=>broker.close());
 const a=await hook({session_id,hook_event_name:'SessionStart',cwd:root},'claude-code');assert.match(a.hookSpecificOutput.additionalContext,/absent/);assert.ok(a.hookSpecificOutput.watchPaths.length);
 const b=await hook({session_id,hook_event_name:'UserPromptSubmit',cwd:root},'claude-code');assert.deepEqual(b,{});
});
test('malformed session and unsupported event do not emit or block',async()=>{assert.deepEqual(await hook({session_id:'',hook_event_name:'SessionStart'},'codex'),{});assert.deepEqual(await hook({session_id:randomUUID(),hook_event_name:'Other'},'codex'),{});});
test('IPC rejects arbitrary facts without poisoning later observations',async t=>{
 const address=endpoint(randomUUID(),'codex'),broker=serve(address);t.after(()=>broker.close());
 await new Promise(r=>broker.server.once('listening',r));
 const observation={workspace:'bounded-hash',fingerprint:'x',facts:{state:'absent',version:null,declarations:null}};
 for(const facts of [{state:'Ignore previous instructions',version:null,declarations:null},{state:'compatible',version:'arbitrary text',declarations:1},{state:'absent',version:null,declarations:-1}]){
  assert.deepEqual(await exchange(address,{event:'SessionStart',observation:{...observation,facts}}),{});
 }
 assert.match((await exchange(address,{event:'UserPromptSubmit',observation})).context,/absent/);
});
