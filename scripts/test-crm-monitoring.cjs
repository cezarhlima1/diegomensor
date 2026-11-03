const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
function load(file, imports = {}) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{if(!(name in imports))throw Error(name);return imports[name];},Date,JSON,Intl,URL,crypto:webcrypto,console});
 return exports;
}
const helpers = load('lib/crm-monitoring.ts');
const range = (period,date) => JSON.parse(JSON.stringify(helpers.monitoringRange(period,date)));
assert.deepEqual(range('week','2026-11-01'),{start:'2026-10-26',end:'2026-11-01'});
assert.deepEqual(range('month','2024-02-16'),{start:'2024-02-01',end:'2024-02-29'});
assert.deepEqual(range('month','2026-12-31'),{start:'2026-12-01',end:'2026-12-31'});
assert.equal(range('day','2026-02-30'),null);
assert.equal(range('invalid','2026-11-03'),null);
assert.equal(helpers.auditLeadChange({stage:'Novo'},{stage:'Novo'},'closer'),null);
const before = {stage:'Novo',contact_checkpoints:[],follow_up_at:null};
const after = {...before,stage:'Proposta',contact_checkpoints:['2026-11-03T12:00:00Z']};
const activity = helpers.auditLeadChange(before,after,'closer');
assert.equal(activity.actorId,'closer');
assert.equal(activity.previousStage,'Novo');
assert.equal(activity.stage,'Proposta');
assert.equal(activity.actions.length,2);
assert.equal(helpers.auditLeadChange(after,after,'closer'),null);
assert.equal(helpers.auditLeadChange(undefined,after,'closer').actions[0],'Lead cadastrado');
let auth = {ok:true,isAdmin:false}; let queries = 0;
const route = load('app/api/crm/monitoring/route.ts',{
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
 '@/lib/crm-auth':{authorized:async()=>auth},
 '@/lib/crm-db':{crmPool:()=>({query:async(sql,args)=>{queries++;return {rows:[]};}})},
 '@/lib/crm-monitoring':helpers,
});
(async()=>{
 const request = {url:'http://localhost/api/crm/monitoring?period=day&date=2026-11-03'};
 assert.equal((await route.GET(request)).status,403); assert.equal(queries,0);
 auth={ok:false}; assert.equal((await route.GET(request)).status,401); assert.equal(queries,0);
 auth={ok:true,isAdmin:true}; assert.equal((await route.GET({url:'http://localhost/api/crm/monitoring?date=no'})).status,400);
 const result=await route.GET(request); assert.equal(result.status,200); assert.equal(queries,3);
 let saved=[];
 const leads=load('lib/crm-leads.ts',{'server-only':{}});
 const db={query:async(sql,args)=>{saved=JSON.parse(args[1]);}};
 await leads.saveJourneyHistory(db,{id:'lead',journeyHistory:[activity,{id:'stage',kind:'stage'}]});
 assert.equal(saved.length,1);assert.equal(saved[0].kind,'stage');
 await leads.saveJourneyHistory(db,{id:'lead',journeyHistory:[activity]},true);assert.equal(saved[0].actorId,'closer');
 console.log('PASS: calendar boundaries, persisted change attribution, retry deduplication, admin-only API and forged activity rejection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
