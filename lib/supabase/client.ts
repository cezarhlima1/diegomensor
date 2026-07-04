import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase para o browser (client components).
 * Usa a anon key: escrita é negada pelo RLS (sem policies de escrita);
 * leitura passa pelas policies de SELECT.
 */
export function createSupabaseBrowserClient() {
  // Referências literais a process.env.NEXT_PUBLIC_* são obrigatórias:
  // o Next.js as substitui estaticamente no bundle do cliente.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas"
    );
  }
  return createBrowserClient(url, anonKey);
}
