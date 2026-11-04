const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{if(!(name in imports))throw Error(name);return imports[name];},Error,Set,Map,Date,console});return exports;}
const helpers=load('lib/crm-pipeline-stages.ts',{'server-only':{}});
const calls=[];let stages=['Novo lead','Primeiro contato','Fechado'];let occupied=true;
const db={query:async(sql,args)=>{calls.push({sql,args});if(sql.startsWith('select name'))return {rows:stages.map(name=>({name}))};if(sql.startsWith('select 1 from public.crm_leads'))return {rows:occupied?[{exists:1}]:[]};return {rows:[]};}};
(async()=>{
 await assert.rejects(()=>helpers.removePipelineStage(db,'Primeiro contato'),/stage-not-empty/);
 assert.ok(!calls.some(call=>/^(delete|update|insert)/.test(call.sql)),'An occupied stage must cause no writes');
 assert.ok(calls.some(call=>call.sql==='select 1 from public.crm_leads where stage=$1 limit 1'),'Include all contacts without UI or archive filters');
 calls.length=0;occupied=false;
 const removed=await helpers.removePipelineStage(db,'Primeiro contato');
 assert.deepEqual([...removed.stages],['Novo lead','Fechado']);
 assert.ok(calls[0].sql.includes('pg_advisory_xact_lock'));
 assert.ok(calls.findIndex(call=>call.sql.startsWith('lock table public.crm_leads'))<calls.findIndex(call=>call.sql.startsWith('select 1 from public.crm_leads')));
 assert.ok(!calls.some(call=>/update public.crm_leads|delete from public.crm_leads|crm_purchases|journey_history=|application=/.test(call.sql)),'Never move or delete any lead');
 const tombstone=calls.find(call=>call.sql.startsWith('insert into public.crm_state'));
 assert.equal(tombstone.args[0],'deleted_pipeline_stage:Primeiro contato');
 calls.length=0;await assert.rejects(()=>helpers.removePipelineStage(db,'Novo lead'),/protected-stage/);assert.equal(calls.length,0);
 stages=['Only'];await assert.rejects(()=>helpers.removePipelineStage(db,'Only'),/last-stage/);
 calls.length=0;await assert.rejects(()=>helpers.addPipelineStage(db,'Revisar entrada'),/invalid-stage/);
 stages=['Novo lead','Fechado'];await helpers.addPipelineStage(db,'Retorno');
 assert.ok(calls.find(call=>call.sql.startsWith('delete from public.crm_state')).args[0].includes('Retorno'));
 let allowed=true;
 const route=load('app/api/crm/route.ts',{
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
 '@/lib/crm-auth':{authorized:async()=>({ok:true,isAdmin:allowed,permissions:[]})},
 '@/lib/crm-db':{withCrmTransaction:async fn=>fn(db),crmPool:()=>db},
 '@/lib/crm-leads':{},'@/lib/crm-commission-store':{},'@/lib/crm-monitoring':{},'@/lib/crm-pipeline-stages':helpers,
 });
 calls.length=0;allowed=false;assert.equal((await route.DELETE({json:async()=>({entity:'stage',id:'Retorno'})})).status,403);assert.equal(calls.length,0);
 allowed=true;occupied=true;assert.equal((await route.DELETE({json:async()=>({entity:'stage',id:'Fechado',destination:'Novo lead'})})).status,409);
 assert.equal((await route.PUT({headers:{get:()=>null},json:async()=>({stages:['Novo lead','Revisar entrada','Retorno']})})).status,200);
 const writes=calls.filter(call=>call.sql.startsWith('insert into public.crm_pipeline_stages'));
 assert.ok(writes.length>0);assert.ok(writes.every(call=>call.sql.includes("deleted_pipeline_stage:")&&call.sql.includes("$1<>'Revisar entrada'")),'Stale snapshots must not recreate deleted stages');
 console.log('PASS: only empty stages can be deleted, occupied stages return 409, no contact is moved, concurrent writes are locked, recreation and stale snapshots remain safe.');
})().catch(error=>{console.error(error);process.exitCode=1;});
