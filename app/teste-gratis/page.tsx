import type { Metadata } from "next";
import { Check } from "@/components/icons";
import CadastroTesteGratis from "@/components/testeGratis/CadastroTesteGratis";
import SuporteWhatsApp from "@/components/auth/SuporteWhatsApp";

export const metadata: Metadata = {
  title: "Teste grátis - Diego Mensor",
  description:
    "Teste a calculadora de precificação da sua oficina grátis por 3 dias. Cadastro em 1 minuto, sem cartão de crédito.",
};

const BENEFICIOS = [
  "Descubra o custo real da sua hora em minutos",
  "Precifique peças com o markup certo, sem achismo",
  "Monte orçamentos e acompanhe com a equipe",
];

// Rota pública: fora do matcher do middleware.ts (só /calculadora, /conta,
// /admin, /CRM, /api/crm passam por ele), então não precisa de nenhuma
// alteração lá para ficar acessível sem login.
export default function TesteGratisPage() {
  return (
    <main className="auth-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[440px]">
        <div className="calc-card cta-reveal">
          <span className="hero-badge mb-3">
            <span className="dot" /> Teste grátis · 3 dias
          </span>
          <p className="calc-card-kicker">Calculadora de precificação</p>
          <h1 className="calc-card-title">Comece seu teste grátis</h1>
          <p className="calc-card-sub">
            Crie sua conta e já entre direto na calculadora. Sem cartão de
            crédito, sem compromisso.
          </p>

          <div className="grid gap-2 mt-5 mb-1">
            {BENEFICIOS.map((beneficio) => (
              <div key={beneficio} className="flex items-center gap-[11px] text-[14px] text-offwhite">
                <span className="price-feat-ck">
                  <Check className="w-[13px] h-[13px]" />
                </span>
                {beneficio}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <CadastroTesteGratis />
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <SuporteWhatsApp />
        </div>
      </div>
    </main>
  );
}
