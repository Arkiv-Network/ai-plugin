import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const SDK = '@arkiv-network/sdk';
const fields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const digest = value => createHash('sha256').update(value).digest('hex');
// At most six digits per part: versions are quoted into the agent's context.
const stable = value => typeof value === 'string' && /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(value);
const cmp = (a,b) => { const x=a.split('.').map(Number),y=b.split('.').map(Number); for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0; };
export function satisfies(version, spec) {
  if (!stable(version) || typeof spec !== 'string') return null;
  spec=spec.trim();
  if(stable(spec))return version===spec;
  if(/^[~^]\d+\.\d+\.\d+$/.test(spec)) {
    const low=spec.slice(1),[a,b,c]=low.split('.').map(Number);
    const high=spec[0]==='~'?`${a}.${b+1}.0`:a?`${a+1}.0.0`:b?`0.${b+1}.0`:`0.0.${c+1}`;
    return cmp(version,low)>=0&&cmp(version,high)<0;
  }
  const parts=spec.split(/\s+/); if(!parts.length||parts.some(p=>! /^(>=|<=|>|<|=)\d+\.\d+\.\d+$/.test(p)))return null;
  return parts.every(p=>{const [,op,v]=/^(>=|<=|>|<|=)(.+)$/.exec(p), n=cmp(version,v); return op==='>='?n>=0:op==='<='?n<=0:op==='>'?n>0:op==='<'?n<0:n===0;});
}

// This inspector reads data files only. It never imports the SDK or runs project code.
export async function inspectSdk(cwd) {
  const files=[], parts=[], declarations=[]; let budget=4*1024*1024;
  const read=async(file,limit=512*1024)=>{
    files.push(file); let h;
    try {h=await fs.open(file,constants.O_RDONLY|(constants.O_NONBLOCK??0));const s=await h.stat();if(!s.isFile()||s.size>limit||s.size>budget)throw Error('bounds');
      const bytes=Buffer.alloc(s.size+1);const {bytesRead}=await h.read(bytes,0,bytes.length,0);if(bytesRead!==s.size)throw Error('changed');
      budget-=bytesRead;const b=bytes.subarray(0,bytesRead);parts.push([file,digest(b)]);return b.toString('utf8');
    } catch(e){parts.push([file,e.code==='ENOENT'?'missing':'unreadable']);throw e;} finally{await h?.close().catch(()=>{});}
  };
  const result={state:null,version:null,declarations:null,reason:'insufficient_evidence'};
  let root;
  try {
    if(typeof cwd!=='string'||!path.isAbsolute(cwd))throw Error('cwd');
    root=await fs.realpath(cwd);let manifest;
    for(let depth=0;depth<20;depth++){
      try{manifest=JSON.parse(await read(path.join(root,'package.json')));break;}catch(e){if(e.code!=='ENOENT')throw e;}
      if(await fs.lstat(path.join(root,'.git')).then(()=>true,()=>false))break;
      const parent=path.dirname(root);if(parent===root)break;root=parent;
    }
    if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('manifest');
    for(const field of fields)if(Object.hasOwn(manifest,field)&&(!manifest[field]||typeof manifest[field]!=='object'||Array.isArray(manifest[field])))throw Error('dependency_map');
    const specs=fields.filter(f=>Object.hasOwn(manifest[f]??{},SDK)).map(f=>manifest[f][SDK]);
    // A workspaces root can delegate the SDK to its packages; its own manifest cannot show absence.
    if(!specs.length&&Object.hasOwn(manifest,'workspaces'))throw Error('workspaces_root');
    for(const name of ['pnpm-workspace.yaml','lerna.json'])if(!specs.length){
      try{await read(path.join(root,name));throw Error('workspaces_root');}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    if(!specs.length){result.state='absent';result.reason=null;}
    else {
      if(specs.some(s=>typeof s!=='string'||satisfies('0.8.1',s)===null))throw Error('spec');
      // Multiple lock formats are detected, never silently treated as equivalent.
      const locks=[];
      for(const name of ['npm-shrinkwrap.json','package-lock.json','pnpm-lock.yaml','yarn.lock','bun.lock','bun.lockb']){
        try{locks.push({name,text:await read(path.join(root,name),2*1024*1024)});}catch(e){if(e.code!=='ENOENT')throw e;}
      }
      let installed, sdkRoot, search=root;
      for(let depth=0;depth<32;depth++){
        // Node resolves hoisted packages through parent node_modules directories.
        // PnP requires executable resolution: leave that installation unmeasured.
        for(const name of ['.pnp.cjs','.pnp.js']){
          try{await read(path.join(search,name));throw Error('unsupported_pnp');}catch(e){if(e.code!=='ENOENT')throw e;}
        }
        sdkRoot=path.join(search,'node_modules',...SDK.split('/'));
        try{installed=JSON.parse(await read(path.join(sdkRoot,'package.json')));break;}catch(e){if(e.code!=='ENOENT')throw e;}
        const parent=path.dirname(search);
        if(parent===search){result.state='not_installed';result.reason=null;break;}
        search=parent;
      }
      if(installed){
        if(installed.name!==SDK||!stable(installed.version))throw Error('installed_identity');
        result.version=installed.version;
        const realSdk=await fs.realpath(sdkRoot), declarationTargets=new Set();
        const types=value=>{if(typeof value==='string'&&/\.d\.(?:ts|mts|cts)$/.test(value))declarationTargets.add(value);else if(value&&typeof value==='object')for(const v of Object.values(value))types(v);};
        types(installed.types);types(installed.typings);types(installed.exports);
        if(!declarationTargets.size)throw Error('declarations');
        const inspected=new Set();
        const visit=async relative=>{
          const target=await fs.realpath(path.resolve(sdkRoot,relative));
          if(!target.startsWith(realSdk+path.sep))throw Error('outside_package');
          if(inspected.has(target))return;if(inspected.size>=512)throw Error('declarations_limit');inspected.add(target);
          const body=await read(target);
          declarations.push([path.relative(realSdk,target),digest(body)]);
          for(const m of body.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)){
            let ref=m[1];if(/\.mjs$/.test(ref))ref=ref.slice(0,-4)+'.d.mts';else if(/\.cjs$/.test(ref))ref=ref.slice(0,-4)+'.d.cts';else if(/\.js$/.test(ref))ref=ref.slice(0,-3)+'.d.ts';else if(!/\.d\.(?:ts|mts|cts)$/.test(ref))ref+='.d.ts';
            await visit(path.relative(sdkRoot,path.resolve(path.dirname(target),ref)));
          }
        };
        for(const entry of declarationTargets)await visit(entry);
        result.declarations=inspected.size;
        // A lock in this folder describes only node_modules under it. An SDK resolved above it,
        // such as one hoisted into a monorepo root, stays unmeasured: that layout is not interpreted.
        if(search!==root)throw Error('installed_outside_lock_root');
        if(locks.length!==1||!['package-lock.json','npm-shrinkwrap.json'].includes(locks[0].name))throw Error('unsupported_or_missing_lock');
        const lock=JSON.parse(locks[0].text);
        if(![2,3].includes(lock.lockfileVersion))throw Error('lock_version');
        const locked=lock.packages?.['node_modules/'+SDK];
        const lockRoot=lock.packages?.[''];
        if(!lockRoot||!locked||locked.link||!stable(locked.version))throw Error('lock_identity');
        const lockSpecs=fields.filter(f=>Object.hasOwn(lockRoot[f]??{},SDK)).map(f=>lockRoot[f][SDK]);
        if(!lockSpecs.length||lockSpecs.some(s=>typeof s!=='string'||satisfies(installed.version,s)===null))throw Error('lock_spec');
        const identityMismatch=locked.version!==installed.version||specs.some(s=>!satisfies(installed.version,s))||JSON.stringify(specs)!==JSON.stringify(lockSpecs);
        result.state=identityMismatch?'mismatch':cmp(installed.version,'0.8.1')>=0&&cmp(installed.version,'0.9.0')<0?'compatible':'out_of_range';result.reason=null;
      }
    }
  } catch { result.state=null;result.reason='insufficient_evidence'; }
  return {facts:result,workspace:root??null,fingerprint:digest(JSON.stringify(parts)),declarationFingerprint:declarations.length?digest(JSON.stringify(declarations.sort())):null,watchPaths:[...new Set(files)]};
}

// State is caller-owned memory. No filesystem, installation ID or global suppression cache.
export function updateContext(previous, observation, event, source) {
  const invalidation=['FileChanged','CwdChanged','PostCompact'].includes(event);
  if(invalidation)return {state:{...previous,dirty:true,refresh:previous?.refresh||event==='PostCompact'},context:''};
  if(!['SessionStart','UserPromptSubmit'].includes(event))return {state:previous,context:''};
  const fresh=event==='SessionStart'||!previous?.facts||previous.refresh;
  const recovered=!previous?.facts&&(event==='UserPromptSubmit'||event==='SessionStart'&&['resume','compact'].includes(source));
  const moved=!!previous?.workspace&&previous.workspace!==observation.workspace;
  const declarationsChanged=!!previous?.declarationFingerprint&&previous.declarationFingerprint!==observation.declarationFingerprint;
  const changed=fresh||moved||declarationsChanged||JSON.stringify(previous.facts)!==JSON.stringify(observation.facts);
  const state={facts:observation.facts,workspace:observation.workspace,fingerprint:observation.fingerprint,declarationFingerprint:observation.declarationFingerprint,dirty:false};
  if(!changed)return {state,context:''};
  const measured=f=>f&&['state','version','declarations'].some(key=>f[key]!==null&&f[key]!==undefined);
  // No observation is not a new SDK fact. Stay silent unless earlier measured
  // facts must be invalidated; unrelated work must not acquire an SDK topic.
  // A resumed session or a prompt reaching a replacement broker can still
  // contain earlier hook facts. RAM loss cannot establish that none existed.
  if(!measured(observation.facts)&&!measured(previous?.facts)&&!recovered)return {state,context:''};
  const f=observation.facts, lines=['Arkiv SDK evidence for the local workspace:'];
  const invalidateAll=recovered||!!previous?.facts&&(fresh||moved||f.state===null||['absent','not_installed'].includes(f.state));
  if(invalidateAll)lines.push('Previous facts emitted by this hook for the local workspace are invalidated.');
  if(declarationsChanged&&!fresh)lines.push('Installed declaration contents changed; previous declaration facts emitted by this hook are invalidated.');
  for(const [k,label]of [['state','SDK version category'],['version','Installed SDK version'],['declarations','Installed declaration files inspected']]){
    // Whole-fact invalidation also retires unchanged fields. Re-establish each
    // current field independently, including any surviving measured version.
    if(fresh||moved||invalidateAll||f[k]!==previous.facts[k]||k==='declarations'&&declarationsChanged)lines.push(`${label}: ${f[k]??'unmeasured'}.`);
  }
  // Name the range that compatible/out_of_range refer to; the category alone is ambiguous.
  if(['compatible','out_of_range'].includes(f.state))lines.push('Plugin-supported SDK range: >=0.8.1 <0.9.');
  lines.push('Scope: local package inspection only. Each field is independent; unmeasured means insufficient local evidence for that field only. Other supplied evidence and skill guidance retain their own scope.');
  return {state,context:lines.join('\n')};
}
