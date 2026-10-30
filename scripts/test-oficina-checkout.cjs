const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..', 'components', 'oficina-organizada');
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const module = { exports: {} };
  cache.set(name, module.exports);
  const source = fs.readFileSync(path.join(root, `${name}.ts`), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: dep => load(dep.replace('./', '')), URL, URLSearchParams, Date });
  return module.exports;
}
const { getCheckoutUrl, extractTracking, mergeAttribution } = load('checkout');
const { getLotIndex, lots } = load('event-config');
const fixtures = [
  { source: 'instagram', medium: 'story', expected: ['PV - Storie', 'PV - Stories', 'PV - Storie'], urls: ['https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Storie', 'https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Stories', 'https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Storie'] },
  { source: 'manychat', medium: 'automacao', expected: ['PV - Manychat', 'PV - Manychat', 'PV - Manychat'], urls: ['https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Manychat', 'https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Manychat', 'https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Manychat'] },
  { source: 'meta', medium: 'paid_social', expected: ['PV - Campanha de tráfego', 'PV - Campanha de tráfego', 'PV - Campanha de tráfego'], urls: ['https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Campanha+de+tr%C3%A1fego', 'https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Campanha+de+tr%C3%A1fego', 'https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Campanha+de+tr%C3%A1fego'] },
  { source: 'whatsapp', medium: 'mensagem', expected: ['PV - WhatsApp', 'PV - Whatsapp', 'PV - Whatsapp'], urls: ['https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+WhatsApp', 'https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Whatsapp', 'https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Whatsapp'] },
];
const dates = ['2026-10-30T12:00:00-03:00', '2026-11-05T12:00:00-03:00', '2026-11-14T12:00:00-03:00'];
const offers = ['uEHm9j', 'fTygOH', '7CnUfU'];
for (const fixture of fixtures) {
  for (let i = 0; i < dates.length; i++) {
    const params = new URLSearchParams({ utm_source: fixture.source, utm_medium: fixture.medium, utm_campaign: 'oficina_organizada', utm_content: 'video+quadro 01', utm_term: 'gestão & equipe', fbclid: 'click-123', gclid: 'google-456' });
    const actual = getCheckoutUrl(Date.parse(dates[i]), extractTracking(params));
    assert.equal(actual, fixture.urls[i], `URL literal: ${fixture.source}, lote ${i + 1}`);
    const url = new URL(actual);
    assert.equal(url.origin, 'https://payfast.greenn.com.br');
    assert.equal(url.pathname, `/200537/offer/${offers[i]}`);
    assert.equal(url.searchParams.get('utm_medium'), fixture.expected[i]);
    assert.equal(url.searchParams.size, 1, 'Não acrescentar parâmetros ao link informado');
    assert.equal(getLotIndex(Date.parse(dates[i])), i + 1);
  }
}
console.log('12 URLs idênticos aos enviados pelo usuário, sem nenhum parâmetro extra: OK');
for (const [date, offer, price] of [
  ['2026-11-03T23:59:59-03:00', 'uEHm9j', 37],
  ['2026-11-04T00:00:00-03:00', 'fTygOH', 47],
  ['2026-11-12T23:59:59-03:00', 'fTygOH', 47],
  ['2026-11-13T00:00:00-03:00', '7CnUfU', 57],
]) {
  const now = Date.parse(date);
  assert.equal(new URL(getCheckoutUrl(now, {})).pathname, `/200537/offer/${offer}`);
  assert.equal(lots[getLotIndex(now)].price, price);
}
const previous = { utm_source: 'manychat', utm_medium: 'automacao', utm_campaign: 'oficina_organizada' };
assert.deepEqual({ ...mergeAttribution({}, previous) }, previous);
assert.deepEqual({ ...mergeAttribution({ fbclid: 'new-click' }, previous) }, { ...previous, fbclid: 'new-click' });
assert.deepEqual({ ...mergeAttribution({ utm_source: 'whatsapp', utm_medium: 'mensagem' }, previous) }, { utm_source: 'whatsapp', utm_medium: 'mensagem' });
assert.deepEqual({ ...mergeAttribution({ utm_medium: 'email' }, previous) }, { utm_medium: 'email' });
for (const source of ['google', '__proto__', 'constructor']) {
  const url = new URL(getCheckoutUrl(Date.parse(dates[0]), { utm_source: source, utm_medium: 'cpc' }));
  assert.equal(url.searchParams.get('utm_source'), source);
  assert.equal(url.searchParams.get('utm_medium'), 'cpc');
}
const direct = new URL(getCheckoutUrl(Date.parse(dates[0]), {}));
assert.equal(direct.search, '');
const ignored = extractTracking(new URLSearchParams('redirect=https://example.com&email=private&lot=3&utm_source=instagram'));
assert.deepEqual({ ...ignored }, { utm_source: 'instagram' });
console.log('Viradas no fuso de São Paulo, preço/oferta, retorno na sessão, nova origem, acesso direto e entradas desconhecidas: OK');
