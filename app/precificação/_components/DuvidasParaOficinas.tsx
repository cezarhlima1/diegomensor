import SectionCta from "./SectionCta";
const doubts = [
  "Será que eu tô cobrando barato demais?",
  "Se eu aumentar o preço, será que o cliente vai embora?",
  "Eu faturo bem, mas não entendo por que sobra tão pouco.",
  "Minha mão de obra é esse valor… mas não sei se está certo.",
  "Coloco minha margem nas peças, mas não sei quanto realmente sobra.",
  "Vejo outras oficinas cobrando mais, mas não sei se eu também poderia cobrar.",
];

export default function DuvidasParaOficinas() {
  return (
    <section className="relative py-[72px] md:py-24" aria-labelledby="duvidas-title">
      <div className="wrap">
        <h2 id="duvidas-title" className="section-title reveal mx-auto max-w-[36ch] text-center">
          Se tu nunca tem certeza se está cobrando certo, <span className="text-blue">essas dúvidas provavelmente já passaram pela tua cabeça:</span>
        </h2>

        <ul className="mx-auto mt-10 grid max-w-[1100px] list-none gap-5 md:mt-14 md:grid-cols-2 md:gap-6">
          {doubts.map((doubt, index) => (
            <li key={doubt} className={`reveal d${(index % 3) + 1} relative flex items-center rounded-[20px] border border-line bg-[linear-gradient(145deg,var(--color-card),#10171f)] px-6 py-8 md:px-8 md:py-10`}>
              <span aria-hidden="true" className="absolute left-5 top-1 font-display text-[64px] leading-none text-blue/20">“</span>
              <p className="relative font-display text-[clamp(18px,2vw,23px)] font-bold leading-relaxed text-offwhite">
                “{doubt}”
              </p>
            </li>
          ))}
        </ul>
        <SectionCta />
      </div>
    </section>
  );
}
