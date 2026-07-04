import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Calculadora from "@/components/calculadora/Calculadora";
import Footer from "@/components/Footer";
import HeaderLogado from "@/components/auth/HeaderLogado";
import { getSessaoComEmpresa } from "@/lib/auth/sessao";

export const metadata: Metadata = {
  title: "Calculadora de Precificação - Diego Mensor",
  description:
    "Calcule o custo real da sua hora, precifique peças com o markup certo e monte orçamentos para a sua oficina. Histórico salvo no navegador.",
};

// Página por trás de login: nunca pode ser pré-renderizada. Sem isto, o
// build sem env do Supabase tentaria prerender e falharia na checagem de env
// (que roda antes de cookies() marcar a rota como dinâmica).
export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  // Defesa em profundidade: o middleware já bloqueia sem sessão, mas a
  // página revalida (cobre também usuário autenticado sem empresa).
  const sessao = await getSessaoComEmpresa();
  if (!sessao) redirect("/login");

  return (
    <>
      <HeaderLogado nomeEmpresa={sessao.empresaAtiva.nome}>
        {/* Gestão de conta é exclusiva de admin — funcionário nem vê o link
            (e a página /conta revalida o papel no servidor de toda forma). */}
        {sessao.empresaAtiva.papel === "admin" && (
          <Link href="/conta" className="auth-nav-link">
            Minha conta
          </Link>
        )}
      </HeaderLogado>
      <main>
        <Calculadora />
      </main>
      <Footer />
    </>
  );
}
