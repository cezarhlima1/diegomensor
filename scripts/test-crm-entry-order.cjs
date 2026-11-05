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
const {compareLeadActivity,leadActivityTime}=moduleExport.exports;
test('untouched leads are ordered by arrival, newest first, across all stages',()=>{
 const old={id:'old',createdAt:'2026-11-01T12:00:00Z'};
 const recent={id:'recent',createdAt:'2026-11-05T12:00:00Z'};
 assert.deepEqual([old,recent].sort(compareLeadActivity).map(lead=>lead.id),['recent','old']);
});
test('the latest action promotes an older lead, including multiple moves on the same day',()=>{
 const recent={id:'recent',createdAt:'2026-11-05T12:00:00Z'};
 const moved={id:'moved',createdAt:'2026-08-01T12:00:00Z',journeyHistory:[{kind:'stage',at:'2026-11-05T13:00:00Z'}]};
 const edited={id:'edited',createdAt:'2026-09-01T12:00:00Z',journeyHistory:[{kind:'interaction',at:'2026-11-05T14:00:00Z'}]};
 assert.deepEqual([recent,moved,edited].sort(compareLeadActivity).map(lead=>lead.id),['edited','moved','recent']);
 const movedAgain={...moved,journeyHistory:[...moved.journeyHistory,{kind:'interaction',at:'2026-11-05T15:00:00Z'}]};
 assert.deepEqual([recent,movedAgain,edited].sort(compareLeadActivity).map(lead=>lead.id),['moved','edited','recent']);
 assert.equal(leadActivityTime(JSON.parse(JSON.stringify(movedAgain))), leadActivityTime(movedAgain));
});
test('contact actions count; synchronization timestamps and future schedules do not',()=>{
 const old={id:'old',createdAt:'2026-11-01T12:00:00Z',updatedAt:'2026-12-01T12:00:00Z',followUpAt:'2027-01-01T12:00:00Z',meetingScheduledFor:'2027-02-01T12:00:00Z'};
 assert.equal(leadActivityTime(old),Date.parse(old.createdAt));
 assert.equal(leadActivityTime({...old,contactCheckpoints:['2026-11-05T14:00:00Z']}),Date.parse('2026-11-05T14:00:00Z'));
 assert.equal(leadActivityTime({...old,journeyHistory:[{kind:'interaction',at:'invalid'}]}),Date.parse(old.createdAt));
 assert.equal(leadActivityTime({id:'unknown'}),0);
});
test('optimistic interaction timestamps promote the card before the server confirmation',()=>{
 const recent={id:'recent',createdAt:'2026-11-05T12:00:00Z'};
 const edited={id:'edited',createdAt:'2026-08-01T12:00:00Z',lastActivityAt:'2026-11-05T15:00:00Z'};
 assert.deepEqual([recent,edited].sort(compareLeadActivity).map(lead=>lead.id),['edited','recent']);
 const refreshed={...edited,lastActivityAt:undefined,journeyHistory:[{kind:'interaction',at:'2026-11-05T15:00:01Z'}]};
 assert.deepEqual([recent,refreshed].sort(compareLeadActivity).map(lead=>lead.id),['edited','recent']);
});
