import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';import {reads} from './lib/learning.mjs';import {checkDomain} from './check-domain.mjs';
const temp=mkdtempSync(path.join(os.tmpdir(),'learning-test-'));process.env.DATABASE_URL='';process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
let db;
const cli=(script,args=[],success=true)=>{const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script),...args],{cwd:REPO_ROOT,env:{...process.env},encoding:'utf8'});assert.equal(r.status,success?0:1,r.stdout+'\n'+r.stderr);return r.stdout;};
const run=(args,success=true)=>cli('learning.mjs',args,success);
const file=path.join(temp,'record.json');const record=(value)=>{writeFileSync(file,JSON.stringify(value));return '--file='+file;};
try{
 db=await getDb();let checks=await checkDomain(db,temp);await db.close();db=null;
 for(const command of [...Object.keys(reads),'weekly-review','insights']){JSON.parse(run([command,'--json']));assert.ok(run([command]).trim());}
 run(['help']);run(['request','R-101','--json']);run(['people','--no-such-flag'],false);run(['people','--json=false'],false);run(['people','extra'],false);run(['does-not-exist'],false);run(['request','R-999'],false);run(['request','R-101','--json','--json'],false);
 run(['add','people','--file=examples/new-person.json'],false);
 run(['add','people','--file=examples/new-person.json','--actor=Tester']);
 run(['log','R-101','--text=Checked the delivery evidence','--actor=Tester']);
 run(['amend-request','R-104',record({purpose:'Updated local purpose'}),'--actor=Tester']);
 run(['decide-request','R-104','--status=approved','--reason=Capacity reviewed','--actor=Tester']);
 const now=new Date().toISOString().slice(0,10);const later=new Date(Date.now()+86400000*40).toISOString().slice(0,10);
 run(['add','projects',record({code:'J-CLI',title:'CLI delivery',request_id:'R-104',owner_id:'P-4',start_on:now,due_on:later,budget_cents:100000,currency:'NZD',measure:'Checked understanding',baseline:30,target:80,measure_unit:'percent',direction:'increase',evaluation_on:later}),'--actor=Tester']);
 run(['start-project','J-CLI','--actor=Tester']);
 run(['add','milestones',record({code:'M-CLI',title:'Review delivery',project_id:'J-CLI',due_on:later}),'--actor=Tester']);
 run(['complete-project','J-CLI','--actor=Tester'],false);
 run(['add','costs',record({code:'C-CLI',title:'Room booking',project_id:'J-CLI',amount_cents:10000,evidence:'Quote'}),'--actor=Tester']);
 run(['pay-cost','C-CLI','--evidence=Receipt checked','--actor=Tester']);
 run(['add','costs',record({code:'C-LATE',title:'Final invoice',project_id:'J-CLI',amount_cents:5000,evidence:'Accepted quote'}),'--actor=Tester']);
 run(['complete-milestone','M-CLI','--evidence=Delivery reviewed','--actor=Tester']);
 run(['complete-project','J-CLI','--actor=Tester']);
 run(['pay-cost','C-LATE','--evidence=Invoice received after delivery','--actor=Tester']);
 run(['add','outcomes',record({code:'O-CLI',project_id:'J-CLI',measured_on:now,actual:75,evidence:'Observed sample'}),'--actor=Tester']);
 run(['import','cognota','examples/cognota-requests.csv','--workspace=cli','--dry-run','--json']);
 run(['import','cognota','examples/cognota-requests.csv','--workspace=cli','--map=examples/header-map.json','--actor=Tester']);
 const exported=JSON.parse(run(['export','--json']));const data=JSON.parse(readFileSync(exported.file));assert.ok(data.audit_log.some(r=>r.actor==='Tester'));assert.ok(data.source_requests.length>=3);
 for(const args of [['draft-brief','R-101'],['draft-weekly-review']]){const out=JSON.parse(run([...args,'--json']));assert.ok(readFileSync(out.file,'utf8').includes('Nothing sent'));}
 cli('view.mjs');cli('docs.mjs');assert.equal(readdirSync(path.join(temp,'views')).length,3);assert.equal(readdirSync(path.join(temp,'docs-out/investment-review')).length,4);
 const briefFiles=readdirSync(path.join(temp,'docs-out/training-brief'));const xss=readFileSync(path.join(temp,'docs-out/training-brief',briefFiles.find(x=>x.startsWith('r-xss-'))),'utf8');assert.ok(xss.includes('&lt;script&gt;'));assert.ok(!xss.includes('<script>'));assert.ok(xss.includes('&lt;img'));
 const reports=readFileSync(path.join(temp,'views/budget.html'),'utf8');assert.ok(reports.includes('Harbour Learning Studio'));assert.ok(reports.includes('Forecast by project'));
 checks+=3;console.log('PASS every CLI read in text and JSON; writes, drafts, import and export');console.log('PASS branded HTML documents escape untrusted text');console.log(`PASS ${checks} integration groups; 31 command recipes; ten business questions`);
}finally{if(db)await db.close();rmSync(temp,{recursive:true,force:true});}
