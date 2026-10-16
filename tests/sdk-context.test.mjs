import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inspectSdk,updateContext,satisfies} from '../source/context/sdk-context.mjs';
async function fixture(t,{version='0.8.1',spec='^0.8.1',lock=version,installed=true,types=true,declared=true}={}){
 const root=await fs.mkdtemp(path.join(process.env.ARKIV_TEST_TMP||os.tmpdir(),'sdk-context-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const deps=declared?{'@arkiv-network/sdk':spec}:{};const put=async(p,v)=>{await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),typeof v==='string'?v:JSON.stringify(v));};
 await put('package.json',{dependencies:deps,scripts:{postinstall:'throw new Error("must never execute")'}});
 await put('package-lock.json',{lockfileVersion:3,packages:{'':{dependencies:deps},'node_modules/@arkiv-network/sdk':{version:lock}}});
 if(installed){await put('node_modules/@arkiv-network/sdk/package.json',{name:'@arkiv-network/sdk',version,types:'./index.d.ts',main:'trap.js'});await put('node_modules/@arkiv-network/sdk/trap.js','throw Error("executed project code")');if(types)await put('node_modules/@arkiv-network/sdk/index.d.ts','export declare function createPublicClient(): void;');}
 return {root,put};
}
for(const [name,options,state]of [
 ['compatible',{},'compatible'],['old coherent SDK',{version:'0.6.8',spec:'^0.6.8'},'out_of_range'],['new coherent SDK',{version:'0.9.0',spec:'^0.9.0'},'out_of_range'],
 ['missing install',{installed:false},'not_installed'],['undeclared',{declared:false},'absent'],['lock disagrees',{lock:'0.8.2'},'mismatch'],['manifest disagrees',{spec:'0.8.2'},'mismatch'],
 ['unknown spec',{spec:'workspace:*'},null],['missing declarations',{types:false},null],['prerelease',{version:'0.8.2-beta.1'},null]])test(name,async t=>{const f=await fixture(t,options);assert.equal((await inspectSdk(f.root)).facts.state,state);});
test('corrupt manifest is unmeasured, never absent',async t=>{const f=await fixture(t);await f.put('package.json','{');assert.equal((await inspectSdk(f.root)).facts.state,null);});
test('invalid dependency maps cannot establish absence',async t=>{
 const f=await fixture(t);for(const dependencies of [null,[],42,'@arkiv-network/sdk']){
  await f.put('package.json',{dependencies});assert.equal((await inspectSdk(f.root)).facts.state,null);
 }
});
test('non-npm and multiple locks are observed but unmeasured',async t=>{const f=await fixture(t);await f.put('pnpm-lock.yaml','lockfileVersion: 9');const r=await inspectSdk(f.root);assert.equal(r.facts.state,null);assert.ok(r.watchPaths.some(p=>p.endsWith('pnpm-lock.yaml')));});
test('changed declaration bytes change fingerprint without executing source',async t=>{const f=await fixture(t);const a=await inspectSdk(f.root);await f.put('node_modules/@arkiv-network/sdk/index.d.ts','export declare function changed(): void;');const b=await inspectSdk(f.root);assert.notEqual(a.fingerprint,b.fingerprint);assert.equal(b.facts.state,'compatible');});
test('session isolation, changed-only, resume, compaction and invalidation',async t=>{
 const f=await fixture(t),o=await inspectSdk(f.root);const a=updateContext(null,o,'SessionStart'),b=updateContext(null,o,'SessionStart');assert.ok(a.context);assert.ok(b.context);
 assert.equal(updateContext(a.state,o,'UserPromptSubmit').context,'');
 assert.ok(updateContext(a.state,o,'SessionStart').context.includes('invalidated'));
 const dirty=updateContext(a.state,o,'FileChanged');assert.equal(dirty.context,'');assert.equal(updateContext(dirty.state,o,'UserPromptSubmit').context,'');
 const other={...o,workspace:o.workspace+'-other'};assert.match(updateContext(a.state,other,'UserPromptSubmit').context,/invalidated/);
 const gone={...o,facts:{state:'absent',version:null,declarations:null,reason:null}};assert.match(updateContext(a.state,gone,'UserPromptSubmit').context,/invalidated/);
 assert.equal(updateContext(b.state,o,'UserPromptSubmit').context,'');
});
test('bounded spec subset rejects unsupported syntax',()=>{assert.equal(satisfies('0.8.1','^0.8.1'),true);assert.equal(satisfies('0.9.0','^0.8.1'),false);assert.equal(satisfies('0.8.1','>=0.8.1 <0.9.0'),true);assert.equal(satisfies('0.8.1','*'),null);});
test('hoisted install and PnP cannot be misreported as not installed',async t=>{
 const f=await fixture(t);await f.put('packages/app/package.json',{dependencies:{'@arkiv-network/sdk':'^0.8.1'}});
 const r=await inspectSdk(path.join(f.root,'packages/app'));assert.notEqual(r.facts.state,'not_installed');assert.equal(r.facts.version,'0.8.1');
 const p=await fixture(t,{installed:false});await p.put('.pnp.cjs','throw Error("never execute")');assert.equal((await inspectSdk(p.root)).facts.state,null);
});
test('compaction refreshes retained facts and declaration changes invalidate previous observations',async t=>{
 const f=await fixture(t),o=await inspectSdk(f.root),a=updateContext(null,o,'SessionStart');
 const compact=updateContext(a.state,null,'PostCompact');assert.match(updateContext(compact.state,o,'UserPromptSubmit').context,/invalidated/);
 await f.put('node_modules/@arkiv-network/sdk/index.d.ts','export declare function changed(): void;');
 assert.match(updateContext(a.state,await inspectSdk(f.root),'UserPromptSubmit').context,/declaration.*changed/i);
});

test('unknown startup has no prior hook facts to invalidate; later loss invalidates only hook facts',async t=>{
 const f=await fixture(t),known=await inspectSdk(f.root);
 const unknown={...known,facts:{state:null,version:null,declarations:null,reason:'insufficient_evidence'}};
 const first=updateContext(null,unknown,'SessionStart');
 assert.doesNotMatch(first.context,/previous.*invalidated/i);
 assert.equal(first.state.facts.state,null);
 const measured=updateContext(first.state,known,'UserPromptSubmit');
 assert.match(measured.context,/compatible/);
 const lost=updateContext(measured.state,unknown,'UserPromptSubmit');
 assert.match(lost.context,/previous facts emitted by this hook.*invalidated/i);
 assert.doesNotMatch(lost.context,/Previous Arkiv SDK observations/);
 assert.equal(updateContext(lost.state,unknown,'UserPromptSubmit').context,'');
 const resumed=updateContext(lost.state,known,'SessionStart');
 assert.match(resumed.context,/previous facts emitted by this hook.*invalidated/i);
});

test('unmeasured startup and unchanged prompts do not inject an SDK topic into unrelated work',()=>{
 const unknown={workspace:'/fixture',fingerprint:'empty',declarationFingerprint:null,facts:{state:null,version:null,declarations:null,reason:'insufficient_evidence'}};
 const start=updateContext(null,unknown,'SessionStart');
 assert.equal(start.context,'');
 assert.equal(updateContext(start.state,unknown,'UserPromptSubmit').context,'');
 assert.equal(updateContext(start.state,unknown,'SessionStart').context,'');
 const measured={...unknown,facts:{state:'compatible',version:'0.8.1',declarations:2,reason:null}};
 const known=updateContext(start.state,measured,'UserPromptSubmit');
 assert.match(known.context,/compatible/);
 const lost=updateContext(known.state,unknown,'UserPromptSubmit');
 assert.match(lost.context,/invalidated/);
 assert.match(lost.context,/unmeasured/);
});

test('whole-fact invalidation republishes independently measured version after declaration loss',async t=>{
 const f=await fixture(t),before=await inspectSdk(f.root),started=updateContext(null,before,'SessionStart');
 await f.put('node_modules/@arkiv-network/sdk/index.d.ts',"export * from './missing.js';");
 const after=await inspectSdk(f.root);
 assert.equal(after.facts.state,null);assert.equal(after.facts.version,'0.8.1');
 const changed=updateContext(started.state,after,'UserPromptSubmit');
 assert.match(changed.context,/Previous facts emitted by this hook.*invalidated/);
 assert.match(changed.context,/SDK version category: unmeasured/);
 assert.ok(changed.context.includes(`Installed SDK version: ${after.facts.version}.`));
 assert.equal(updateContext(changed.state,after,'UserPromptSubmit').context,'');
});

test('lost broker context invalidates earlier hook facts on resume or prompt recovery',()=>{
 const unknown={workspace:'/fixture',fingerprint:'empty',declarationFingerprint:null,facts:{state:null,version:null,declarations:null,reason:'insufficient_evidence'}};
 for(const [event,source] of [['SessionStart','resume'],['SessionStart','compact'],['UserPromptSubmit',undefined]]){
  const recovered=updateContext(null,unknown,event,source);
  assert.match(recovered.context,/Previous facts emitted by this hook.*invalidated/);
  assert.match(recovered.context,/SDK version category: unmeasured/);
  assert.equal(updateContext(recovered.state,unknown,'UserPromptSubmit').context,'');
 }
 assert.equal(updateContext(null,unknown,'SessionStart','startup').context,'');
});
test('range-relative categories name the supported range; other categories do not',async t=>{
 for(const [options,expected]of [[{},true],[{version:'0.6.8',spec:'^0.6.8'},true],[{installed:false},false],[{declared:false},false]]){
  const f=await fixture(t,options),o=await inspectSdk(f.root),c=updateContext(null,o,'SessionStart','startup').context;
  assert.equal(/Plugin-supported SDK range: >=0\.8\.1 <0\.9\./.test(c),expected,JSON.stringify(o.facts));
 }
});
