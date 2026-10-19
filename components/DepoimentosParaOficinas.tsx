import Cta from "./Cta";

const cases = [
  {
    images: [
      { src: "/Depoimento01.png", alt: "Resultado da oficina antes de ajustar a precificação", label: "Antes" },
      { src: "/Depoimento02.png", alt: "Resultado da oficina depois de ajustar a precificação", label: "Depois" },
    ],
    text: "Os mesmos 33 carros. Só que agora, cobrando corretamente por cada serviço.",
  },
  {
    images: [{ src: "/depoimentocaptura2.png", alt: "Depoimento sobre o aumento de faturamento após os ajustes de precificação", label: "" }],
    text: "O faturamento praticamente dobrou depois dos ajustes de precificação dentro da oficina.",
  },
  {
    images: [{ src: "/Depoimento 003.PNG", alt: "Depoimento sobre a meta de R$100 mil batida antes do fim do mês", label: "" }],
    text: "Mais um mês acima dos R$100 mil, com a meta batida antes do último dia, depois de ajustar a precificação.",
  },
  {
    images: [{ src: "/Depoimento 002.png", alt: "Depoimento sobre o melhor mês desde a abertura da oficina", label: "" }],
    text: "O ajuste de precificação faz isso: o melhor mês desde que abriram a oficina!",
  },
];

export default function DepoimentosParaOficinas() {
  return (
    <section className="py-[72px] md:py-24" aria-labelledby="depoimentos-title">
      <div className="wrap">
        <h2 id="depoimentos-title" className="section-title reveal mx-auto text-center max-w-[30ch]">
          Isso aqui é o que acontece quando você aprende a <span className="text-blue">precificar corretamente:</span>
        </h2>

        <div className="mx-auto mt-12 max-w-[1100px] space-y-12 md:mt-16 md:space-y-20">
          {cases.map((item) => (
            <article key={item.text} className="reveal grid grid-cols-1 items-center gap-7 border-b border-line pb-12 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-12 md:pb-20 lg:gap-16">
              <div className="flex min-w-0 flex-col gap-6">
                {item.images.map((image) => (
                  <figure key={image.src} className="testi !m-0 !p-0 overflow-hidden">
                    {image.label && (
                      <figcaption className="border-b border-line px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-[.14em] text-blue">
                        {image.label}
                      </figcaption>
                    )}
                    <img src={image.src} alt={image.alt} loading="lazy" className="block h-auto w-full" />
                  </figure>
                ))}
              </div>
              <p className="font-display text-[clamp(22px,2.6vw,32px)] font-bold leading-[1.45] text-offwhite">
                {item.text}
              </p>
            </article>
          ))}
        </div>

        <div className="reveal mt-12 text-center md:mt-16">
          <Cta variant="lg">Quero aprender a cobrar certo</Cta>
        </div>
      </div>
    </section>
  );
}
