import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { Check, WhatsApp } from "@/components/icons";
import { WHATSAPP_GROUP_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Acesso liberado — Precificação para Oficinas",
  description:
    "Compra confirmada. Entre no grupo dos encontros de domingo e participe das aulas semanais sobre gestão, lucro e oficina da vida real.",
  robots: { index: false, follow: false },
};

export default function ObrigadoPage() {
  return (
    <>
      <main className="relative min-h-[100svh] flex items-center py-24">
        <div className="hero-bg" aria-hidden="true" />

        <div className="wrap max-w-[680px] text-center cta-reveal">
          {/* selo de confirmação */}
          <span
            className="inline-grid place-items-center w-[68px] h-[68px] rounded-[20px] text-brand-green mx-auto"
            style={{
              background: "rgba(47,210,122,.12)",
              border: "1px solid rgba(47,210,122,.4)",
              boxShadow: "inset 0 0 24px rgba(47,210,122,.25), 0 0 40px -8px rgba(47,210,122,.5)",
            }}
          >
            <Check className="w-8 h-8" strokeWidth={3} />
          </span>

          <h1 className="section-title mt-7">
            Fala, meu jovem!{" "}
            <span className="text-blue">Tu tomou a decisão certa.</span>
          </h1>

          <p className="lead mt-6 max-w-[560px] mx-auto">
            Aprender a precificar do jeito certo vai mudar a forma como tu olha
            pra tua oficina e, principalmente, vai fazer{" "}
            <b className="text-offwhite font-bold">
              mais dinheiro sobrar no teu bolso.
            </b>
          </p>

          <p className="lead mt-4 max-w-[560px] mx-auto">
            <b className="text-blue font-bold">
              Agora, pra concluir o teu acesso: entra no grupo abaixo e participa
              das aulas semanais.
            </b>
          </p>

          {/* card de acesso ao grupo */}
          <div className="price-card mt-10 text-left">
            <div className="pointer-glow" aria-hidden="true" />
            <span className="tag">Acesso ao grupo</span>
            <p className="font-display font-bold text-[clamp(18px,2.6vw,24px)] leading-snug text-white mt-5 mb-7">
              Todo domingo tem conteúdo{" "}
              <span className="text-blue">VIDA REAL</span> sobre gestão, lucro e
              oficina.
            </p>

            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--wide"
            >
              <WhatsApp className="w-[22px] h-[22px]" />
              Participar dos encontros
            </a>

            <p className="reassure mt-4 text-center">
              <b>Grátis</b> · aulas ao vivo todo domingo, às 19h
            </p>
          </div>

          <p className="font-display font-bold text-[clamp(17px,2.2vw,20px)] text-offwhite mt-9">
            Te vejo lá. 🚀
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
