import type { Metadata } from "next";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Acompanhamento para oficinas — Diego Mensor",
  description:
    "Conheça o acompanhamento de gestão de Diego Mensor para organizar e desenvolver sua oficina.",
};

const FORMULARIO_YOUTUBE =
  "https://mensortreinamentos.com.br/formulario?utm_source=youtube&utm_medium=organico&utm_campaign=mentoria_oag&utm_content=descricao";

export default function CadastroPage() {
  return (
    <>
      <main className="auth-page">
        <div className="hero-bg" aria-hidden="true" />
        <section className="wrap relative z-10 max-w-[720px] text-center">
          <div className="cta-reveal rounded-[22px] border border-line bg-card/90 px-6 py-10 shadow-2xl backdrop-blur-sm md:px-12 md:py-14">
            <span className="hero-badge">
              <span className="dot" /> Comunicado importante
            </span>

            <h1 className="section-title mt-7">
              As aulas gratuitas estão <span className="text-blue">temporariamente encerradas.</span>
            </h1>

            <p className="lead mx-auto mt-6 max-w-[590px]">
              As aulas gratuitas foram encerradas temporariamente para que o
              Diego possa dar atenção exclusiva aos mentorados.
            </p>

            <p className="lead mx-auto mt-4 max-w-[590px]">
              Se você quer saber como funciona o acompanhamento de gestão para
              sua oficina, preencha o formulário abaixo.
            </p>

            <div className="mx-auto mt-8 flex max-w-[520px] items-center justify-center gap-3 border-y border-line py-5">
              <img
                src="/diego.jpeg"
                alt="Diego Mensor"
                className="h-12 w-12 rounded-full border border-blue/40 object-cover object-top"
              />
              <div className="text-left leading-tight">
                <b className="font-display text-[15px] text-white">Diego Mensor</b>
                <span className="mt-1 block font-mono text-[11px] text-blue">Mentoria Método OAG</span>
              </div>
            </div>

            <a href={FORMULARIO_YOUTUBE} className="btn btn--lg mt-8">
              Preencher formulário
            </a>

            <p className="reassure mt-5">
              Conte um pouco sobre sua oficina para entendermos o seu momento.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
