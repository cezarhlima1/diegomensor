"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessaoComEmpresa } from "@/lib/auth/sessao";
import { ERRO_GENERICO } from "@/components/auth/authLogic";
import type { ResultadoAuth } from "@/components/auth/actions";
import {
  CUSTO_FIELDS,
  MULT_DEFAULT,
  MULT_MAX,
  MULT_MIN,
  calcCustoHora,
  parseNum,
  somaCustos,
  type Passo1Dados,
} from "./calcLogic";

const ERRO_SEM_PERMISSAO =
  "Você não tem permissão para editar os custos desta empresa.";

/** Teto de caracteres por campo persistido — a máscara pt-BR nunca passa disso. */
const MAX_CHARS_CAMPO = 20;

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
