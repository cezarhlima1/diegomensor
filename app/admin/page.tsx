import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Admin from "@/components/admin/Admin";
import Footer from "@/components/Footer";
import { sair } from "@/components/auth/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listarEmpresasAdmin } from "@/components/admin/actions";

export const metadata: Metadata = {
  title: "Admin geral - Diego Mensor",
  description: "Gestão global de empresas, usuários e licenças da calculadora.",
};

// Página por trás de login: nunca pode ser pré-renderizada (mesmo padrão de
// /conta e /calculadora — o build sem env do Supabase não pode prerenderizar).
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Defesa em profundidade: o middleware já bloqueia quem não é super admin,
  // mas a página revalida (mesmo padrão de /conta).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) redirect("/calculadora");

  const empresas = await listarEmpresasAdmin();

  return (
    <>
      <header className="auth-header">
        <div className="wrap auth-header-in">
          <span className="auth-header-empresa">Admin geral</span>
          <nav className="auth-header-nav">
            <form action={sair}>
              <button type="submit" className="auth-sair">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="admin-page">
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap max-w-[880px]">
          {empresas ? (
            <Admin empresas={empresas} />
          ) : (
            <div className="calc-card cta-reveal">
              <p className="calc-card-kicker">Admin geral</p>
              <h1 className="calc-card-title">Algo deu errado</h1>
              <p className="calc-card-sub">
                Não foi possível carregar os dados. Recarregue a página em
                instantes.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
