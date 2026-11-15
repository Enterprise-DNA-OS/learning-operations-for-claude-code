import {mkdtempSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {getDb} from './lib/db.mjs';import {checkDomain} from './check-domain.mjs';
const url=process.env.TEST_DATABASE_URL;if(!url)throw Error('TEST_DATABASE_URL must point to an empty disposable local PostgreSQL database');
const parsed=new URL(url);if(!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)||!/test/.test(parsed.pathname))throw Error('PostgreSQL test requires localhost and a database name containing test');
process.env.DATABASE_URL=url;const temp=mkdtempSync(path.join(os.tmpdir(),'learning-pg-'));let db;
try{db=await getDb();const tables=await db.query("select tablename from pg_tables where schemaname='public'");if(tables.length)throw Error('Test database must be empty');console.log('PASS PostgreSQL '+await checkDomain(db,temp)+' domain groups');}finally{if(db)await db.close();rmSync(temp,{recursive:true,force:true});}
