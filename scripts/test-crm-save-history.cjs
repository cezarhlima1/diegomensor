const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file, imports) {
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText, {exports, require:name=>{if (!(name in imports)) throw Error(name); return imports[name];}, process:{env:{}},console,Date,Set,crypto});
 return exports;
}
let history = [], failHistory = false, verified = false, withSnapshots = false;
const db = {query:async(sql,args)=>{
 if(withSnapshots && sql.startsWith('select to_jsonb')) return {rows:[{snapshot:{stage:'Proposta'}}]};
 if(sql.startsWith('select 1')) return {rows:[{exists:1}]};
 if(sql.includes('set journey_history=')) {
  if(failHistory) throw Error('history write failed');
  history = [...new Map([...history,...JSON.parse(args[1])].map(e=>[e.id,e])).values()];
 }
 if(sql.startsWith('select stage,product')) {verified=true; return {rows:[{stage:'Proposta',journey_history:history,contact_checkpoints:[]}]};}
 return {rows:[]};
}};
const helpers = load('lib/crm-leads.ts', {'server-only':{}});
const auth = load('lib/crm-auth.ts', {'@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'admin',email:'susanesamt@gmail.com'}}})}})}});
const route = load('app/api/crm/route.ts', {
 '@/lib/crm-auth': auth,
 '@/lib/crm-pipeline-stages': {},
 '@/lib/crm-commission-store': {purchaseCommission:async()=>0},
 '@/lib/crm-monitoring': {auditLeadChange:()=>null},
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},
 '@/lib/crm-db':{withCrmTransaction:async fn=>fn(db)},
 '@/lib/crm-leads':helpers,
 '@/lib/supabase/server':{createSupabaseServerClient:async()=>({auth:{getUser:async()=>({data:{user:{email:'susanesamt@gmail.com'}}})}})}
});
(async()=>{
 const events=[{id:'stage-1',kind:'stage',at:'2026-09-15T12:00:00Z',stage:'Proposta'},{id:'return-1',kind:'return-completed',at:'2026-09-15T13:00:00Z',scheduledFor:'2026-09-15T12:00:00Z'}];
 const request={json:async()=>({entity:'lead',record:{id:'test',stage:'Proposta',journeyHistory:events}})};
 let response=await route.PATCH(request);
 assert.equal(response.status,200);
 assert.equal(JSON.stringify(response.body.saved.journeyHistory),JSON.stringify(events));
 response=await route.PATCH(request);
 assert.equal(response.body.saved.journeyHistory.length,2);
 failHistory=true; verified=false;
 response=await route.PATCH(request);
 assert.equal(response.status,503);
 assert.equal(verified,false);
 failHistory=false; withSnapshots=true;
 response=await route.PATCH(request);
 const interaction=response.body.saved.journeyHistory.find(event=>event.kind==='interaction');
 assert.ok(interaction); assert.equal(interaction.actorId,'admin'); assert.ok(Number.isFinite(Date.parse(interaction.at)));
 console.log('PASS: PATCH persists history before confirming, retries preserve events, write failures cannot report success.');
})().catch(error=>{console.error(error);process.exitCode=1;});
