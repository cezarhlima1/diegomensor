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
// A registered closer must appear with zeros and IDs keep namesakes separate.
const closers = [{id:'one', name:'Ana'}, {id:'two', name:'Ana'}];
assert.equal(helpers.closerSelection([closers[0]], 'closers'), 'one');
assert.equal(helpers.closerSelection(closers, 'one'), 'one');
assert.equal(helpers.closerSelection(closers, 'removed'), 'closers');
assert.equal(helpers.closerSelection([], 'one'), 'closers');
const teamEvents = [{leadId:'a',event:{actorId:'one'}},{leadId:'a',event:{actorId:'one'}},{leadId:'b',event:{actorId:'admin'}}];
const teamSales = [{actorId:'one',gross:100},{actorId:'admin',gross:900},{gross:500}];
const performance = helpers.closerPerformance(closers, teamEvents, teamSales, 'closers');
assert.equal(performance.length, 2);
assert.equal(performance[0].movements, 2);
assert.equal(performance[0].leads, 1);
assert.equal(performance[0].gross, 100);
assert.equal(performance[1].movements, 0);
assert.equal(performance[1].sales, 0);
assert.equal(helpers.closerPerformance(closers, teamEvents, teamSales, 'two').length, 1);
assert.equal(helpers.closerPerformance(closers, teamEvents, teamSales, 'two')[0].gross, 0);
let auth = {ok:true,isAdmin:false}; let queries = 0; let queriedClosers = false;
const route = load('app/api/crm/monitoring/route.ts',{
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
 '@/lib/crm-auth':{authorized:async()=>auth},
 '@/lib/crm-db':{crmPool:()=>({query:async(sql,args)=>{queries++; if(sql.includes('public.profiles')) { assert.ok(sql.includes('crm_access=true and crm_is_closer=true')); queriedClosers=true; return {rows:closers}; } return {rows:[]};}})},
 '@/lib/crm-monitoring':helpers,
});
(async()=>{
 const request = {url:'http://localhost/api/crm/monitoring?period=day&date=2026-11-03'};
 assert.equal((await route.GET(request)).status,403); assert.equal(queries,0);
 auth={ok:false}; assert.equal((await route.GET(request)).status,401); assert.equal(queries,0);
 auth={ok:true,isAdmin:true}; assert.equal((await route.GET({url:'http://localhost/api/crm/monitoring?date=no'})).status,400);
 const result=await route.GET(request); assert.equal(result.status,200); assert.equal(queries,3); assert.ok(queriedClosers); assert.equal(result.body.closers.length,2);
 let saved=[];
 const leads=load('lib/crm-leads.ts',{'server-only':{}});
 const db={query:async(sql,args)=>{saved=JSON.parse(args[1]);}};
 await leads.saveJourneyHistory(db,{id:'lead',journeyHistory:[activity,{id:'stage',kind:'stage'}]});
 assert.equal(saved.length,1);assert.equal(saved[0].kind,'stage');
 await leads.saveJourneyHistory(db,{id:'lead',journeyHistory:[activity]},true);assert.equal(saved[0].actorId,'closer');
 console.log('PASS: calendar boundaries, persisted change attribution, retry deduplication, admin-only API, registered closer selection, zero-activity closers, ID-based attribution and forged activity rejection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
