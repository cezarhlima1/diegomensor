const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('components/crm/CRM.tsx', 'utf8');
const start = source.indexOf('  const importCampaignSales =');
const end = source.indexOf('\n  const ', start + 10);
const campaign = { id: 'campaign', product: 'Curso', month: '2026-10' };
const sale = { code: 'sale-1', name: 'Cliente', email: 'cliente@example.com', phone: '47999999999', product: 'Curso', gross: 597, net: 550, date: '2026-10-15T12:00:00Z' };
let saved;
const context = {
  leads: [], traffic: [campaign], catalogProducts: [{ name: 'Curso' }],
  purchasesForLead: lead => lead.purchases || [],
  isCampaignPurchase: purchase => purchase.origin === 'campaign',
  brazilDateKey: date => date?.slice(0, 10) || '', phoneKey: phone => phone,
  setCatalogProducts: () => {}, window: { alert: () => {} }, currency: new Intl.NumberFormat("pt-BR"),
  persistImportBatch: async (...args) => { saved = args; },
};
vm.createContext(context);
const keySource = source.slice(source.indexOf('const productKey ='), source.indexOf('\n', source.indexOf('const productKey =')));
vm.runInContext(ts.transpileModule(keySource, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
vm.runInContext(ts.transpileModule(source.slice(start, end) + '\nglobalThis.runImport = importCampaignSales;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
(async () => {
  await context.runImport(campaign, [sale, sale]);
  assert.equal(saved[0].length, 1);
  const lead = saved[0][0];
  assert.equal(lead.stage, 'Fechado');
  assert.equal(lead.closedAt, sale.date);
  assert.equal(lead.createdAt, sale.date);
  assert.equal(lead.purchases.length, 1);
  assert.equal(saved[2][0].stage, 'Fechado');
  assert.equal(saved[2][0].closedAt, sale.date);
  context.leads = saved[0];
  await context.runImport(campaign, [sale]);
  assert.equal(saved[0].length, 1);
  assert.equal(saved[0][0].purchases.length, 1);
  assert.equal(saved[0][0].stage, 'Fechado');
  const manual = { ...lead, id: 'manual', purchases: [{ id: 'manual-sale', product: 'PRECIFICACÃO  PARA OFICINAS', origin: 'pipeline', value: 200, netValue: 190, closedAt: sale.date }] };
  context.catalogProducts = [{ name: 'Precificação para oficinas', price: 197, netPrice: 186.17 }];
  context.leads = [manual];
  await context.runImport(campaign, [{ ...sale, product: 'precificacao para oficinas', gross: 150, net: 140 }]);
  const reconciled = saved[0][0].purchases;
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].id, 'manual-sale');
  assert.equal(reconciled[0].product, 'Precificação para oficinas');
  assert.equal(reconciled[0].value, 150);
  assert.equal(reconciled[0].netValue, 140);
  assert.equal(reconciled[0].origin, 'pipeline');
  assert.equal(context.catalogProducts[0].price, 197);
  context.leads = saved[0];
  await context.runImport(campaign, [{ ...sale, code: 'different-sale', product: 'PRECIFICAÇÃO PARA OFICINAS' }]);
  assert.equal(saved[0][0].purchases.length, 2, 'distinct sale codes remain separate sales');
  context.leads = [manual];
  await context.runImport(campaign, [{ ...sale, product: 'Outro curso' }]);
  assert.equal(saved[0][0].purchases.length, 2, 'different products stay separate');
  // A customer acquired earlier is filtered by the sale date in Fechado.
  const rangeStart = source.indexOf('  const inContactRange =');
  const rangeEnd = source.indexOf('\n  const visibleLeads', rangeStart);
  Object.assign(context, { stageFilter: 'Fechado', contactRange: { start: '2026-10-01', end: '2026-10-31' } });
  vm.runInContext(ts.transpileModule(source.slice(rangeStart, rangeEnd) + '\nglobalThis.inRange = inContactRange;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  assert.equal(context.inRange({ createdAt: '2026-09-01', closedAt: sale.date }), true);
  assert.equal(context.inRange({ createdAt: sale.date, closedAt: '2026-09-01' }), false);
  context.stageFilter = '';
  assert.equal(context.inRange({ createdAt: '2026-09-01', closedAt: sale.date }), false);
  console.log('PASS: campaign imports enter Fechado with the sale date, persist closure, deduplicate reimports, and filter closed leads by closing date.');
})().catch(error => { console.error(error); process.exitCode = 1; });
