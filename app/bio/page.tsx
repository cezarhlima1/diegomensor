import type { Metadata } from "next";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import { ArrowRight } from "@/components/icons";
import { MENTORIA_OAG_FORM_URL } from "@/lib/links";

export const metadata: Metadata = {
  title: "Diego Mensor — Por onde começar",
  description:
    "24 anos dentro da oficina e 14 como empresário. Cursos, ferramentas e mentorias para donos de oficina construírem empresas mais organizadas, eficientes e lucrativas.",
};

type BioLink = {
  title: string;
  desc: string;
  href?: string;
  soon?: boolean;
};

const LINKS: BioLink[] = [
  {
    title: "Precificação para oficinas",
    desc: "Aprenda a calcular o preço certo e aumentar a lucratividade da sua oficina.",
    href: "https://payfast.greenn.com.br/x4tv742",
  },
  {
    title: "Calculadora de precificação",
    desc: "A ferramenta que calcula seus preços de forma rápida e precisa.",
    soon: true,
  },
  {
    title: "Produtividade para oficinas",
    desc: "Aumente a produtividade e faça sua oficina render mais.",
    href: "https://payfast.greenn.com.br/n9vm2px",
  },
  {
    title: "Mentoria OAG",
    desc: "Acompanhamento personalizado e estratégico para transformar a gestão e os resultados da sua oficina de forma acelerada.",
    href: MENTORIA_OAG_FORM_URL,
  },
];

export default function BioPage() {
  return (
    <>
      <ClientEffects />

      <main className="relative min-h-[100svh] py-16 sm:py-24" data-hero>
        <div className="hero-bg" aria-hidden="true" />

        <div className="wrap max-w-[600px]">
          {/* ---------- perfil ---------- */}
          <header className="text-center">
            <div
              className="bio-avatar bio-anim bio-anim--avatar mx-auto"
              style={{ animationDelay: "60ms" }}
            >
              <img src="/diego.jpeg" alt="Diego Mensor" />
            </div>
            <h1
              className="font-display font-black text-[clamp(26px,7vw,36px)] text-white mt-6 bio-anim bio-anim--rise"
              style={{ animationDelay: "200ms" }}
            >
              Diego Mensor
            </h1>
            <div
              className="font-mono text-blue font-bold tracking-[.04em] mt-1.5 bio-anim bio-anim--rise"
              style={{ animationDelay: "290ms" }}
            >
              @diegomensor
            </div>
          </header>

          {/* ---------- quem é ---------- */}
          <section
            className="mt-11 bio-anim bio-anim--rise"
            style={{ animationDelay: "380ms" }}
          >
            <div className="text-center">
              <span className="tag">Quem é Diego Mensor</span>
            </div>

            <p className="text-[#d7e6f2] text-[clamp(15px,1.7vw,17px)] leading-relaxed mt-6">
              Com <span className="text-blue font-bold">24 anos de experiência dentro da oficina</span>{" "}
              e <span className="text-blue font-bold">14 anos como empresário</span>, aprendi que
              administrar uma oficina vai muito além da parte técnica. Ao longo dessa trajetória, vivi
              os desafios da operação, da equipe, da gestão e das decisões que fazem parte da rotina de
              quem está à frente de um negócio.
            </p>
            <p className="text-muted text-[clamp(14px,1.6vw,16px)] leading-relaxed mt-4">
              Hoje compartilho esse conhecimento através de{" "}
              <b className="text-offwhite font-semibold">cursos, ferramentas e mentorias</b>, ajudando
              donos de oficina a desenvolverem empresas mais organizadas, eficientes e preparadas para
              crescer.
            </p>

            {/* diferencial: números que destacam a trajetória */}
            <div className="bio-stats mt-7">
              <div className="bio-stat">
                <b>24</b>
                <span>anos dentro da oficina</span>
              </div>
              <div className="bio-stat">
                <b>14</b>
                <span>anos como empresário</span>
              </div>
            </div>
          </section>

          {/* ---------- escolha ---------- */}
          <p
            className="lead text-center text-offwhite mt-12 mb-7 bio-anim bio-anim--rise"
            style={{ animationDelay: "520ms" }}
          >
            Abaixo, você pode escolher <span className="text-blue font-semibold">por onde começar.</span>
          </p>

          {/* ---------- links ---------- */}
          <div className="grid gap-4">
            {LINKS.map((link, i) => {
              const num = String(i + 1).padStart(2, "0");
              const delay = { animationDelay: `${620 + i * 90}ms` };

              if (link.soon) {
                return (
                  <div
                    key={link.title}
                    className="bio-link bio-link--soon bio-anim"
                    style={delay}
                    aria-disabled="true"
                  >
                    <div className="bio-loading" aria-hidden="true">
                      <i />
                    </div>
                    <span className="bio-num">{num}</span>
                    <div className="bio-link-body">
                      <div className="bio-link-title">{link.title}</div>
                      <p className="bio-link-desc">{link.desc}</p>
                    </div>
                    <span className="bio-soon-chip">Em breve</span>
                  </div>
                );
              }

              const external = link.href?.startsWith("http");

              return (
                <a
                  key={link.title}
                  href={link.href}
                  {...(external && { target: "_blank", rel: "noopener noreferrer" })}
                  className="bio-link bio-anim"
                  style={delay}
                  data-glow
                >
                  <span className="bio-glow" aria-hidden="true" />
                  <span className="bio-num">{num}</span>
                  <div className="bio-link-body">
                    <div className="bio-link-title">{link.title}</div>
                    <p className="bio-link-desc">{link.desc}</p>
                  </div>
                  <ArrowRight className="bio-arrow w-[22px] h-[22px]" />
                </a>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
