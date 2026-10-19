import Cta from "./Cta";

export default function HeroParaOficinas() {
  return (
    <section data-hero className="relative overflow-hidden pt-[130px] pb-[90px] lg:pt-[150px]">
      <div className="hero-bg" aria-hidden="true" />

      <div className="wrap max-w-[940px] text-left">
        <div className="flex flex-col items-start">
          <span className="hero-badge reveal">
            <span className="dot" />
            Precificação é o pilar principal da tua oficina
          </span>

          <h1 className="reveal d1 font-display font-black text-[clamp(34px,5.4vw,62px)] my-6 max-w-[22ch]">
            Organize a precificação da sua oficina ainda hoje, <span className="text-blue">sem complicação.</span>
          </h1>

          <p className="reveal d2 max-w-[56ch] text-[clamp(16px,1.7vw,20px)] leading-[1.7] text-[#c8d7df]">
            Em aproximadamente <strong className="text-white">45 minutos</strong>, tu aprende a calcular o valor correto da tua mão de obra e das peças e já pode ajustar os próximos orçamentos, independente do tamanho da tua oficina.
          </p>

          <ul className="reveal d2 my-7 space-y-3 text-[clamp(16px,1.7vw,20px)] font-bold text-white">
            {[
              "Saiba quanto cobrar pela tua mão de obra",
              "Aprenda a colocar o preço certo nas peças",
              "Faça as contas usando uma planilha pronta",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3">
                <span className="text-blue" aria-hidden="true">✓</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="reveal d3 flex w-full flex-col items-start gap-[14px] sm:w-auto">
            <Cta variant="lg">Quero aprender a cobrar certo</Cta>
            <span className="reassure">
              Acesso imediato • Aulas práticas • Planilha + tabela de markup
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
