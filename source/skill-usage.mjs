import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Preparation only. Neither an environment variable nor local opt-in activates release collection.
export const COLLECTION_ACTIVATED = false;
export const SKILLS = Object.freeze(['arkiv','arkiv-app-integration','arkiv-data-modeling','arkiv-encryption','arkiv-entity-expiration','arkiv-entity-lifecycle','arkiv-feedback','arkiv-first-write','arkiv-indexing','arkiv-large-files','arkiv-mcp','arkiv-query','arkiv-security-trust','arkiv-social-graph','arkiv-troubleshooting','arkiv-write-safety']);
export const CHANNELS = Object.freeze(['agent_invocation','user_expansion']);
export const MAX_COUNT = 1000;
const versions=['0.2.1'];
const keys=(o,names)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===names.slice().sort().join('|');
export function observation(input){
 let channel,name;
 if(input?.hook_event_name==='PreToolUse'&&input.tool_name==='Skill'){channel='agent_invocation';name=input.tool_input?.skill;}
 if(input?.hook_event_name==='UserPromptExpansion'&&input.expansion_type==='slash_command'&&input.command_source==='plugin'){channel='user_expansion';name=input.command_name;}
 // Namespaced plugin identity is required; a standalone or foreign skill is not this distribution.
 if(typeof name!=='string'||!name.startsWith('arkiv:'))return null;
 const skill=name.slice(6);return SKILLS.includes(skill)?{skill,channel}:null;
}
export function validateAggregate(input){
 if(!keys(input,['host','plugin_version','counts'])||input.host!=='claude-code'||!versions.includes(input.plugin_version)||!Array.isArray(input.counts)||input.counts.length>SKILLS.length*CHANNELS.length)return null;
 const seen=new Set(),counts=[];
 for(const row of input.counts){
  if(!keys(row,['skill','channel','count'])||!SKILLS.includes(row.skill)||!CHANNELS.includes(row.channel)||!Number.isSafeInteger(row.count)||row.count<0||row.count>MAX_COUNT)return null;
  const key=row.skill+':'+row.channel;if(seen.has(key))return null;seen.add(key);counts.push({skill:row.skill,channel:row.channel,count:row.count});
 }
 return {host:'claude-code',plugin_version:input.plugin_version,counts:counts.sort((a,b)=>(a.skill+a.channel).localeCompare(b.skill+b.channel))};
}
export async function record(input,{dataDir=process.env.CLAUDE_PLUGIN_DATA,version='0.2.1',activated=COLLECTION_ACTIVATED}={}){
 if(!activated||!path.isAbsolute(dataDir??'')||!versions.includes(version))return false;
 const observed=observation(input);if(!observed)return false;
 const file=path.join(dataDir,'skill-usage.json'),lock=path.join(dataDir,'skill-usage.lock');let ownsLock=false;
 try{
  // Opt-in is an explicit local setting. No directory or counter is created when it is absent.
  const optInFile=path.join(dataDir,'skill-usage-opt-in.json'),optInStat=await fs.lstat(optInFile);
  if(!optInStat.isFile()||optInStat.isSymbolicLink()||optInStat.size>64)return false;
  const optIn=JSON.parse(await fs.readFile(optInFile,'utf8'));
  if(!keys(optIn,['enabled'])||optIn.enabled!==true)return false;
  await fs.mkdir(lock);ownsLock=true;
  let aggregate={host:'claude-code',plugin_version:version,counts:[]};
  try{const stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)return false;aggregate=validateAggregate(JSON.parse(await fs.readFile(file,'utf8')));if(!aggregate||aggregate.plugin_version!==version)return false;}catch(e){if(e.code!=='ENOENT')throw e;}
  const row=aggregate.counts.find(r=>r.skill===observed.skill&&r.channel===observed.channel);
  if(row)row.count=Math.min(MAX_COUNT,row.count+1);else aggregate.counts.push({...observed,count:1});
  await fs.writeFile(file,JSON.stringify(validateAggregate(aggregate))+'\n',{mode:0o600});return true;
 }catch{return false;}finally{if(ownsLock)await fs.rmdir(lock).catch(()=>{});}
}
export async function preview(dataDir=process.env.CLAUDE_PLUGIN_DATA){
 if(!path.isAbsolute(dataDir??''))return null;
 try{const file=path.join(dataDir,'skill-usage.json'),stat=await fs.lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384)return null;return validateAggregate(JSON.parse(await fs.readFile(file,'utf8')));}catch{return null;}
}
export async function review(dataDir=process.env.CLAUDE_PLUGIN_DATA){
 const aggregate=await preview(dataDir);
 return {collectionActivated:COLLECTION_ACTIVATED,aggregate,approvalRequiredForEverySend:true,
  instruction:aggregate?'Show this exact aggregate to the user. After activation, ask for approval of each send before calling share_skill_usage with sharingApproved:true. Do not retry automatically or add SDK state.':'No valid local aggregate is available. Nothing can be shared.'};
}
// Explicit local review only. Hooks never call an MCP tool or make an HTTP request.
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href&&process.argv[2]==='--preview'){
 review().then(value=>console.log(JSON.stringify(value,null,2))).catch(()=>{process.exitCode=0;});
}
