import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EMAILS_PILOTO_EDICAO = [
  "diegomensor@hotmail.com",
  "diego.mensor@hotmail.com",
] as const;

/**
 * Libera a edição de orçamentos para todos os membros das empresas às quais
 * o cadastro piloto pertence. A consulta usa service role apenas no servidor;
 * nenhum e-mail ou vínculo adicional é enviado ao navegador.
 */
export async function empresaTemEdicaoDeOrcamentos(
  empresaId: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const filtroEmails = EMAILS_PILOTO_EDICAO.map(
    (email) => `email.ilike.${email}`,
  ).join(",");
  const { data: perfis, error: erroPerfis } = await admin
    .from("profiles")
    .select("id")
    .or(filtroEmails);

  if (erroPerfis) {
    console.error(
      "empresaTemEdicaoDeOrcamentos: falha ao localizar cadastros piloto:",
      erroPerfis.message,
    );
    return false;
  }

  const idsPiloto = (perfis ?? []).map((perfil) => perfil.id);
  if (idsPiloto.length === 0) return false;

  const { data, error } = await admin
    .from("empresa_usuarios")
    .select("user_id")
    .eq("empresa_id", empresaId)
    .in("user_id", idsPiloto)
    .limit(1);

  if (error) {
    console.error(
      "empresaTemEdicaoDeOrcamentos: falha ao verificar empresa piloto:",
      error.message,
    );
    return false;
  }

  return (data?.length ?? 0) > 0;
}
