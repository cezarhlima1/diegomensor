const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/crm-contact-summary.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: mod.exports, Intl, Date });
const { contactSummaryRows, contactDay, phoneEnding, contactedOn } = mod.exports;
const base = { company:'Oficina',phone:'47999991234',nextAction:'Contatar' };
const leads = [
 {...base,id:'late',name:'Atrasado',stage:'Retorno',followUpAt:'2026-09-14T12:00:00Z'},
 {...base,id:'future',name:'Futuro',stage:'Em conversação',followUpAt:'2026-10-01T12:00:00Z'},
 {...base,id:'today',name:'Hoje',stage:'Follow up',followUpAt:'2026-09-15T12:00:00Z'},
 {...base,id:'closed',name:'Fechado',stage:'Fechado',followUpAt:'2026-09-01T12:00:00Z'},
 {...base,id:'undated',name:'Sem data',stage:'Retorno'},
 {...base,id:'done',name:'Concluído',stage:'Follow-up',contactCheckpoints:['2026-09-15T13:00:00Z']},
];
assert.equal(JSON.stringify(contactSummaryRows(leads,'returns','2026-09-15').map(x=>x.id)),JSON.stringify(['late','today','future']));
assert.equal(JSON.stringify(contactSummaryRows(leads,'followups','2026-09-15').map(x=>x.id)),JSON.stringify(['today','done']));
assert.equal(phoneEnding('+351 918 511 143'),'1143');
assert.equal(phoneEnding(''),'');
assert.equal(contactDay('2026-09-16T01:00:00Z'),'2026-09-15');
assert.equal(contactedOn(leads[5],'2026-09-15'),true);
assert.equal(contactedOn(leads[5],'2026-09-16'),false);
assert.equal(contactSummaryRows([{...leads[0],followUpAt:null}],'returns','2026-09-15').length,0);
console.log('PASS: returns sorted by scheduled date; closed/undated excluded; daily follow-up history; phone suffix; Brazil date boundaries.');
