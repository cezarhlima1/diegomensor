import type { Metadata } from "next";
import { sair } from "@/components/auth/actions";
import SuporteWhatsApp from "@/components/auth/SuporteWhatsApp";

// Link de checkout (Greenn Payfast) para assinatura/renovação de acesso.
// Cobre teste grátis vencido e licença paga vencida — mesma tela para os
// dois casos, ver comentário do componente abaixo.
const LINK_ASSINATURA = "https://payfast.greenn.com.br/g99afud";

export const metadata: Metadata = {
  title: "Acesso expirado - Diego Mensor",
  description: "Seu acesso expirou. Assine ou renove para continuar usando a calculadora.",
};

// Rota pública (fora do matcher do middleware): é justamente o destino do
// redirect quando `license_expiry_at` está vencido, então não pode ela mesma
// exigir sessão válida sob risco de loop.
//
// `license_expiry_at` é o mesmo campo tanto para teste grátis de 3 dias
// quanto para licença paga anual — o banco não distingue os dois casos, então
// a copy abaixo é propositalmente genérica ("seu acesso", nunca "sua
// licença" nem "seu teste") para servir os dois sem diferenciação.
export default function LicencaExpiradaPage() {
  return (
    <main className="auth-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[440px]">
        <div className="calc-card cta-reveal">
          <p className="calc-card-kicker">Acesso bloqueado</p>
          <h1 className="calc-card-title">Seu acesso expirou</h1>
          <p className="calc-card-sub">
            Assine ou renove para continuar usando a calculadora, ou fale com
            o suporte se precisar de ajuda.
          </p>

          <a
            href={LINK_ASSINATURA}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--wide mt-6"
          >
            Assinar / Renovar acesso
          </a>

          <div className="mt-4 flex justify-center">
            <SuporteWhatsApp />
          </div>

          <form action={sair} className="mt-4">
            <button type="submit" className="btn btn--wide btn--ghost">
              Sair
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
