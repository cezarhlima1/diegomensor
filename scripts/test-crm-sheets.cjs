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

function endpoint(rows = []) {
  const calls = [];
  const db = { query: async (sql, params) => { calls.push({ sql, params }); return { rows: sql.startsWith('select id,') ? rows : [] }; } };
  const route = load('app/api/crm/sheets-sync/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/crm-db': { withCrmTransaction: async (callback) => callback(db) },
    '@/lib/crm-sheets': mapping,
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
  assert.equal(/stage=|gross_value=|product=|notes=/.test(update.sql), false);
  assert.equal((await endpoint([{ id: 'a' }, { id: 'b' }]).send({ celular: '12974038745' })).status, 409);
});

test('timer scan retries failed rows, skips acknowledged rows and detects later additions', () => {
  const state = { CRM_SECRET: 'test-only-secret', CRM_SPREADSHEET_ID: 'sheet' };
  const rows = [['André', 'Atual', '12974038745', '', '', '', '']];
  let status = 503, requests = 0, released = 0;
  const sheet = { getLastRow: () => rows.length + 1, getSheetId: () => 0, getRange: () => ({ getDisplayValues: () => rows }) };
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...state }), setProperty: (k, v) => { state[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => { released++; } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, value) => crypto.createHash('sha256').update(value).digest(), base64Encode: value => value.toString('base64') },
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
});
