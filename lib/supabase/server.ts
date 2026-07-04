import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Client Supabase para server components, server actions e route handlers.
 * Lê a sessão dos cookies da requisição; usa a anon key, portanto toda
 * leitura passa pelo RLS do usuário logado (escrita fica com o admin client).
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll foi chamado a partir de um Server Component, onde cookies
          // são somente leitura. Pode ser ignorado com segurança: o refresh
          // da sessão é feito pelo middleware.
        }
      },
    },
  });
}
