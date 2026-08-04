import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EMAIL_PILOTO_EDICAO = "diegomensor@hotmail.com";

/**
 * Libera a edição de orçamentos para todos os membros das empresas às quais
 * o cadastro piloto pertence. A consulta usa service role apenas no servidor;
 * nenhum e-mail ou vínculo adicional é enviado ao navegador.
 */
export async function empresaTemEdicaoDeOrcamentos(
  empresaId: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("empresa_usuarios")
    .select("user_id, profiles!inner(email)")
    .eq("empresa_id", empresaId)
    .eq("profiles.email", EMAIL_PILOTO_EDICAO)
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
