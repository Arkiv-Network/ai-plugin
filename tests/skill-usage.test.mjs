import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {record,preview,review,observation,validateAggregate,MAX_COUNT,COLLECTION_ACTIVATED} from '../source/skill-usage.mjs';
const event={hook_event_name:'PreToolUse',tool_name:'Skill',tool_input:{skill:'arkiv:arkiv',args:'PRIVATE'},session_id:'PRIVATE',cwd:'PRIVATE',prompt:'PRIVATE'};
test('release gate and missing opt-in cause no writes',async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'usage-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));assert.equal(COLLECTION_ACTIVATED,false);assert.equal(await record(event,{dataDir:dir}),false);assert.equal(await record(event,{dataDir:dir,activated:true}),false);assert.deepEqual(await fs.readdir(dir),[]);});
test('opt-in stores only bounded categories and preserves distinct channels',async t=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'usage-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.writeFile(path.join(dir,'skill-usage-opt-in.json'),'{"enabled":true}');
 assert.equal(await record(event,{dataDir:dir,activated:true}),true);assert.equal(await record({...event,hook_event_name:'UserPromptExpansion',command_name:'arkiv:arkiv',command_source:'plugin',expansion_type:'slash_command'},{dataDir:dir,activated:true}),true);
 const value=await preview(dir);assert.equal(value.counts.length,2);assert.ok(!JSON.stringify(value).includes('PRIVATE'));
 const display=await review(dir);assert.deepEqual(display.aggregate,value);assert.equal(display.approvalRequiredForEverySend,true);assert.equal(display.collectionActivated,false);assert.equal(Object.hasOwn(display.aggregate,'sharingApproved'),false);
 value.counts[0].count=MAX_COUNT;await fs.writeFile(path.join(dir,'skill-usage.json'),JSON.stringify(value));await record(event,{dataDir:dir,activated:true});assert.equal((await preview(dir)).counts[0].count,MAX_COUNT);
});
test('foreign skills, Codex, prompts, arguments, SDK state and unknown fields are rejected',()=>{
 for(const name of ['arkiv','other:arkiv','arkiv:unknown'])assert.equal(observation({...event,tool_input:{skill:name}}),null);
 const value={host:'claude-code',plugin_version:'0.2.1',counts:[{skill:'arkiv',channel:'agent_invocation',count:1}]};assert.ok(validateAggregate(value));
 for(const key of ['session_id','cwd','prompt','args','project','sdk_state'])assert.equal(validateAggregate({...value,[key]:'PRIVATE'}),null);
 for(const count of [-1,1.2,MAX_COUNT+1,Infinity])assert.equal(validateAggregate({...value,counts:[{...value.counts[0],count}]}),null);
 assert.equal(validateAggregate({...value,host:'codex'}),null);assert.equal(validateAggregate({...value,counts:[...value.counts,...value.counts]}),null);
});
