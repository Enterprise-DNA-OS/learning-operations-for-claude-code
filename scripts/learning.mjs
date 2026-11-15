#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {getDb} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {reads,entities,runRead,add,change,transaction,amendRequest,requestDetails,importCognota,exportData,writeArtifact,resolve} from './lib/learning.mjs';
const args=process.argv.slice(2),pos=[],options={};let db;
const commands={...Object.fromEntries([...Object.keys(reads),'weekly-review','insights'].map(k=>[k,{n:0,flags:[]}])),'request':{n:1,flags:[]},'add':{n:1,flags:['file','actor']},'amend-request':{n:1,flags:['file','actor']},'decide-request':{n:1,flags:['status','reason','actor']},'start-project':{n:1,flags:['actor']},'complete-project':{n:1,flags:['actor']},'complete-milestone':{n:1,flags:['evidence','actor']},'pay-cost':{n:1,flags:['evidence','actor']},'log':{n:1,flags:['text','actor']},'import':{n:2,flags:['workspace','map','dry-run','actor']},'export':{n:0,flags:[]},'draft-weekly-review':{n:0,flags:[]},'draft-brief':{n:1,flags:[]}};
function display(value){
 if(Array.isArray(value)){
  if(value[0]?.question)return value.map(x=>x.question+'\n'+display(x.rows)).join('\n\n');
  const keys=Object.keys(value[0]||{});return table(value.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString():v&&typeof v==='object'?JSON.stringify(v):v]))),keys.map(k=>({key:k,label:k,width:70})));
 }
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>`${k}\n${typeof v==='object'?display(v):v??''}`).join('\n\n');
 return String(value??'');
}
try{
 for(const arg of args){if(!arg.startsWith('--')){pos.push(arg);continue;}const at=arg.indexOf('='),key=arg.slice(2,at<0?undefined:at),v=at<0?true:arg.slice(at+1);if(key in options)throw Error('Duplicate option: '+key);options[key]=v;}
 const [cmd,...rest]=pos;
 if(cmd==='help'||!cmd){console.log('learning <command> [reference] [--json]\n'+Object.keys(commands).join('\n')+'\nadd entities: '+Object.keys(entities).join(', '));process.exit(0);}
 const spec=commands[cmd];if(!spec)throw Error('Unknown command; run help');if(rest.length!==spec.n)throw Error(`${cmd} needs ${spec.n} positional argument(s)`);
 for(const [k,v]of Object.entries(options)){if(![...spec.flags,'json'].includes(k))throw Error('Unknown flag: --'+k);if(['json','dry-run'].includes(k)?v!==true:typeof v!=='string'||!v.trim())throw Error('Invalid value for --'+k);}
 db=await getDb();let result;
 if(reads[cmd]||['weekly-review','insights'].includes(cmd)){await db.exec('begin read only');try{result=await runRead(db,cmd);}finally{await db.exec('rollback');}}
 else if(cmd==='request')result=await requestDetails(db,rest[0]);
 else if(cmd==='export'){await db.exec('begin read only');try{result={file:writeArtifact('exports','learning-'+randomUUID()+'.json',JSON.stringify(await exportData(db),null,2)+'\n')};}finally{await db.exec('rollback');}}
 else if(cmd.startsWith('draft-')){
  await db.exec('begin read only');try{const data=cmd==='draft-brief'?await requestDetails(db,rest[0]):await runRead(db,'weekly-review');const body='# DRAFT: '+(cmd==='draft-brief'?'Training brief':'Weekly learning operations review')+'\n\nPrepared from current records. Operator review required. Nothing sent.\n\n'+display(data)+'\n';result={file:writeArtifact('drafts',cmd+'-'+randomUUID()+'.md',body)};}finally{await db.exec('rollback');}
 }else result=await transaction(db,options.actor||(cmd==='import'&&options['dry-run']?'import-preview':''),async()=>{
  if(cmd==='add')return add(db,rest[0],JSON.parse(readFileSync(options.file,'utf8')));
  if(cmd==='amend-request')return amendRequest(db,rest[0],JSON.parse(readFileSync(options.file,'utf8')));
  if(cmd==='log'){if(!options.text?.trim())throw Error('--text required');return add(db,'notes',{request_id:rest[0],body:options.text});}
  if(cmd==='import'){if(rest[0]!=='cognota')throw Error('Supported source: cognota');return importCognota(db,rest[1],{workspace:options.workspace,map:options.map?JSON.parse(readFileSync(options.map,'utf8')):{}});}
  return change(db,cmd,rest[0],options);
 },{dry:!!options['dry-run']});
 console.log(options.json?JSON.stringify(result,null,2):display(result));
}catch(error){console.error(error.message);process.exitCode=1;}finally{if(db)await db.close();}
