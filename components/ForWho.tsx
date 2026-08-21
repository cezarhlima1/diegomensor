import Cta from "./Cta";
import { Check } from "./icons";

const items = [
  "Precificam com dúvida: será que isso tá certo mesmo?",
  "Não tem certeza se o cálculo de hora está correto.",
  "Não querem continuar tocando a empresa no improviso",
];

const testimonials = [
  {
    src: "/depoimentocaptura1.png",
    alt: "Depoimento de participante sobre o método",
    caption: "resultado real no grupo",
  },
  {
    src: "/depoimentocaptura2.png",
    alt: "Depoimento de participante sobre o método",
    caption: "relato após aplicar o método",
  },
  {
    src: "/Depoimento 003.PNG",
    alt: "Depoimento de participante sobre os resultados do treinamento",
    caption: "resultado de aluno",
  },
];

const beforeAfter = [
  {
    src: "/Depoimento01.png",
    alt: "Resultado antes de aplicar a precificação correta",
    caption: "Antes",
  },
  {
    src: "/Depoimento02.png",
    alt: "Resultado depois de aplicar a precificação correta",
    caption: "Depois",
  },
];

export default function ForWho() {
  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap">
        <div className="text-center">
          <span className="tag reveal">Isso é pra você?</span>
          <h2 className="section-title reveal d1 mt-[18px] mx-auto">
            Feito para <span className="text-blue">donos de oficina</span> que:
          </h2>
        </div>

        {/* lista com checks */}
        <ul className="grid gap-[14px] max-w-[760px] mx-auto mt-7 list-none">
          {items.map((text, i) => (
            <li
              key={i}
              className={`reveal d${i + 1} flex items-start gap-[14px] rounded-[14px] px-5 py-[18px] text-[clamp(15px,1.6vw,18px)] font-medium text-offwhite border border-line bg-[linear-gradient(160deg,var(--color-card),#10171f)] transition-[border-color,transform] duration-200 hover:border-blue/40 hover:translate-x-1`}
            >
              <span className="check-ic">
                <Check className="w-[15px] h-[15px]" />
              </span>
              {text}
            </li>
          ))}
        </ul>

        {/* faixa de depoimentos (prints reais de WhatsApp) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-[1100px] mx-auto mt-11 items-start">
          {testimonials.map((t, i) => (
            <figure key={i} className={`testi reveal d${i + 1} !p-0 overflow-hidden`}>
              <img src={t.src} alt={t.alt} className="block w-full h-auto" />
              <figcaption className="flex items-center gap-2 px-4 py-3 border-t border-line">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-brand-green">
                  <Check className="w-[13px] h-[13px]" /> {t.caption}
                </span>
                <span className="ml-auto text-amber text-[13px] tracking-[2px]">★★★★★</span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* um único caso apresentado em sequência: antes e depois */}
        <div className="max-w-[820px] mx-auto mt-8">
          <p className="font-display font-bold text-center text-[clamp(18px,2.5vw,24px)] text-offwhite mb-5">
            Antes e depois de aplicar a precificação correta
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
            {beforeAfter.map((item, index) => (
              <figure key={item.src} className={`testi reveal d${index + 1} !p-0 overflow-hidden`}>
                <div className="px-4 py-3 border-b border-line text-center">
                  <span className={`font-mono text-[11px] font-bold uppercase tracking-[.14em] ${index === 0 ? "text-amber" : "text-brand-green"}`}>
                    {item.caption}
                  </span>
                </div>
                <img src={item.src} alt={item.alt} className="block w-full h-auto" />
              </figure>
            ))}
          </div>
        </div>

        <div className="text-center mt-10 reveal d2">
          <Cta variant="lg">
            Quero aprender a cobrar certo
          </Cta>
        </div>
      </div>
    </section>
  );
}
