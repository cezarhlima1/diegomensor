import type { Metadata } from "next";
import { sair } from "@/components/auth/actions";

export const metadata: Metadata = {
  title: "Licença expirada - Diego Mensor",
  description: "Sua licença expirou. Entre em contato com a equipe do Diego Mensor.",
};

// Rota pública (fora do matcher do middleware): é justamente o destino do
// redirect quando a licença está vencida, então não pode ela mesma exigir
// sessão válida sob risco de loop.
export default function LicencaExpiradaPage() {
  return (
    <main className="auth-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[440px]">
        <div className="calc-card cta-reveal">
          <p className="calc-card-kicker">Acesso bloqueado</p>
          <h1 className="calc-card-title">Sua licença expirou</h1>
          <p className="calc-card-sub">
            Entre em contato com a equipe do Diego Mensor para renovar o
            acesso.
          </p>

          <form action={sair} className="mt-6">
            <button type="submit" className="btn btn--wide">
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
