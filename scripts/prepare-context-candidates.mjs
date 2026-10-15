import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {repositoryRoot} from './build-plugin.mjs';
import {syncSkills,diskFiles} from './sync-skills.mjs';

const json=v=>JSON.stringify(v,null,2)+'\n';
export function contextHooks(host){
 const command=broker=>'if command -v node >/dev/null 2>&1; then node "$CLAUDE_PLUGIN_ROOT/scripts/context/context-hook.mjs" '+host+(broker?' --broker':'')+' 2>/dev/null; fi; exit 0';
 const windows=broker=>"if (Get-Command node -ErrorAction SilentlyContinue) { & node (Join-Path $env:CLAUDE_PLUGIN_ROOT 'scripts/context/context-hook.mjs') "+host+(broker?' --broker':'')+" 2>$null }; exit 0";
 const handler=broker=>({type:'command',command:command(broker),...(host==='codex'?{commandWindows:windows(broker)}:{}),timeout:broker?600:3,...(broker?{async:true}:{})});
 return Object.fromEntries((host==='codex'?['SessionStart','UserPromptSubmit','PostCompact','SessionEnd']:['SessionStart','UserPromptSubmit','FileChanged','CwdChanged','PostCompact','SessionEnd']).map(event=>[event,[{hooks:['SessionStart','UserPromptSubmit'].includes(event)?[handler(true),handler(false)]:[handler(false)]}]]));
}

// Unpublished evaluation packages only. Release manifests and personal profiles stay untouched.
export async function prepareCandidates(skills,revision,destination){
 if(!/^[a-f0-9]{40}$/.test(revision)||!path.isAbsolute(destination))throw Error('Full revision and absolute new destination required');
 await fs.mkdir(destination); // Refuse an existing destination rather than merge or overwrite.
 const withRoot=path.join(destination,'with-context'),withoutRoot=path.join(destination,'without-context');
 await fs.mkdir(withRoot);
 for(const name of ['plugin.config.json','plugins','source','scripts','.claude-plugin','.agents'])await fs.cp(path.join(repositoryRoot,name),path.join(withRoot,name),{recursive:true,errorOnExist:true,force:false});
 const config=JSON.parse(await fs.readFile(path.join(withRoot,'plugin.config.json'),'utf8'));config.skillsSource.commit=revision;
 await fs.writeFile(path.join(withRoot,'plugin.config.json'),json(config));await syncSkills(skills,false,withRoot);
 for(const bundle of ['arkiv','arkiv-codex']){
  const dir=path.join(withRoot,'plugins',bundle,'scripts/context');await fs.mkdir(dir,{recursive:true});
  for(const name of ['context-hook.mjs','sdk-context.mjs'])await fs.copyFile(path.join(repositoryRoot,'source/context',name),path.join(dir,name));
 }
 // Portable manifests use the OpenAI extension for host-specific hook paths.
 // Both arms declare the same path; the control has an empty hook document.
 const codexManifest=path.join(withRoot,'plugins/arkiv-codex/plugin.json');
 const manifest=JSON.parse(await fs.readFile(codexManifest,'utf8'));
 manifest.extensions['com.openai'].hooks='./hooks/hooks.json';await fs.writeFile(codexManifest,json(manifest));
 // Codex 0.162.1's loader explicitly skips AgentPlugin hook sources. Use its
 // supported compatibility format in BOTH evaluation arms. Preserve the original
 // portable manifest as a reference; public release files are never changed here.
 await fs.rename(codexManifest,path.join(withRoot,'plugins/arkiv-codex/portable-plugin.reference.json'));
 await fs.mkdir(path.join(withRoot,'plugins/arkiv-codex/.codex-plugin'),{recursive:true});
 await fs.writeFile(path.join(withRoot,'plugins/arkiv-codex/.codex-plugin/plugin.json'),json({name:manifest.name,version:manifest.version,description:manifest.description,skills:'./skills',mcpServers:'./mcp.json',hooks:'./hooks/hooks.json',interface:manifest.extensions['com.openai'].interface}));
 await fs.mkdir(path.join(withRoot,'plugins/arkiv-codex/hooks'),{recursive:true});
 await fs.writeFile(path.join(withRoot,'plugins/arkiv-codex/hooks/hooks.json'),json({hooks:{}}));
 await fs.cp(withRoot,withoutRoot,{recursive:true,errorOnExist:true,force:false});
 for(const [bundle,host]of [['arkiv','claude-code'],['arkiv-codex','codex']]){
  const file=path.join(withRoot,'plugins',bundle,'hooks/hooks.json');let existing={hooks:{}};
  try{existing=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const [event,groups]of Object.entries(contextHooks(host)))existing.hooks[event]=[...(existing.hooks[event]??[]),...groups];
  await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,json(existing));
 }
 const receipt={candidateOnly:true,published:false,revision,comparison:'context-only',withRoot,withoutRoot,files:[],differences:[]};
 for(const relative of await diskFiles(withRoot,'')){
  const withBytes=await fs.readFile(path.join(withRoot,relative));let withoutBytes;
  try{withoutBytes=await fs.readFile(path.join(withoutRoot,relative));}catch(e){if(e.code!=='ENOENT')throw e;}
  const hash=bytes=>bytes?createHash('sha256').update(bytes).digest('hex'):null;
  receipt.files.push({path:relative,with:hash(withBytes),without:hash(withoutBytes)});
  if(!withoutBytes?.equals(withBytes))receipt.differences.push(relative);
 }
 if(JSON.stringify(receipt.differences.sort())!==JSON.stringify(['plugins/arkiv-codex/hooks/hooks.json','plugins/arkiv/hooks/hooks.json']))throw Error('Incomparable candidate packages');
 await fs.writeFile(path.join(destination,'custody.json'),json(receipt));return {destination,revision,differences:receipt.differences};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 prepareCandidates(...process.argv.slice(2)).then(v=>console.log(json(v))).catch(e=>{console.error(e.message);process.exitCode=1;});
}
