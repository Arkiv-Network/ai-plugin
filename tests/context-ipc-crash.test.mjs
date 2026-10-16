import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import {endpoint,serve,exchange,sessionProof} from '../source/context/context-hook.mjs';

test('an abruptly stopped Linux broker leaves no session identifier and can restart',
 {skip:process.platform!=='linux',timeout:10000},async t=>{
  const session=randomUUID(),address=endpoint(session,'codex'),proof=sessionProof(session,'codex');
  const exists=()=>address.startsWith('\0')?Promise.resolve(false):fs.lstat(address).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
  assert.equal(await exists(),false);
  const moduleUrl=new URL('../source/context/context-hook.mjs',import.meta.url).href;
  const code=`import {endpoint,serve,sessionProof} from ${JSON.stringify(moduleUrl)};const session=process.argv[1],broker=serve(endpoint(session,'codex'),{proof:sessionProof(session,'codex')});broker.server.once('listening',()=>process.stdout.write('ready\\n'));`;
  const child=spawn(process.execPath,['--input-type=module','-e',code,session],{stdio:['ignore','pipe','pipe']});
  const exited=once(child,'exit');
  t.after(async()=>{
   if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
   await exited;
   // Only the fresh socket created by this test can need legacy cleanup.
   if(!address.startsWith('\0')&&await exists()){
    assert.ok((await fs.lstat(address)).isSocket());
    await fs.unlink(address);
   }
  });
  await Promise.race([
   once(child.stdout,'data').then(([b])=>assert.equal(b.toString(),'ready\n')),
   exited.then(()=>{throw Error('Broker exited before readiness');})
  ]);
  const observation={workspace:'fixture',facts:{state:'absent',version:null,declarations:null}};
  assert.match((await exchange(address,{event:'SessionStart',observation,proof})).context,/absent/);
  child.kill('SIGKILL');
  const [,signal]=await exited;
  assert.equal(signal,'SIGKILL');
  assert.equal(await exists(),false,'A crashed broker must not retain its session-derived IPC identifier on disk');
  const restarted=serve(address,{proof});t.after(()=>restarted.close());
  await once(restarted.server,'listening');
  assert.match((await exchange(address,{event:'UserPromptSubmit',observation,proof})).context,/absent/);
 });
