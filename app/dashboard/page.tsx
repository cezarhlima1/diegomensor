import type { Metadata } from "next";
import MarketingDashboard from "@/components/dashboard/MarketingDashboard";
import styles from "@/components/dashboard/dashboard.module.css";
import { sessaoDashboardValida } from "@/lib/dashboard/auth";
import { entrarDashboard } from "./actions";

export const metadata: Metadata = {
  title: "Inteligência de Marketing | Mensor Treinamentos",
  description: "Dashboard privado de marketing, lançamentos e inteligência de métricas.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const autenticado = await sessaoDashboardValida();
  if (autenticado) return <MarketingDashboard />;
  const { erro } = await searchParams;

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginGlow} aria-hidden="true" />
      <section className={styles.loginCard}>
        <div className={styles.loginBrand}><span>MT</span><b>Mensor Treinamentos</b></div>
        <p className={styles.eyebrow}>Acesso privado</p>
        <h1>Inteligência de marketing e lançamentos.</h1>
        <p className={styles.loginLead}>Entre para acompanhar métricas, funis, projeções e oportunidades de escala.</p>
        <form action={entrarDashboard} className={styles.loginForm}>
          <label><span>E-mail</span><input name="email" type="email" autoComplete="username" required /></label>
          <label><span>Senha</span><input name="senha" type="password" autoComplete="current-password" required /></label>
          {erro && <p className={styles.loginError} role="alert">E-mail ou senha incorretos.</p>}
          <button type="submit">Entrar no dashboard <span>→</span></button>
        </form>
        <small>Ambiente protegido · sessão de 12 horas</small>
      </section>
    </main>
  );
}

