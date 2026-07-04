// "server-only" transforma qualquer import deste módulo a partir de um client
// component em ERRO DE BUILD — garante em compile time que a service role key
// jamais chega ao bundle do cliente.
import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase com service role — IGNORA RLS.
 * Uso exclusivo em server actions/route handlers para as escritas do domínio
 * (criar empresa, vincular usuário, salvar Passo 1), sempre após validar o
 * papel do chamador. Os triggers do banco são o backstop dos limites.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas"
    );
  }
  return createClient(url, serviceRoleKey, {
    // Client administrativo não gerencia sessão de usuário.
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
