"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { COOKIE_EMPRESA_ATIVA } from "@/lib/auth/sessao";

/**
 * Rotas para as quais a troca de empresa pode redirecionar. Allowlist
 * fechada (em vez de aceitar qualquer string do client) para impedir
 * open redirect via parâmetro manipulado.
 */
const ROTAS_PERMITIDAS = ["/conta", "/calculadora"] as const;

/** Duração do cookie de empresa ativa: 1 ano, em segundos. */
const UM_ANO_S = 60 * 60 * 24 * 365;

/**
 * Define a empresa ativa da sessão (interface consumida pela Fase 4).
 *
 * Valida NO SERVIDOR que o chamador é membro da empresa (leitura via RLS:
 * o usuário só enxerga os próprios vínculos, então um id de empresa alheia
 * simplesmente não retorna linha) antes de gravar o cookie `empresa_ativa`.
 * Depois revalida /calculadora (os dados do Passo 1 dependem da empresa)
 * e redireciona para a rota atual, para a página re-renderizar já com a
 * nova empresa.
 *
 * Chamada inválida (sem sessão / não-membro) volta silenciosamente para
 * /conta sem gravar nada: não há o que o chamador legítimo fazer com um
 * erro aqui, e o estado anterior permanece íntegro.
 */
export async function definirEmpresaAtiva(
  empresaId: string,
  rotaAtual?: string
): Promise<void> {
  const rota = ROTAS_PERMITIDAS.find((r) => r === rotaAtual) ?? "/conta";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: vinculo } = await supabase
    .from("empresa_usuarios")
    .select("empresa_id")
    .eq("empresa_id", empresaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (vinculo) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_EMPRESA_ATIVA, empresaId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: UM_ANO_S,
    });
    revalidatePath("/calculadora");
  }

  redirect(rota);
}
