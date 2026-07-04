import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/db/types";

/** Nome do cookie que guarda a empresa ativa de um admin multi-empresa. */
export const COOKIE_EMPRESA_ATIVA = "empresa_ativa";

/** Empresa vista pela sessão: dados de empresas + o papel do usuário nela. */
export type EmpresaDaSessao = {
  id: string;
  nome: string;
  papel: Papel;
  /** Resultado do Passo 1 (empresas.valor_hora) — legível por qualquer membro. */
  valorHora: number;
};

/** Sessão resolvida para a área logada: usuário + empresa ativa + empresas. */
export type SessaoComEmpresa = {
  userId: string;
  empresaAtiva: EmpresaDaSessao;
  empresas: EmpresaDaSessao[];
};

/**
 * Resolve a sessão da área logada em server components/actions.
 *
 * Lê o usuário autenticado e suas empresas (via RLS — o usuário só enxerga
 * vínculos das empresas às quais pertence) e resolve a empresa ativa pelo
 * cookie `empresa_ativa`; se o cookie não apontar para uma empresa do
 * usuário, cai para a primeira da lista.
 *
 * Retorna null quando não há sessão utilizável (sem usuário OU usuário sem
 * nenhuma empresa) — o chamador decide o redirect. Null aqui não é erro:
 * é o estado normal de "não logado".
 */
export async function getSessaoComEmpresa(): Promise<SessaoComEmpresa | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Vínculos do usuário + dados da empresa em uma query (RLS filtra por ele).
  const { data: vinculos, error } = await supabase
    .from("empresa_usuarios")
    .select("papel, empresas ( id, nome, valor_hora )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !vinculos) return null;

  const empresas: EmpresaDaSessao[] = [];
  for (const v of vinculos) {
    // O join 1:1 chega como objeto; o tipo gerado pelo supabase-js sem
    // schema tipado é frouxo, então validamos a presença antes de usar.
    const e = v.empresas as unknown as {
      id: string;
      nome: string;
      valor_hora: number;
    } | null;
    if (!e) continue;
    empresas.push({
      id: e.id,
      nome: e.nome,
      papel: v.papel as Papel,
      valorHora: Number(e.valor_hora),
    });
  }

  if (empresas.length === 0) return null;

  const cookieStore = await cookies();
  const idAtiva = cookieStore.get(COOKIE_EMPRESA_ATIVA)?.value;
  const empresaAtiva = empresas.find((e) => e.id === idAtiva) ?? empresas[0];

  return { userId: user.id, empresaAtiva, empresas };
}
