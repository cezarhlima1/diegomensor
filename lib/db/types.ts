// Tipos de domínio do banco (Supabase). Espelham as colunas das tabelas em
// snake_case para uso direto no retorno das queries do supabase-js, sem
// camada de mapeamento. Schema: supabase/migrations/0001_auth_empresas.sql.

/** Papel de um usuário dentro de uma empresa (espelha o CHECK de empresa_usuarios.papel). */
export type Papel = "admin" | "funcionario";

/** Linha de public.empresas. valor_hora é o resultado do Passo 1, legível por qualquer membro. */
export type Empresa = {
  id: string;
  nome: string;
  max_usuarios: number;
  valor_hora: number;
  created_at: string;
};

/** Membro de uma empresa: vínculo de empresa_usuarios + dados denormalizados de profiles. */
export type Membro = {
  user_id: string;
  nome: string | null;
  email: string;
  papel: Papel;
};

/**
 * Linha de public.calc_passo1 — insumos gerenciais do Passo 1 (RLS: admin-only).
 * custos/horas_mes/mecanicos são strings mascaradas pt-BR, exatamente como o app
 * usa em calcLogic.ts (ex.: "1.500,00"); o cálculo acontece no app, não no banco.
 */
export type CalcPasso1Row = {
  empresa_id: string;
  custos: Record<string, string>;
  horas_mes: string | null;
  mecanicos: string | null;
  multiplicador: number;
  updated_at: string;
};
