const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports={}) {
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{if(!(name in imports))throw Error(name);return imports[name];},Date,JSON,Number,Set,Map});return exports;
}
const rules=load('lib/crm-commissions.ts');
const policy=rules.parseCommissionPolicy({mode:'progressive',mentorshipProducts:['Mentoria OAG'],period:'monthly',otherRate:7});
for(let previous=0;previous<20;previous++) assert.equal(rules.commissionForSale(policy,'Mentoria OAG',previous,2),Math.min(10,Math.max(5,previous+1)));
assert.equal(rules.commissionForSale(policy,'Treinamento OAP',100,2),7);
assert.equal(rules.commissionForSale(rules.defaultCommissionPolicy(),'Mentoria OAG',100,8),8);
assert.throws(()=>rules.parseCommissionPolicy({...policy,mentorshipProducts:[]}));
assert.throws(()=>rules.parseCommissionPolicy({...policy,period:'invalid'}));
assert.throws(()=>rules.parseCommissionPolicy({...policy,otherRate:101}));
assert.throws(()=>rules.parseCommissionPolicy({...policy,otherRate:NaN}));
let savedPolicy=policy;let previousSale=null;let queryOrder=[];let countArguments;
const db={query:async(sql,args)=>{
 queryOrder.push(sql);
 if(sql.includes('where id=$1'))return {rows:previousSale?[previousSale]:[]};
 if(sql.includes('select value from'))return {rows:savedPolicy?[{value:JSON.stringify(savedPolicy)}]:[]};
 if(sql.includes('count(*)')){countArguments=args;return {rows:[{total:args[3]==='monthly'?5:9}]};}
 return {rows:[]};
}};
const stored=new Map();
const store=load('lib/crm-commission-store.ts',{
 'server-only':{},'./crm-commissions':rules,
 './crm-db':{crmPool:()=>({query:async(sql,args)=>{if(sql.startsWith('insert')){stored.set(args[0],args[1]);return {rows:[]};}return {rows:[...stored].map(([key,value])=>({key,value}))};}})},
});
(async()=>{
 const purchase={id:'new-sale',closerUserId:'closer-1',product:'Mentoria OAG',closedAt:'2026-11-01T01:00:00Z',commissionRate:99};
 assert.equal(await store.purchaseCommission(db,purchase),6);
 assert.ok(queryOrder[0].includes('pg_advisory_xact_lock'), 'Serialize sales from the same closer before counting');
 assert.equal(countArguments[0],'closer-1');assert.equal(countArguments[1],'new-sale');assert.equal(countArguments[3],'monthly');assert.equal(countArguments[4],purchase.closedAt);
 assert.ok(queryOrder.some(sql=>sql.includes("at time zone 'America/Sao_Paulo'")));
 savedPolicy={...policy,period:'lifetime'};assert.equal(await store.purchaseCommission(db,purchase),10);
 assert.equal(await store.purchaseCommission(db,{...purchase,product:'Treinamento OAP'}),7);
 previousSale={closer_user_id:'closer-1',product:'Mentoria OAG',closed_at:new Date(purchase.closedAt),commission_rate:5};
 queryOrder=[];assert.equal(await store.purchaseCommission(db,purchase),5);
 assert.equal(queryOrder.length,2,'A repeated save preserves the original rate despite current policy and submitted rate');
 assert.equal(await store.purchaseCommission(db,{...purchase,closerUserId:undefined}),0);
 previousSale=null;savedPolicy=null;assert.equal(await store.purchaseCommission(db,{...purchase,commissionRate:8}),8);
 await store.saveCommissionPolicy('closer-1',policy);
 const policies=await store.commissionPolicies();assert.equal(policies.get('closer-1').otherRate,7);
 assert.equal(policies.get('closer-1').mentorshipProducts[0],'Mentoria OAG');
 console.log('PASS: all progressive tiers, 7% other products, monthly/lifetime scopes, per-closer locks, immutable sale rates, validation and policy round-trip.');
})().catch(error=>{console.error(error);process.exitCode=1;});
