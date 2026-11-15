import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {REPO_ROOT} from './lib/db.mjs';
import {randomUUID} from 'node:crypto';
const root=path.join(REPO_ROOT,'.data','demo-'+randomUUID());
const env={...process.env,DATABASE_URL:'',DATA_DIR:path.join(root,'db'),OUTPUT_DIR:root};
for(const [script,...args] of [['migrate.mjs'],['seed.mjs'],['learning.mjs','weekly-review'],['view.mjs'],['docs.mjs']]){
 const r=spawnSync(process.execPath,[path.join(REPO_ROOT,'scripts',script),...args],{env,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
}
console.log('Fictional demo database and reports: '+root);
