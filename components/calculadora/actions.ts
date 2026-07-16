"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessaoComEmpresa } from "@/lib/auth/sessao";
import { ERRO_GENERICO } from "@/components/auth/authLogic";
import type { ResultadoAuth } from "@/components/auth/actions";
import {
  CUSTO_FIELDS,
  DEFAULT_MARKUP_TIERS,
  MARKUP_MAX,
  MARKUP_MIN,
  MULT_DEFAULT,
  MULT_MAX,
  MULT_MIN,
  calcCustoHora,
  parseNum,
  somaCustos,
  type Orcamento,
  type PecaResumo,
  type Passo1Dados,
  type Passo2ConfigDados,
  type StatusOrcamento,
  type StatusValorHora,
  type ValorHoraSalvo,
} from "./calcLogic";

const ERRO_SEM_PERMISSAO =
  "Você não tem permissão para editar os custos desta empresa.";
const ERRO_SEM_VINCULO = "Você não tem acesso a esta empresa.";

/** Teto de caracteres por campo persistido — a máscara pt-BR nunca passa disso. */
const MAX_CHARS_CAMPO = 20;
/** Teto de caracteres do sufixo do orçamento — texto livre, mas não ilimitado. */
const MAX_CHARS_SUFIXO = 2000;
/** Teto de caracteres de nome de cliente/veículo do orçamento. */
const MAX_CHARS_NOME = 120;
/** Teto de caracteres da placa (formato Mercosul cabe em 7; sobra folga). */
const MAX_CHARS_PLACA = 10;
/** Teto de peças por orçamento — evita payload arbitrário no jsonb. */
const MAX_PECAS = 100;

const STATUS_VALIDOS: StatusOrcamento[] = [
  "Aguardando aprovação",
  "Aprovado",
  "Não aprovado",
];

const STATUS_VALOR_HORA_VALIDOS: StatusValorHora[] = [
  "ativo",
  "inativo",
  "padrao",
];

/**
 * Persiste os insumos do Passo 1 (calc_passo1) e o resultado consolidado
 * (empresas.valor_hora) da empresa indicada. Chamado com debounce pelo
 * componente Passo1 (admin).
 *
 * Segurança:
 *  - o papel é validado NO SERVIDOR contra a empresa ALVO (a mesma dos
 *    props do componente), e não contra o cookie de empresa ativa — o
 *    cookie pode ter mudado em outra aba entre o render e o save;
 *  - o payload é sanitizado (só chaves de CUSTO_FIELDS, strings curtas,
 *    multiplicador dentro da régua) antes de tocar o banco.
 *
 * Cálculo: reutiliza somaCustos/calcCustoHora/parseNum de calcLogic.ts —
 * fonte única da fórmula (DW-4.4); nenhuma aritmética própria aqui.
 *
 * Consistência: são duas escritas sequenciais (insumos, depois valor_hora).
 * Se a segunda falhar, valor_hora fica defasado até o próximo save
 * debounced (auto-corrige) e o erro retornado deixa o Passo 1 no estado
 * "erro" — a falha nunca é silenciosa.
 */
export async function salvarPasso1(
  empresaId: string,
  dados: Passo1Dados
): Promise<ResultadoAuth> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo || vinculo.papel !== "admin") {
    return { ok: false, error: ERRO_SEM_PERMISSAO };
  }

  // Sanitização de entrada externa: o banco nunca recebe payload arbitrário.
  const custos: Record<string, string> = {};
  for (const f of CUSTO_FIELDS) {
    const v = dados.custos?.[f.key];
    if (typeof v === "string" && v.trim()) {
      custos[f.key] = v.slice(0, MAX_CHARS_CAMPO);
    }
  }
  const horasMes = String(dados.horasMes ?? "").slice(0, MAX_CHARS_CAMPO);
  const mecanicos = String(dados.mecanicos ?? "").slice(0, MAX_CHARS_CAMPO);
  const multBruto = Number(dados.multiplicador);
  const multiplicador = Number.isFinite(multBruto)
    ? Math.min(MULT_MAX, Math.max(MULT_MIN, multBruto))
    : MULT_DEFAULT;

  const { custoFinal } = calcCustoHora(
    somaCustos(custos),
    parseNum(horasMes),
    parseNum(mecanicos),
    multiplicador
  );

  const admin = createSupabaseAdminClient();

  // 1ª escrita: os insumos. Falha aqui não toca em nada.
  const { error: erroInsumos } = await admin.from("calc_passo1").upsert({
    empresa_id: empresaId,
    custos,
    horas_mes: horasMes,
    mecanicos,
    multiplicador,
  });
  if (erroInsumos) {
    console.error(
      "salvarPasso1: falha ao gravar calc_passo1:",
      erroInsumos.message
    );
    return { ok: false, error: ERRO_GENERICO };
  }

  // 2ª escrita: o resultado que o funcionário lê nos Passos 2-3.
  const { error: erroValorHora } = await admin
    .from("empresas")
    .update({ valor_hora: custoFinal })
    .eq("id", empresaId);
  if (erroValorHora) {
    console.error(
      "salvarPasso1: falha ao gravar empresas.valor_hora:",
      erroValorHora.message
    );
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true };
}

/**
 * Persiste a configuração do Passo 2-3 (calc_config): markup por faixa e
 * sufixo do orçamento. Diferente de salvarPasso1, QUALQUER membro da empresa
 * (admin ou funcionário) pode salvar — os dois papéis usam e ajustam esses
 * valores na tela. Chamado com debounce pelo componente Calculadora.
 */
export async function salvarPasso2Config(
  empresaId: string,
  dados: Passo2ConfigDados
): Promise<ResultadoAuth> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo) {
    return { ok: false, error: ERRO_SEM_VINCULO };
  }

  const markupTiers = DEFAULT_MARKUP_TIERS.map((t, i) => {
    const v = Number(dados.markupTiers?.[i]);
    return Number.isFinite(v) ? Math.min(MARKUP_MAX, Math.max(MARKUP_MIN, v)) : t.markup;
  });
  const sufixoOrcamento = String(dados.sufixoOrcamento ?? "").slice(
    0,
    MAX_CHARS_SUFIXO
  );

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("calc_config").upsert({
    empresa_id: empresaId,
    markup_tiers: markupTiers,
    sufixo_orcamento: sufixoOrcamento,
  });
  if (error) {
    console.error("salvarPasso2Config: falha ao gravar calc_config:", error.message);
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true };
}

/** Sanitiza o snapshot de peças antes de gravar — nunca confia no shape recebido do client. */
function sanitizarPecas(pecas: PecaResumo[]): PecaResumo[] {
  return pecas.slice(0, MAX_PECAS).map((p) => ({
    nome: String(p?.nome ?? "").slice(0, MAX_CHARS_NOME),
    valor: Number.isFinite(Number(p?.valor)) ? Number(p.valor) : 0,
    quantidade:
      p?.quantidade != null && Number.isFinite(Number(p.quantidade))
        ? Number(p.quantidade)
        : undefined,
    maoDeObra:
      p?.maoDeObra != null && Number.isFinite(Number(p.maoDeObra))
        ? Number(p.maoDeObra)
        : undefined,
  }));
}

function paraOrcamento(row: {
  id: string;
  nome_cliente: string;
  nome_carro: string;
  placa: string;
  valor_hora: number;
  horas: number;
  mao_de_obra: number;
  pecas: unknown;
  valor_peca: number;
  total: number;
  status: string;
  created_at: string;
}): Orcamento {
  return {
    id: row.id,
    nomeCliente: row.nome_cliente,
    nomeCarro: row.nome_carro,
    placa: row.placa,
    valorHora: Number(row.valor_hora),
    horas: Number(row.horas),
    maoDeObra: Number(row.mao_de_obra),
    pecas: (row.pecas ?? []) as PecaResumo[],
    valorPeca: Number(row.valor_peca),
    total: Number(row.total),
    status: row.status as StatusOrcamento,
    data: row.created_at,
  };
}

const SELECT_ORCAMENTO =
  "id, nome_cliente, nome_carro, placa, valor_hora, horas, mao_de_obra, pecas, valor_peca, total, status, created_at";

export type ResultadoCriarOrcamento =
  | { ok: true; orcamento: Orcamento }
  | { ok: false; error: string };

/**
 * Cria um orçamento no histórico da empresa, sempre com status inicial
 * "Aguardando aprovação" — o client nunca escolhe o status na criação.
 * Qualquer membro da empresa (admin ou funcionário) pode salvar.
 */
export async function criarOrcamento(
  empresaId: string,
  dados: {
    nomeCliente: string;
    nomeCarro: string;
    placa: string;
    valorHora: number;
    horas: number;
    maoDeObra: number;
    pecas: PecaResumo[];
    valorPeca: number;
    total: number;
  }
): Promise<ResultadoCriarOrcamento> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo) {
    return { ok: false, error: ERRO_SEM_VINCULO };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("orcamentos")
    .insert({
      empresa_id: empresaId,
      nome_cliente: dados.nomeCliente.trim().slice(0, MAX_CHARS_NOME),
      nome_carro:
        dados.nomeCarro.trim().slice(0, MAX_CHARS_NOME) || "Sem nome",
      placa: dados.placa.trim().slice(0, MAX_CHARS_PLACA).toUpperCase(),
      valor_hora: Number.isFinite(dados.valorHora) ? dados.valorHora : 0,
      horas: Number.isFinite(dados.horas) ? dados.horas : 0,
      mao_de_obra: Number.isFinite(dados.maoDeObra) ? dados.maoDeObra : 0,
      pecas: sanitizarPecas(dados.pecas ?? []),
      valor_peca: Number.isFinite(dados.valorPeca) ? dados.valorPeca : 0,
      total: Number.isFinite(dados.total) ? dados.total : 0,
    })
    .select(SELECT_ORCAMENTO)
    .single();

  if (error || !data) {
    console.error("criarOrcamento: falha ao gravar orcamentos:", error?.message);
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true, orcamento: paraOrcamento(data) };
}

/**
 * Muda o status de um orçamento existente entre as opções do CHECK
 * (Aguardando aprovação / Aprovado / Não aprovado). Qualquer membro da
 * empresa pode mudar — não é restrito a admin.
 */
export async function atualizarStatusOrcamento(
  empresaId: string,
  orcamentoId: string,
  status: StatusOrcamento
): Promise<ResultadoAuth> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo) {
    return { ok: false, error: ERRO_SEM_VINCULO };
  }
  if (!STATUS_VALIDOS.includes(status)) {
    return { ok: false, error: ERRO_GENERICO };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("orcamentos")
    .update({ status })
    .eq("id", orcamentoId)
    .eq("empresa_id", empresaId);

  if (error) {
    console.error(
      "atualizarStatusOrcamento: falha ao gravar orcamentos:",
      error.message
    );
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true };
}

/** Remove um orçamento do histórico da empresa. */
export async function excluirOrcamento(
  empresaId: string,
  orcamentoId: string
): Promise<ResultadoAuth> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo) {
    return { ok: false, error: ERRO_SEM_VINCULO };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("orcamentos")
    .delete()
    .eq("id", orcamentoId)
    .eq("empresa_id", empresaId);

  if (error) {
    console.error("excluirOrcamento: falha ao remover orcamentos:", error.message);
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true };
}

function paraValorHoraSalvo(row: {
  id: string;
  nome: string;
  valor_hora: number;
  status: string;
  created_at: string;
}): ValorHoraSalvo {
  return {
    id: row.id,
    nome: row.nome,
    valorHora: Number(row.valor_hora),
    status: row.status as StatusValorHora,
    data: row.created_at,
  };
}

export type ResultadoSalvarValorHora =
  | { ok: true; registro: ValorHoraSalvo }
  | { ok: false; error: string };

/**
 * Salva o valor hora atual do Passo 1 no histórico da empresa
 * (valor_hora_historico). Restrito a admin, como salvarPasso1 — o valor
 * hora é dado gerencial. O primeiro registro da empresa nasce como
 * "padrao" (o orçamento precisa de um default); os demais nascem "ativo".
 */
export async function salvarValorHora(
  empresaId: string,
  dados: { nome: string; valorHora: number }
): Promise<ResultadoSalvarValorHora> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo || vinculo.papel !== "admin") {
    return { ok: false, error: ERRO_SEM_PERMISSAO };
  }

  const nome = String(dados.nome ?? "").trim().slice(0, MAX_CHARS_NOME);
  if (!nome) {
    return { ok: false, error: "Dê um nome para este valor hora." };
  }
  const valorHora = Number(dados.valorHora);
  if (!Number.isFinite(valorHora) || valorHora <= 0) {
    return { ok: false, error: "Calcule um valor hora antes de salvar." };
  }

  const admin = createSupabaseAdminClient();

  const { count: totalPadrao, error: erroPadrao } = await admin
    .from("valor_hora_historico")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .eq("status", "padrao");
  if (erroPadrao || totalPadrao === null) {
    console.error(
      "salvarValorHora: falha ao verificar o padrão:",
      erroPadrao?.message
    );
    return { ok: false, error: ERRO_GENERICO };
  }

  const { data, error } = await admin
    .from("valor_hora_historico")
    .insert({
      empresa_id: empresaId,
      nome,
      valor_hora: valorHora,
      status: totalPadrao === 0 ? "padrao" : "ativo",
    })
    .select("id, nome, valor_hora, status, created_at")
    .single();
  if (error || !data) {
    console.error(
      "salvarValorHora: falha ao gravar valor_hora_historico:",
      error?.message
    );
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true, registro: paraValorHoraSalvo(data) };
}

/**
 * Muda o status de um valor hora salvo. Restrito a admin. Ao promover um
 * registro a "padrao", o padrão anterior é rebaixado para "ativo" antes —
 * o índice único parcial (migration 0008) garante no banco que nunca há
 * dois padrões, mesmo com chamadas concorrentes.
 */
export async function atualizarStatusValorHora(
  empresaId: string,
  registroId: string,
  status: StatusValorHora
): Promise<ResultadoAuth> {
  const sessao = await getSessaoComEmpresa();
  const vinculo = sessao?.empresas.find((e) => e.id === empresaId);
  if (!vinculo || vinculo.papel !== "admin") {
    return { ok: false, error: ERRO_SEM_PERMISSAO };
  }
  if (!STATUS_VALOR_HORA_VALIDOS.includes(status)) {
    return { ok: false, error: ERRO_GENERICO };
  }

  const admin = createSupabaseAdminClient();

  if (status === "padrao") {
    const { error: erroRebaixar } = await admin
      .from("valor_hora_historico")
      .update({ status: "ativo" })
      .eq("empresa_id", empresaId)
      .eq("status", "padrao")
      .neq("id", registroId);
    if (erroRebaixar) {
      console.error(
        "atualizarStatusValorHora: falha ao rebaixar o padrão anterior:",
        erroRebaixar.message
      );
      return { ok: false, error: ERRO_GENERICO };
    }
  }

  const { error } = await admin
    .from("valor_hora_historico")
    .update({ status })
    .eq("id", registroId)
    .eq("empresa_id", empresaId);
  if (error) {
    console.error(
      "atualizarStatusValorHora: falha ao gravar valor_hora_historico:",
      error.message
    );
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true };
}
