import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Conta from "@/components/conta/Conta";
import Footer from "@/components/Footer";
import HeaderLogado from "@/components/auth/HeaderLogado";
import { getSessaoComEmpresa } from "@/lib/auth/sessao";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Membro, Papel } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Minha conta - Diego Mensor",
  description:
    "Gerencie os usuários e as empresas da sua conta na calculadora de precificação.",
};

// Página por trás de login: nunca pode ser pré-renderizada (mesmo padrão
// de /calculadora — o build sem env do Supabase não pode tentar prerender).
export const dynamic = "force-dynamic";

/** Dados de gestão da empresa ativa — carregados APENAS para admins. */
type DadosDaConta = {
  membros: Membro[];
  maxUsuarios: number;
  maxEmpresas: number;
};

/**
 * Carrega membros e limites de licença via ADMIN CLIENT (service role).
 * Por que não RLS: a policy de profiles é "cada um lê só o próprio", então
 * nome/e-mail dos DEMAIS membros não são legíveis com a anon key. Este
 * caminho só executa depois do gate de papel admin (validado no servidor
 * com a sessão dos cookies) — funcionário nunca chega aqui, mantendo o
 * princípio de menor privilégio sem abrir e-mails de colegas no RLS.
 */
async function carregarDadosDaConta(
  empresaId: string,
  userId: string
): Promise<DadosDaConta | null> {
  const admin = createSupabaseAdminClient();

  const [empresaRes, vinculosRes, profileRes] = await Promise.all([
    admin.from("empresas").select("max_usuarios").eq("id", empresaId).single(),
    admin
      .from("empresa_usuarios")
      .select("user_id, papel, created_at, profiles ( nome, email )")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: true }),
    admin.from("profiles").select("max_empresas").eq("id", userId).single(),
  ]);

  if (empresaRes.error || vinculosRes.error || profileRes.error) {
    console.error(
      "conta: falha ao carregar dados da empresa",
      empresaId,
      empresaRes.error?.message ?? vinculosRes.error?.message ?? profileRes.error?.message
    );
    return null;
  }

  const membros: Membro[] = [];
  for (const v of vinculosRes.data) {
    // O join 1:1 chega como objeto; o tipo do supabase-js sem schema tipado
    // é frouxo (mesmo padrão de lib/auth/sessao.ts) — validar antes de usar.
    const p = v.profiles as unknown as { nome: string | null; email: string } | null;
    if (!p) continue;
    membros.push({
      user_id: v.user_id,
      nome: p.nome,
      email: p.email,
      papel: v.papel as Papel,
    });
  }

  return {
    membros,
    maxUsuarios: empresaRes.data.max_usuarios,
    maxEmpresas: profileRes.data.max_empresas,
  };
}

export default async function ContaPage() {
  // Defesa em profundidade: o middleware já bloqueia sem sessão, mas a
  // página revalida (cobre também usuário autenticado sem empresa).
  const sessao = await getSessaoComEmpresa();
  if (!sessao) redirect("/login");

  const ehAdmin = sessao.empresaAtiva.papel === "admin";

  return (
    <>
      <HeaderLogado nomeEmpresa={sessao.empresaAtiva.nome}>
        <Link href="/calculadora" className="auth-nav-link">
          Calculadora
        </Link>
      </HeaderLogado>

      {ehAdmin ? (
        <ContaAdmin
          userId={sessao.userId}
          empresaAtiva={sessao.empresaAtiva}
          empresas={sessao.empresas}
        />
      ) : (
        // Funcionário: NENHUM dado de gestão é buscado nem renderizado —
        // apenas a mensagem de acesso restrito (DW-3.6).
        <main className="conta-page">
          <div className="hero-bg" aria-hidden="true" />
          <div className="wrap max-w-[520px]">
            <div className="calc-card cta-reveal">
              <p className="calc-card-kicker">Minha conta</p>
              <h1 className="calc-card-title">Acesso restrito</h1>
              <p className="calc-card-sub">
                Esta área é exclusiva dos administradores da empresa. Se
                precisar alterar usuários ou dados da conta, fale com um
                administrador da {sessao.empresaAtiva.nome}.
              </p>
              <Link href="/calculadora" className="btn btn--wide mt-6">
                Ir para a calculadora
              </Link>
            </div>
          </div>
        </main>
      )}
      <Footer />
    </>
  );
}

/** Miolo da página para admins: carrega os dados e monta a gestão. */
async function ContaAdmin({
  userId,
  empresaAtiva,
  empresas,
}: {
  userId: string;
  empresaAtiva: { id: string; nome: string };
  empresas: { id: string; nome: string }[];
}) {
  const dados = await carregarDadosDaConta(empresaAtiva.id, userId);

  return (
    <main className="conta-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[760px]">
        {dados ? (
          <Conta
            userId={userId}
            empresaAtiva={{ id: empresaAtiva.id, nome: empresaAtiva.nome }}
            membros={dados.membros}
            maxUsuarios={dados.maxUsuarios}
            empresas={empresas.map((e) => ({ id: e.id, nome: e.nome }))}
            maxEmpresas={dados.maxEmpresas}
          />
        ) : (
          <div className="calc-card cta-reveal">
            <p className="calc-card-kicker">Minha conta</p>
            <h1 className="calc-card-title">Algo deu errado</h1>
            <p className="calc-card-sub">
              Não foi possível carregar os dados da conta. Recarregue a página
              em instantes.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
