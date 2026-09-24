const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, deps = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: module.exports, module, require: name => { if (!(name in deps)) throw new Error(name); return deps[name]; }, console });
  return module.exports;
}
const logic = load('components/calculadora/calcLogic.ts');
const id = '11111111-1111-4111-8111-111111111111';
const warning = 'A origem do cliente é importante, preencha para seguir.';
function setup(pecas = [{ nome: 'Serviço', valor: 100, origem: 'Google', observacao: 'Preservar' }], member = true) {
  const writes = [];
  const admin = { from: () => {
    let write;
    const query = {
      select: () => query, eq: () => query,
      update: data => { write = data; writes.push(data); return query; },
      maybeSingle: async () => ({ data: write ? { id } : { pecas }, error: null }),
    };
    return query;
  } };
  const actions = load('components/calculadora/actions.ts', {
    './calcLogic': logic,
    '@/lib/supabase/admin': { createSupabaseAdminClient: () => admin },
    '@/lib/auth/sessao': { getSessaoComEmpresa: async () => ({ empresas: member ? [{ id: 'empresa' }] : [] }) },
    '@/components/auth/authLogic': { ERRO_GENERICO: 'Erro' },
  });
  return { actions, writes };
}

test('creation and editing reject a missing or invalid origin', async () => {
  const { actions, writes } = setup();
  for (const origem of ['', 'Inválida']) {
    const data = { origem, pecas: [{ nome: 'Serviço', valor: 100 }] };
    assert.equal((await actions.criarOrcamento('empresa', data)).error, warning);
    assert.equal((await actions.editarOrcamento('empresa', id, data)).error, warning);
  }
  assert.equal(writes.length, 0);
});

test('rejection requires a nonblank reason and a valid origin', async () => {
  const { actions, writes } = setup();
  for (const details of [undefined, { origem: 'Google', motivoRecusa: '  ' }, { origem: '', motivoRecusa: 'Preço' }]) {
    assert.equal((await actions.atualizarStatusOrcamento('empresa', id, 'Não aprovado', details)).error,
      details?.origem === '' ? warning : 'O motivo da reprovação do cliente é importante, preencha para seguir.');
  }
  assert.equal(writes.length, 0);
});

test('rejection persists reason, origin and status together, preserving notes', async () => {
  const { actions, writes } = setup();
  assert.equal((await actions.atualizarStatusOrcamento('empresa', id, 'Não aprovado', { origem: 'Instagram', motivoRecusa: '  Prazo  ' })).ok, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].status, 'Não aprovado');
  assert.equal(writes[0].pecas[0].motivoRecusa, 'Prazo');
  assert.equal(writes[0].pecas[0].origem, 'Instagram');
  assert.equal(writes[0].pecas[0].observacao, 'Preservar');
});

test('approval needs no refusal reason, and membership is enforced', async () => {
  assert.equal((await setup().actions.atualizarStatusOrcamento('empresa', id, 'Aprovado')).ok, true);
  const { actions, writes } = setup(undefined, false);
  assert.equal((await actions.atualizarStatusOrcamento('empresa', id, 'Não aprovado', { origem: 'Google', motivoRecusa: 'Preço' })).ok, false);
  assert.equal(writes.length, 0);
});
