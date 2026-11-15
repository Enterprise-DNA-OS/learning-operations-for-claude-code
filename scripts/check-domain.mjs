import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {add,change,transaction,resolve,runRead,importCognota,amendRequest} from './lib/learning.mjs';
import {REPO_ROOT} from './lib/db.mjs';
export async function checkDomain(db,temp){
 let checks=0;
 const ok=(name)=>{checks++;console.log('PASS '+name);};
 const tx=fn=>transaction(db,'Test operator',fn);
 const bad=async(fn,re)=>assert.rejects(()=>tx(fn),re);
 assert.equal((await migrate(db)).ran.length,1);assert.equal((await migrate(db)).ran.length,0);
 await seed(db);const auditCount=(await db.query('select count(*) n from audit_log'))[0].n;await seed(db);assert.equal((await db.query('select count(*) n from audit_log'))[0].n,auditCount);ok('migrations and seed are idempotent');
 const budgets=await runRead(db,'budget-review'),j=budgets.find(r=>r.code==='J-101');
 assert.equal(Number(j.planned_labour_cents),344000);assert.equal(Number(j.actual_labour_cents),51000);assert.equal(Number(j.forecast_cents),394000);assert.equal(Number(j.headroom_cents),-194000);ok('budget joins avoid duplication and forecast includes unpaid commitments');
 const capacity=await runRead(db,'capacity-plan');assert.equal(Number(capacity.find(r=>r.code==='P-1').available_hours),8);
 const week=capacity[0].week_on;
 await bad(()=>add(db,'allocations',{code:'A-OVER',project_id:'J-101',person_id:'P-1',week_on:week,hours:33}),/capacity/);
 await bad(()=>add(db,'allocations',{code:'A-NOMON',project_id:'J-101',person_id:'P-3',week_on:'2026-11-17',hours:1}),/outside|check constraint/);
 await bad(()=>add(db,'allocations',{code:'A-RANGE',project_id:'J-101',person_id:'P-3',week_on:'2030-01-07',hours:1}),/outside/);ok('capacity and allocation dates are enforced');
 await assert.rejects(()=>resolve(db,'people','Alex'),/P-1 Alex Morgan.*P-2 Alex Chen/);assert.equal((await resolve(db,'people','alex MORGAN')).code,'P-1');assert.equal((await resolve(db,'people','10000000-0000-0000-0000-000000000001')).code,'P-1');ok('ambiguous names fail with candidates; exact names and UUIDs resolve');
 await bad(()=>change(db,'decide-request','R-103',{status:'approved',reason:'Reviewed'}),/owner, purpose/);
 await tx(()=>amendRequest(db,'R-103',{owner_id:'P-3',purpose:'Review safe chemical handling',review_on:'2027-11-15'}));
 await bad(()=>change(db,'decide-request','R-103',{status:'approved',reason:'Reviewed'}),/Safety request/);
 await tx(()=>amendRequest(db,'R-103',{risk_brief:'Documented hazards',worker_input:'Shift representatives consulted',delivery_method:'Observed demonstration'}));
 await tx(()=>change(db,'decide-request','R-103',{status:'approved',reason:'Brief reviewed'}));
 await bad(()=>change(db,'decide-request','R-101',{status:'declined',reason:'Stop'}),/Resolve open projects/);ok('approval evidence and dependent-project gates');
 await tx(()=>add(db,'people',{code:'AUD-1',name:'Australian facilitator',role:'Facilitator',weekly_hours:20,hourly_cents:9500,currency:'AUD'}));
 await bad(()=>add(db,'allocations',{code:'A-FX',project_id:'J-101',person_id:'AUD-1',week_on:week,hours:1}),/Currency mismatch/);
 await tx(()=>db.query("update people set hourly_cents=9900 where code='P-1'"));
 assert.equal(Number((await db.query("select rate_cents from allocations where code='A-1'"))[0].rate_cents),8500);ok('mixed currencies rejected and historic rates remain unchanged');
 await bad(()=>change(db,'complete-project','J-101',{}),/milestones/);
 await bad(()=>add(db,'outcomes',{code:'O-EARLY',project_id:'J-101',measured_on:'2026-11-15',actual:3,evidence:'Observation'}),/completed project/);
 await tx(()=>change(db,'pay-cost','C-1',{evidence:'Reviewed receipt'}));
 const paid=(await runRead(db,'budget-review')).find(r=>r.code==='J-101');assert.equal(Number(paid.forecast_cents),394000);assert.equal(Number(paid.committed_external_cents),0);assert.equal(Number(paid.paid_external_cents),50000);ok('payment replaces commitment and delivery must be evidenced');
 const today=(await db.query('select current_date::text d'))[0].d;
 await bad(()=>add(db,'time_entries',{code:'T-FUTURE',project_id:'J-101',person_id:'P-1',worked_on:'2099-01-01',hours:1,note:'Future'}),/future/);
 await tx(()=>add(db,'time_entries',{code:'T-DAY',project_id:'J-101',person_id:'P-1',worked_on:today,hours:20,note:'Recorded work'}));
 await bad(()=>add(db,'time_entries',{code:'T-DAY2',project_id:'J-101',person_id:'P-1',worked_on:today,hours:5,note:'Too much'}),/Daily hours/);
 await bad(()=>db.query("update time_entries set hours=1 where code='T-DAY'"),/Append-only/);
 await bad(()=>db.query("update outcomes set actual=10 where code='O-1'"),/Append-only/);
 await bad(()=>db.query("delete from audit_log"),/Append-only/);
 await assert.rejects(()=>db.query("insert into people(code,name,role,weekly_hours,hourly_cents,currency) values('NO-ACTOR','No actor','Role',1,1,'NZD')"),/Actor label/);ok('time bounds, append-only evidence and mandatory actor');
 const before=await db.query('select id from requests');
 const demo=path.join(REPO_ROOT,'examples/cognota-requests.csv');
 const preview=await transaction(db,'Preview',()=>importCognota(db,demo,{workspace:'fixture'}),{dry:true});assert.equal(preview.inserted,2);assert.equal((await db.query('select id from requests')).length,before.length);assert.equal((await db.query('select id from import_batches')).length,0);
 await tx(()=>importCognota(db,demo,{workspace:'fixture'}));assert.equal((await tx(()=>importCognota(db,demo,{workspace:'fixture'}))).unchanged,2);
 const imported=(await db.query("select r.* from requests r join source_requests s on s.request_id=r.id where s.source_key='DEMO-901'"))[0];assert.equal(imported.status,'in_review');assert.equal(imported.source_status,'Approved');
 await tx(()=>amendRequest(db,imported.code,{purpose:'Local purpose'}));
 const changed=path.join(temp,'changed.csv');writeFileSync(changed,'Request ID,Request Name,Business Unit,Status,Custom objective\nDEMO-901,Changed upstream title,Service,Declined,New objective\n');
 assert.equal((await tx(()=>importCognota(db,changed,{workspace:'fixture'}))).updated,1);
 assert.equal((await resolve(db,'requests',imported.code)).title,'Customer welcome, first week');assert.equal((await resolve(db,'requests',imported.code)).purpose,'Local purpose');
 const raw=(await db.query("select raw from source_requests where source_key='DEMO-902'"))[0].raw;assert.equal(raw['Custom objective'],'First line\nSecond line');ok('import preview, repeat import, source revisions and local decisions');
 for(const [name,csv,re]of [
 ['duplicate','Request ID,Request Name\nX,One\nX,Two\n',/Duplicate source/],
 ['missing','Request ID,Request Name\nX,One\n,Two\n',/stable request/],
 ['malformed','Request ID,Request Name\nX,"broken\n',/unclosed/],
 ['headers','ID,ID\nX,Y\n',/unique/]]){
  const file=path.join(temp,name+'.csv');writeFileSync(file,csv);const count=(await db.query('select count(*) n from requests'))[0].n;
  await bad(()=>importCognota(db,file,{workspace:'fixture'}),re);assert.equal((await db.query('select count(*) n from requests'))[0].n,count);
 }
 const mapFile=path.join(temp,'mapped.csv');writeFileSync(mapFile,'Record key,Subject,Extra\nCUSTOM-1,Unicode kōrero,<script>alert(1)</script>\n');
 await tx(()=>importCognota(db,mapFile,{workspace:'mapped',map:{id:'Record key',title:'Subject'}}));
 await bad(()=>importCognota(db,mapFile,{workspace:'mapped',map:{id:'Absent',title:'Subject'}}),/absent/);ok('CSV failures roll back and explicit header mapping works');
 const insights=await runRead(db,'insights');assert.equal(insights.length,10);assert.ok(insights.every(x=>Array.isArray(x.rows)));
 assert.ok((await runRead(db,'attention')).some(x=>x.reason==='outcome review overdue'));
 assert.ok((await runRead(db,'compliance')).some(x=>x.rule==='RETENTION_REVIEW'));
 assert.ok((await db.query("select after_row from audit_log where entity='source_requests' and action='UPDATE'")).length);ok('ten questions, review exceptions and retained source audit');
 await tx(()=>add(db,'requests',{code:'R-XSS',title:'<script>alert(1)</script>',purpose:'Rendering test'}));
 await tx(()=>add(db,'notes',{code:'N-XSS',request_id:'R-XSS',body:'<img src=x onerror=alert(1)>'}));
 return checks;
}
