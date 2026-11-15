import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {REPO_ROOT} from './db.mjs';
import {parseCsv,pick} from './csv.mjs';
export const entities={
 people:['code','name','role','weekly_hours','hourly_cents','currency','active'],
 requests:['code','title','business_unit','owner_id','purpose','priority','status','submitted_on','needed_on','review_on','safety_related','risk_brief','worker_input','delivery_method','decision'],
 projects:['code','title','request_id','owner_id','start_on','due_on','budget_cents','currency','measure','baseline','target','measure_unit','direction','evaluation_on'],
 allocations:['code','project_id','person_id','week_on','hours'],time_entries:['code','project_id','person_id','worked_on','hours','note'],
 costs:['code','title','project_id','amount_cents','evidence'],milestones:['code','title','project_id','due_on'],
 outcomes:['code','project_id','measured_on','actual','evidence'],notes:['code','request_id','body']
};
export const reads={
 people:'select code,name,role,weekly_hours,hourly_cents,currency,active from people order by code',
 intake:'select * from v_intake order by needed_on nulls last,code',
 'demand-review':"select * from v_intake where status in ('in_review','waitlisted') order by case priority when 'high' then 1 when 'medium' then 2 else 3 end,waiting_days desc",
 projects:'select p.code,p.title,r.code request,p.status,p.start_on,p.due_on,p.currency,p.budget_cents from projects p join requests r on r.id=p.request_id order by p.code',
 'capacity-plan':'select * from v_capacity order by week_on,code',
 allocations:'select a.code,p.code project,u.code person,a.week_on,a.hours,a.rate_cents from allocations a join projects p on p.id=a.project_id join people u on u.id=a.person_id order by week_on,a.code',
 time:'select t.code,p.code project,u.code person,t.worked_on,t.hours,t.rate_cents,t.note from time_entries t join projects p on p.id=t.project_id join people u on u.id=t.person_id order by worked_on,t.code',
 'budget-review':'select * from v_budgets order by headroom_cents,code',
 costs:'select c.code,p.code project,c.title,c.amount_cents,p.currency,c.status,c.evidence from costs c join projects p on p.id=c.project_id order by c.code',
 'delivery-due':"select m.code,p.code project,m.title,m.due_on,m.status,m.evidence from milestones m join projects p on p.id=m.project_id where p.status<>'cancelled' order by m.due_on,m.code",
 'impact-review':'select * from v_evaluations order by evaluation_on,code',
 compliance:'select * from v_compliance order by code,rule',
 attention:'select * from v_attention order by due_on nulls last,code',
 history:'select s.workspace,s.source_key,r.code request,s.raw,s.updated_at from source_requests s join requests r on r.id=s.request_id order by s.workspace,s.source_key'
};
export const questions=[
 ['Which urgent requests have waited over two weeks?',"select code,title,waiting_days from v_intake where priority='high' and waiting_days>14 and status in ('in_review','waitlisted')"],
 ['Which safety requests lack a complete brief?',"select code,title,risk_brief,worker_input,delivery_method from requests where safety_related and (trim(risk_brief)='' or trim(worker_input)='' or trim(delivery_method)='')"],
 ['Who has spare design hours next week?',"select name,role,available_hours from v_capacity where week_on=date_trunc('week',current_date)::date+7 and available_hours>0"],
 ['Which projects exceed their budget before all bills are paid?',"select code,title,currency,forecast_cents,headroom_cents,committed_external_cents from v_budgets where headroom_cents<0 and status<>'cancelled'"],
 ['Which overdue milestones belong to high-priority requests?',"select m.code,m.title,r.code request,m.due_on from milestones m join projects p on p.id=m.project_id join requests r on r.id=p.request_id where m.status='open' and m.due_on<current_date and r.priority='high' and p.status in ('planned','active')"],
 ['Which completed projects still lack their outcome evidence?',"select code,title,measure,evaluation_on from v_evaluations where status='completed' and actual is null"],
 ['Where did a measured outcome miss its target?',"select code,measure,baseline,target,actual,measure_unit from v_evaluations where result='below_target'"],
 ['Which request records need a retention decision?',"select code,title,review_on,purpose from requests where review_on is null or review_on<=current_date"],
 ['Which business units have the most undecided demand?',"select business_unit,count(*) requests,max(current_date-submitted_on) oldest_days from requests where status in ('in_review','waitlisted') group by business_unit order by requests desc,business_unit"],
 ['Where is actual labour already above the allocation estimate?',"select code,title,currency,actual_labour_cents,planned_labour_cents from v_budgets where actual_labour_cents>planned_labour_cents and status<>'cancelled'"]
];
export async function transaction(db,actor,fn,{dry=false}={}){
 if(!actor?.trim())throw Error('A nonempty --actor label is required');
 await db.exec('begin');try{await db.query("select set_config('app.actor',$1,true)",[actor]);const result=await fn();await db.exec(dry?'rollback':'commit');return result;}catch(e){await db.exec('rollback');throw e;}
}
export async function resolve(db,entity,needle){
 if(!entities[entity])throw Error('Unknown entity: '+entity);
 if(typeof needle!=='string'||!needle.trim())throw Error('A record reference is required');
 const label=entity==='people'?'name':entities[entity].includes('title')?'title':'code';
 const exact=await db.query(`select * from ${entity} where lower(code)=lower($1) or id::text=$1`,[needle]);if(exact.length===1)return exact[0];
 const rows=await db.query(`select * from ${entity} where starts_with(id::text,lower($1)) or strpos(lower(${label}),lower($1))>0 order by code`,[needle]);
 if(rows.length!==1)throw Error(rows.length?'Ambiguous reference; choose one: '+rows.map(r=>`${r.code} ${r[label]}`).join('; '):'No '+entity+' record matches '+needle);
 return rows[0];
}
const relations={request_id:'requests',owner_id:'people',person_id:'people',project_id:'projects'};
export async function add(db,entity,input){
 if(!entities[entity]||!input||typeof input!=='object'||Array.isArray(input))throw Error('Known entity and JSON object required');
 const row={...input};
 for(const k of Object.keys(row)){
  if(!entities[entity].includes(k))throw Error(`Unknown field ${entity}.${k}`);
  if(row[k]===null)continue;
  if(relations[k])row[k]=(await resolve(db,relations[k],row[k])).id;
  if(k.endsWith('_on')){if(!/^\d{4}-\d{2}-\d{2}$/.test(row[k])||new Date(row[k]+'T00:00:00Z').toISOString().slice(0,10)!==row[k])throw Error('ISO calendar date required for '+k);}
  if(k.endsWith('_cents')&&(!Number.isSafeInteger(row[k])||row[k]<0))throw Error('Nonnegative integer cents required for '+k);
  if(['hours','weekly_hours','baseline','target','actual'].includes(k)&& (typeof row[k]!=='number'||!Number.isFinite(row[k])))throw Error('Finite number required for '+k);
  if(['active','safety_related'].includes(k)&&typeof row[k]!=='boolean')throw Error('Boolean required for '+k);
 }
 row.code??=`${entity.slice(0,2).toUpperCase()}-${randomUUID().slice(0,8)}`;
 if(['allocations','time_entries'].includes(entity))row.rate_cents=0;
 const keys=Object.keys(row);return (await db.query(`insert into ${entity} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(row)))[0];
}
export async function runRead(db,command){
 if(reads[command])return db.query(reads[command]);
 if(command==='weekly-review')return {demand:await runRead(db,'demand-review'),capacity:await runRead(db,'capacity-plan'),budgets:await runRead(db,'budget-review'),attention:await runRead(db,'attention'),impact:await runRead(db,'impact-review')};
 if(command==='insights'){const out=[];for(const [question,sql]of questions)out.push({question,rows:await db.query(sql)});return out;}
 throw Error('Unknown read command');
}
export async function change(db,command,ref,options){
 const map={'decide-request':'requests','start-project':'projects','complete-project':'projects','complete-milestone':'milestones','pay-cost':'costs'};
 const row=await resolve(db,map[command],ref);
 if(command==='decide-request'){
  if(!['approved','waitlisted','declined','cancelled','completed','in_review'].includes(options.status)||!options.reason?.trim())throw Error('Known status and decision reason required');
  return (await db.query('update requests set status=$2,decision=$3 where id=$1 returning *',[row.id,options.status,options.reason]))[0];
 }
 if(command==='start-project')return(await db.query("update projects set status='active' where id=$1 and status='planned' returning *",[row.id]))[0]??fail('Project must be planned');
 if(command==='complete-project')return(await db.query("update projects set status='completed',completed_on=current_date where id=$1 and status='active' returning *",[row.id]))[0]??fail('Project must be active');
 if(!options.evidence?.trim())throw Error('Evidence required');
 if(command==='complete-milestone')return(await db.query("update milestones set status='done',evidence=$2 where id=$1 and status='open' returning *",[row.id,options.evidence]))[0]??fail('Milestone must be open');
 return(await db.query("update costs set status='paid',evidence=$2 where id=$1 and status='committed' returning *",[row.id,options.evidence]))[0]??fail('Cost must be committed');
}
function fail(message){throw Error(message);}
export async function amendRequest(db,ref,input){
 const row=await resolve(db,'requests',ref);
 const allowed=['owner_id','purpose','review_on','risk_brief','worker_input','delivery_method','priority'];
 if(!input||Array.isArray(input)||!Object.keys(input).length)throw Error('Nonempty request amendment required');
 for(const k of Object.keys(input)){if(!allowed.includes(k))throw Error('Cannot amend '+k);if(k==='owner_id')input[k]=(await resolve(db,'people',input[k])).id;}
 const keys=Object.keys(input);return(await db.query(`update requests set ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')} where id=$1 returning *`,[row.id,...Object.values(input)]))[0];
}
export async function requestDetails(db,ref){const r=await resolve(db,'requests',ref);return {request:r,projects:await db.query('select code,title,status,due_on from projects where request_id=$1 order by code',[r.id]),notes:await db.query('select body,created_at from notes where request_id=$1 order by created_at',[r.id]),source:await db.query('select workspace,source_key,raw from source_requests where request_id=$1',[r.id])};}
export async function importCognota(db,file,{workspace,map={}}){
 if(!workspace?.trim()||workspace.length>100)throw Error('--workspace requires a stable source account name');
 const text=readFileSync(file,'utf8'),rows=parseCsv(text);
 if(!rows.length)throw Error('Export has no data rows');
 if(!map||typeof map!=='object'||Array.isArray(map)||Object.keys(map).some(k=>!['id','title','business_unit','status'].includes(k))||Object.values(map).some(x=>typeof x!=='string'||!x.trim()))throw Error('Mapping must name id, title, business_unit or status columns');
 for(const header of Object.values(map))if(!Object.keys(rows[0]).some(x=>x.toLowerCase()===header.toLowerCase()))throw Error('Mapping column absent: '+header);
 const seen=new Set();
 const items=rows.map((raw,i)=>{
  const key=pick(raw,...(map.id?[map.id]:['Request ID','ID'])).trim(), title=pick(raw,...(map.title?[map.title]:['Request Name','Request Title','Name'])).trim();
  if(!key||!title)throw Error(`Row ${i+2}: stable request ID and title required. Available columns: ${Object.keys(raw).join(', ')}. Supply --map with id/title header names; never invent an ID.`);
  if(seen.has(key))throw Error('Duplicate source request ID: '+key);seen.add(key);
  return {key,title,unit:pick(raw,...(map.business_unit?[map.business_unit]:['Business Unit'])),status:pick(raw,...(map.status?[map.status]:['Status'])),raw};
 });
 const batch=(await db.query('insert into import_batches(workspace,file_hash,row_count) values($1,$2,$3) returning id',[workspace,createHash('sha256').update(text).digest('hex'),rows.length]))[0].id;
 let inserted=0,updated=0,unchanged=0;
 for(const item of items){
  const old=(await db.query('select * from source_requests where workspace=$1 and source_key=$2',[workspace,item.key]))[0];
  if(old){
   const same=(await db.query('select raw=$1::jsonb same from source_requests where id=$2',[JSON.stringify(item.raw),old.id]))[0].same;
   if(same){unchanged++;continue;}
   await db.query('update source_requests set raw=$1,batch_id=$2 where id=$3',[JSON.stringify(item.raw),batch,old.id]);updated++;continue;
  }
  const code='CG-'+createHash('sha256').update(JSON.stringify([workspace,item.key])).digest('hex').slice(0,16);
  const r=(await db.query('insert into requests(code,title,business_unit,source_status) values($1,$2,$3,$4) returning id',[code,item.title,item.unit,item.status]))[0];
  await db.query('insert into source_requests(workspace,source_key,request_id,raw,batch_id) values($1,$2,$3,$4,$5)',[workspace,item.key,r.id,JSON.stringify(item.raw),batch]);inserted++;
 }
 return {rows:rows.length,inserted,updated,unchanged,note:'Source history retained. Local requests need triage; source updates never overwrite local decisions.'};
}
export async function exportData(db){const out={format:'learning-operations-v1'};for(const t of [...Object.keys(entities),'source_requests','import_batches','audit_log'])out[t]=await db.query(`select * from ${t} order by id`);return out;}
export function writeArtifact(folder,name,text){const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,folder);mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,name);writeFileSync(file,text,{flag:'wx',mode:0o600});return file;}
