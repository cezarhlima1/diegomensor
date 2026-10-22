const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: (name) => dependencies[name] || require(name), console, Buffer, crypto, ...globals });
  return module.exports;
}
const questions = load('components/formulario-mentoria/questions.ts');
const mapping = load('lib/crm-sheets.ts', { '../components/formulario-mentoria/questions': questions });

test('maps sheet values into existing question fields; missing answers stay absent', () => {
  const contact = mapping.sheetContact({ username: 'bittencourt.andreluiz', oficina: 'Atual Diagnóstico e Treinamentos', celular: '+55 (12) 97403-8745', pessoas: 3, faturamento: '30 mil', problema: 'Organizar a oficina', funil: 'Calculadora' });
  assert.equal(contact.phone, '12974038745');
  const application = mapping.sheetApplication(contact);
  assert.equal(application.answers.length, 5);
  assert.equal(application.answers.find(a => a.numero === 7).resposta, '3');
  assert.equal(application.answers.find(a => a.numero === 8).resposta, '30 mil');
  assert.equal(application.answers.find(a => a.numero === 10).resposta, 'Organizar a oficina');
  assert.equal(application.answers.some(a => a.numero === 3), false);
  assert.equal(application.attribution.utmCampaign, 'Calculadora');
});

test('preserves previously completed answers and attribution on reimport', () => {
  const contact = mapping.sheetContact({ username: 'Instagram', celular: '12974038745', pessoas: '3' });
  const current = { sessionId: 'form-session', attribution: { utmSource: 'youtube' }, answers: [{ numero: 2, pergunta: questions.allQuestions[1].label, resposta: 'André Luiz' }] };
  const result = mapping.sheetApplication(contact, current);
  assert.equal(result.answers.find(a => a.numero === 2).resposta, 'André Luiz');
  assert.equal(result.attribution.utmSource, 'youtube');
  assert.equal(result.sessionId, 'form-session');
  assert.equal(mapping.sheetApplication(contact, result).answers.length, result.answers.length);
});

function endpoint(rows = [], reactivated = false) {
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: (sql.startsWith('select id,') || sql.startsWith('select *')) ? rows : sql.includes('returning id') && reactivated ? [{ id: rows[0].id }] : [] }; } };
  const incoming = load('lib/crm-incoming.ts', { './crm-db': { withCrmTransaction: async callback => callback(db) } });
  const route = load('app/api/crm/sheets-sync/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/crm-db': { withCrmTransaction: async (callback) => callback(db) },
    '@/lib/crm-sheets': mapping,
    '@/lib/crm-incoming': incoming,
  }, { process: { env: { SHEETS_TO_CRM_SECRET: 'test-only-secret' } } });
  const send = (body, secret = 'test-only-secret') => route.POST(new Request('https://example.test/api/crm/sheets-sync', { method: 'POST', headers: { authorization: 'Bearer ' + secret }, body: JSON.stringify(body) }));
  return { send, calls };
}

test('rejects unauthorized and incomplete rows before database writes', async () => {
  const { send, calls } = endpoint();
  assert.equal((await send({ celular: '12974038745' }, 'wrong')).status, 401);
  assert.equal((await send({})).status, 422);
  assert.equal(calls.length, 0);
});

test('allows missing phone when a username identifies the row', async () => {
  const { send, calls } = endpoint();
  assert.equal((await send({ username: 'andre' })).status, 200);
  const insert = calls.find(c => c.sql.startsWith('insert into public.crm_leads('));
  assert.equal(insert.params[3], '');
  assert.equal(insert.params[6], null);
});

test('creates lead with sheet contact data and answers', async () => {
  const { send, calls } = endpoint();
  const response = await send({ username: 'André', oficina: 'Atual', celular: '12974038745', pessoas: '3' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).created, true);
  const insert = calls.find(c => c.sql.startsWith('insert into public.crm_leads('));
  assert.equal(insert.params[1], 'André');
  assert.equal(insert.params[2], 'Atual');
  assert.equal(insert.params[4], 'Forms - Manychat');
});

test('matches existing phone and avoids resetting commercial fields; conflicts are rejected', async () => {
  const { send, calls } = endpoint([{ id: 'existing', application: {} }]);
  assert.equal((await (await send({ celular: '12974038745' })).json()).id, 'existing');
  assert.equal(calls.some(c => c.sql.startsWith('insert into public.crm_leads(')), false);
  const update = calls.find(c => c.sql.startsWith('update public.crm_leads'));
  assert.equal(/source=|gross_value=|product=|notes=|created_at=/.test(update.sql), false);
  assert.match(update.sql, /stage=case/);
  assert.equal((await endpoint([{ id: 'a' }, { id: 'b' }]).send({ celular: '12974038745' })).status, 409);
});

test('timer scan retries failed rows, skips acknowledged rows and detects later additions', () => {
  const state = { CRM_SECRET: 'test-only-secret', CRM_SPREADSHEET_ID: 'sheet' };
  const rows = [['André', 'Atual', '12974038745', '', '', '', '']];
  let status = 503, requests = 0, released = 0;
  const ids = [];
  const sheet = { getLastRow: () => rows.length + 1, getLastColumn: () => 8, getSheetId: () => 0,
    getRange: (row, column) => ({
      getDisplayValues: () => row === 1 ? [['username','oficina','celular','pessoas','funil','faturamento','problema','CRM_APLICACAO_ID']] : column === 8 ? rows.map((_, i) => [ids[i] || '']) : rows,
      setValue: value => { ids[row - 2] = value; },
    }),
  };
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...state }), setProperty: (k, v) => { state[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { released++; } }) },
    SpreadsheetApp: { openById: () => ({ getId: () => 'sheet', getSheetByName: () => sheet }) },
    Utilities: { getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, value) => crypto.createHash('sha256').update(value).digest(), base64Encode: value => value.toString('base64') },
    UrlFetchApp: { fetch: () => { requests++; return { getResponseCode: () => status, getContentText: () => JSON.stringify({ ok: status === 200 }) }; } },
    console: { error: () => {} },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('scripts/planilha-iscas-para-crm.gs', 'utf8'), context);
  assert.throws(() => context.sincronizarPendentes(), /1 falha/);
  assert.equal(state.CRM_ROW_0_2, undefined);
  status = 200;
  context.sincronizarPendentes();
  context.sincronizarPendentes();
  assert.equal(requests, 2);
  rows.push(['Novo', '', '11999999999', '', '', '', '']);
  context.sincronizarPendentes();
  assert.equal(requests, 3);
  assert.equal(released, 4);
  rows.reverse(); ids.reverse();
  context.sincronizarPendentes();
  assert.equal(requests, 3, 'reordering rows keeps the same application identities');
  rows[0][1] = 'Oficina atualizada';
  context.sincronizarPendentes();
  assert.equal(requests, 4, 'editing sends an update with the existing application ID');
});

test('reentry reuses the existing contact and reports reactivation without creating another lead', async () => {
  const { send, calls } = endpoint([{ id: 'archived', application: {} }], true);
  const response = await send({ celular: '12974038745' });
  const result = await response.json();
  assert.equal(result.id, 'archived');
  assert.equal(result.created, false);
  assert.equal(result.reactivated, true);
  assert.equal(calls.some(c => c.sql.startsWith('insert into public.crm_leads(')), false);
  const reentry = calls.find(c => c.sql.startsWith('update public.crm_leads'));
  assert.equal(reentry.params[0], 'archived');
});

test('reactivation is conditional and retains notes, purchases and journey history', async () => {
  const { reactivateDisqualifiedLead } = load('lib/crm-reentry.ts');
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: [] }; } };
  assert.equal(await reactivateDisqualifiedLead(db, 'active'), false);
  const { sql, params } = calls[0];
  assert.equal(params[0], 'active');
  assert.match(sql, /where id=\$1 and/);
  assert.match(sql, /lower\(trim\(tag\)\)='desqualificado'/);
  assert.match(sql, /Já desqualificado/);
  assert.match(sql, /stage='Novo lead'/);
  assert.equal(/notes=|journey_history=|crm_purchases/.test(sql), false);
  assert.match(sql, /meeting_scheduled_for=null/);
  assert.match(sql, /follow_up_at=null/);
});

const { mergeIncomingApplication } = load('lib/crm-incoming.ts', { './crm-db': {} });
test('second, third and fourth entries retain previous answers and complete application history', () => {
  let current = { source: 'Direct', sessionId: 'first', answers: [{numero: 1, pergunta: 'Nome', resposta: 'Maria'}, {numero: 2, pergunta: 'Cidade', resposta: 'São Paulo'}] };
  for (let i = 2; i <= 4; i++) {
    const result = mergeIncomingApplication(current, {sessionId: `session-${i}`, answers: [{numero: 1, pergunta: 'Nome', resposta: `Maria ${i}`}, {numero: 2, pergunta: 'Cidade', resposta: 'Não preenchido'}]}, 'Manychat');
    assert.equal(result.repeated, true);
    current = result.application;
    assert.equal(current.history.length, i - 1);
    assert.equal(current.answers.find(a => a.pergunta === 'Cidade').resposta, 'São Paulo');
    assert.equal(current.answers.find(a => a.pergunta === 'Nome').resposta, `Maria ${i}`);
  }
  assert.equal(current.history[0].source, 'Direct');
  assert.equal(current.history[0].answers[0].resposta, 'Maria');
  const retry = mergeIncomingApplication(current, { sessionId: 'session-4', answers: [] }, 'Manychat');
  assert.equal(retry.repeated, false);
  assert.equal(retry.application.history.length, 3);
});
test('sheet retries preserve history without reopening the same entry', () => {
  const incoming = { sheetsIscas: {name: 'Maria', funnel: 'Mentoria'}, answers: [] };
  const initial = mergeIncomingApplication({source: 'Direct'}, incoming, 'Manychat');
  assert.equal(initial.repeated, true);
  const retry = mergeIncomingApplication(initial.application, {...incoming, submittedAt: 'later'}, 'Manychat');
  assert.equal(retry.repeated, false);
  assert.equal(retry.application.history.length, 1);
});

test('reentry changes stage while preserving original acquisition, notes, dates and financial fields', async () => {
  const lead = { id: 'lead', source: 'Direct', stage: 'Fechado', application: { sessionId: 'old', answers: [] }, tags: ['Cliente'], journey_history: [{id: 'old-stage',kind:'stage',at:'2026-01-01',stage:'Fechado'}] };
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({sql,params}); return {rows: sql.startsWith('select *') ? [lead] : []}; } };
  const { updateIncomingLead } = load('lib/crm-incoming.ts', { './crm-db': { withCrmTransaction: async callback => callback(db) } });
  const result = await updateIncomingLead('lead', {sessionId:'new', submittedAt:'2026-10-21T12:00:00Z',answers:[]}, 'Manychat', {});
  assert.equal(result.repeated, true);
  const update = calls.find(c => c.sql.startsWith('update'));
  assert.equal(/\b(source|created_at|notes|gross_value|net_value|closed_at|meeting_at|conversation_at|product)\s*=/.test(update.sql), false);
  assert.equal(update.params[8], true);
  const history = JSON.parse(update.params[7]);
  assert.equal(history[0].id, 'old-stage');
  assert.equal(history[1].previousStage, 'Fechado');
  assert.equal(history[1].source, 'Manychat');
  assert.equal(JSON.parse(update.params[5]).history[0].source, 'Direct');
});

test('JSONB field ordering never turns a sheet synchronization into a second application', () => {
  const sheetsIscas = { name: 'Erika', phone: '11993864504', funnel: 'Hora', company: 'Sonic', people: '4-6' };
  const reordered = Object.fromEntries(Object.entries(sheetsIscas).reverse());
  const result = mergeIncomingApplication({source:'Forms - Manychat',sheetsIscas:reordered}, {sheetsIscas,submittedAt:'now'}, 'Forms - Manychat');
  assert.equal(result.repeated, false);
  assert.equal(result.application.history.length, 0);
});
test('editing and syncing the same row updates data; another row counts as a new entry', () => {
  const original = {syncRecordId:'sheet:Leads:42',sheetsIscas:{name:'Erika',funnel:'Hora'},answers:[]};
  const edited = {...original,sheetsIscas:{...original.sheetsIscas,people:'6'}};
  assert.equal(mergeIncomingApplication(original,edited,'Manychat').repeated,false);
  assert.equal(mergeIncomingApplication(original,{...edited,syncRecordId:'sheet:Leads:43'},'Manychat').repeated,true);
});

test('three Manychat interests are three applications; resyncing any of them never changes the latest interest', () => {
  const source = 'Forms - Manychat';
  const incoming = (id, funnel) => ({syncRecordId:id,sheetsIscas:{name:'Maria',phone:'11993864504',funnel},answers:[],submittedAt:'2026-10-22T12:00:00Z'});
  const cost = incoming('id-cost', 'Planilha de custo da hora');
  const pricing = incoming('id-pricing', 'Precificação');
  const mentoring = incoming('id-mentoring', 'Mentoria');
  let current = {...cost,source};
  for (const next of [pricing, mentoring]) {
    const result = mergeIncomingApplication(current,next,source);
    assert.equal(result.repeated,true);
    current = result.application;
  }
  assert.equal(current.history.length,2);
  for (const next of [cost, pricing, mentoring, cost, pricing]) {
    const result = mergeIncomingApplication(current,{...next,submittedAt:'2026-10-23T12:00:00Z'},source);
    assert.equal(result.repeated,false);
    current = result.application;
    assert.equal(current.sheetsIscas.funnel,'Mentoria');
    assert.equal(current.history.length,2);
    assert.equal(current.submittedAt,'2026-10-22T12:00:00Z');
  }
});
