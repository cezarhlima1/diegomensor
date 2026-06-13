const steps = [
  {
    n: "01",
    title: "Quanto custa manter sua oficina aberta?",
    desc: "Descubra quanto sua empresa realmente custa por mês, antes de colocar a mão em qualquer carro.",
  },
  {
    n: "02",
    title: "Pague aluguel pra você mesmo",
    desc: "O erro que faz muitos donos trabalharem pra oficina sem receber pelo próprio espaço, risco e operação.",
  },
  {
    n: "03",
    title: "Precificando da forma correta",
    desc: "Como parar de cobrar no chute e começar a precificar com base nos números da SUA oficina.",
  },
  {
    n: "04",
    title: "Contratar mais pode diminuir seu custo por hora",
    desc: "Sim. E entender isso pode mudar completamente a matemática da sua oficina.",
  },
  {
    n: "05",
    title: "Quanto cada mecânico deveria produzir?",
    desc: "Porque oficina cheia não significa equipe produtiva.",
  },
  {
    n: "06",
    title: "Como funciona o Tempário Automotivo?",
    desc: "Aprenda a usar tempo técnico pra parar de estimar serviço no improviso.",
  },
  {
    n: "07",
    title: "A importância de cobrar certo",
    desc: "Porque trabalhar mais não corrige precificação errada.",
  },
];

export default function Steps() {
  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap">
        <h2 className="section-title text-center mx-auto max-w-[24ch] reveal">
          Os 7 passos que fazem <span className="text-blue">a conta finalmente fechar</span> dentro
          da sua oficina
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[18px] mt-[54px]">
          {steps.map((s, i) => (
            <article key={s.n} className={`step reveal d${(i % 4) + 1}`}>
              <div className="step-num">Passo {s.n}</div>
              <div className="step-big">{s.n}</div>
              <h3 className="text-[19px] font-bold mb-2.5 leading-tight">{s.title}</h3>
              <p className="text-sm text-muted">{s.desc}</p>
            </article>
          ))}

          {/* card de reforço ocupando o 8º espaço */}
          <article className="step reveal d4 flex flex-col justify-center !border-blue/50 bg-[linear-gradient(165deg,#0a2c49,#0d1c28)]">
            <div className="step-num !text-blue-soft">Resultado</div>
            <h3 className="text-[21px] font-bold mt-2 leading-tight">
              A conta fechando, com clareza e no preto.
            </h3>
            <p className="text-[#cfe2f1] text-sm mt-2.5">
              Do custo real ao preço certo, sem improviso.
            </p>
          </article>
        </div>

        <p className="reveal mx-auto max-w-[720px] mt-[46px] text-center font-display font-bold text-[clamp(18px,2.2vw,24px)] leading-[1.35] text-offwhite">
          Funciona para qualquer oficina. Porque{" "}
          <span className="text-blue">custo errado, preço errado e lucro apertado</span> acontecem
          em qualquer empresa.
        </p>
      </div>
    </section>
  );
}
