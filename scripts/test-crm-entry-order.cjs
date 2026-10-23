const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const moduleExport={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/crm-entry-order.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleExport,exports:moduleExport.exports,Date});
const {compareNewLeadEntries,newLeadEntryTime}=moduleExport.exports;
test('new leads use verified entry date descending and preserve their acquisition dates',()=>{
 const first={id:'first',createdAt:'2026-10-23T12:00:00Z',application:{entryAudit:{status:'confirmed',entryAt:'2026-10-01T12:00:00Z'}}};
 const recent={id:'recent',createdAt:'2026-06-01T12:00:00Z',application:{entryAudit:{status:'confirmed',entryAt:'2026-10-23T11:00:00Z'}}};
 assert.deepEqual([first,recent].sort(compareNewLeadEntries).map(x=>x.id),['recent','first']);
 assert.equal(recent.createdAt,'2026-06-01T12:00:00Z');
});
test('a recent synchronization time does not promote an undated spreadsheet application',()=>{
 const unknown={id:'unknown',createdAt:'2026-10-23T12:00:00Z',application:{sheetsIscas:{funnel:'Mentoria'},submittedAt:'2026-10-23T12:00:00Z'}};
 assert.equal(newLeadEntryTime(unknown),0);
 assert.equal(newLeadEntryTime({...unknown,application:{entryAudit:{status:'review',entryAt:'2026-10-23T12:00:00Z'}}}),0);
});
