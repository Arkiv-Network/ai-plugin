import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {repositoryRoot,rulesHooks} from './build-plugin.mjs';
import {syncSkills,diskFiles} from './sync-skills.mjs';

const json=v=>JSON.stringify(v,null,2)+'\n';
// Unpublished evaluation packages only. Release manifests and personal profiles stay untouched.
export async function prepareCandidates(skills,revision,destination){
 if(!/^[a-f0-9]{40}$/.test(revision)||!path.isAbsolute(destination))throw Error('Full revision and absolute new destination required');
 await fs.mkdir(destination); // Refuse an existing destination rather than merge or overwrite.
 const withRoot=path.join(destination,'with-context'),withoutRoot=path.join(destination,'without-context');
 await fs.mkdir(withRoot);
 for(const name of ['plugin.config.json','plugins','source','scripts','.claude-plugin','.agents'])await fs.cp(path.join(repositoryRoot,name),path.join(withRoot,name),{recursive:true,errorOnExist:true,force:false});
 const config=JSON.parse(await fs.readFile(path.join(withRoot,'plugin.config.json'),'utf8'));config.skillsSource.commit=revision;
 await fs.writeFile(path.join(withRoot,'plugin.config.json'),json(config));await syncSkills(skills,false,withRoot);
 // Release packages already carry the context hooks (with arm). The control removes only those
 // hook registrations: Claude keeps its rules hook, Codex gets an empty hook document.
 await fs.cp(withRoot,withoutRoot,{recursive:true,errorOnExist:true,force:false});
 await fs.writeFile(path.join(withoutRoot,'plugins/arkiv/hooks/hooks.json'),json({hooks:rulesHooks()}));
 await fs.writeFile(path.join(withoutRoot,'plugins/arkiv-codex/hooks/hooks.json'),json({hooks:{}}));
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
