// Explicit registry reproduction; separate from offline tests and production hooks.
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash}from'node:crypto';import {execFileSync}from'node:child_process';import assert from'node:assert/strict';
import {inspectSdk}from'../source/context/sdk-context.mjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'arkiv-context-published-')),receipts=[];
try{
 for(const version of ['0.7.0','0.8.1']){
  const metaResponse=await fetch('https://registry.npmjs.org/@arkiv-network%2fsdk/'+version,{signal:AbortSignal.timeout(20000)});assert.ok(metaResponse.ok);const meta=await metaResponse.json();
  assert.equal(new URL(meta.dist.tarball).origin,'https://registry.npmjs.org');
  const response=await fetch(meta.dist.tarball,{signal:AbortSignal.timeout(20000)});assert.ok(response.ok);const bytes=Buffer.from(await response.arrayBuffer());
  const integrity='sha512-'+createHash('sha512').update(bytes).digest('base64');assert.equal(integrity,meta.dist.integrity);
  const dir=path.join(root,version),archive=path.join(root,version+'.tgz'),dest=path.join(dir,'node_modules/@arkiv-network/sdk');await fs.mkdir(dest,{recursive:true});await fs.writeFile(archive,bytes);
  const entries=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).trim().split('\n');assert.ok(entries.every(p=>p.startsWith('package/')&&!p.split('/').includes('..')));
  execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',dest]);
  const dependencies={'@arkiv-network/sdk':version};await fs.writeFile(path.join(dir,'package.json'),JSON.stringify({dependencies}));
  await fs.writeFile(path.join(dir,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':{dependencies},'node_modules/@arkiv-network/sdk':{version}}}));
  const {facts}=await inspectSdk(dir);receipts.push({version,integrity,facts});
  assert.equal(facts.state,version==='0.7.0'?'out_of_range':'compatible');assert.ok(facts.declarations>0);
 }
 console.log(JSON.stringify({executableSdkLoaded:false,receipts},null,2));
}finally{await fs.rm(root,{recursive:true});}
