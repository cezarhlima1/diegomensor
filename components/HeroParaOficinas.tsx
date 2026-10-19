import Cta from "./Cta";
import styles from "./hero-para-oficinas.module.css";

export default function HeroParaOficinas() {
  return (
    <section data-hero className="relative overflow-hidden pt-[130px] pb-[90px] lg:pt-[150px]">
      <div className="hero-bg" aria-hidden="true" />

      <div className="wrap max-w-[940px] text-center">
        <div className={styles.collage} aria-label="Prévia das aulas e dos materiais incluídos no treinamento">
          <img src="/imagem10.png" alt="Área do curso com as aulas de precificação" width={2718} height={1260} fetchPriority="high" className={styles.course} />
          <div className={styles.materials}>
            <img src="/imagem7.png" alt="Planilha de peças com tabela de markup automático" width={1776} height={1088} />
            <img src="/imagem8.png" alt="Planilha de despesas e cálculo do valor da mão de obra" width={1932} height={1120} />
            <img src="/imagem9.png" alt="Instruções práticas para usar a planilha de precificação" width={1600} height={1142} />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[820px] flex-col items-center">
          <span className="hero-badge reveal">
            <span className="dot" />
            Precificação é o pilar principal da tua oficina
          </span>

          <h1 className="reveal d1 my-6 w-full text-center font-display text-[clamp(32px,5vw,60px)] font-black leading-[1.12] tracking-[-.025em] [text-wrap:balance]">
            Organize a precificação da sua oficina ainda hoje,{" "}
            <span className="block text-blue">sem complicação.</span>
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
              <li key={text} className="flex items-start justify-center gap-3">
                <span className="text-blue" aria-hidden="true">✓</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="reveal d3 flex w-full flex-col items-center gap-[14px] sm:w-auto">
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
