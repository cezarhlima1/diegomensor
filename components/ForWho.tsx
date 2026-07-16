import Cta from "./Cta";
import { Check } from "./icons";

const items = [
  "Trabalham cada vez mais… e continuam apertados no caixa",
  "Nunca calcularam corretamente sua hora trabalhada",
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

        {/* faixa de 2 depoimentos (prints reais de WhatsApp) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[820px] mx-auto mt-11 items-start">
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

        <div className="text-center mt-10 reveal d2">
          <Cta variant="lg">
            Quero aprender a cobrar certo
          </Cta>
        </div>
      </div>
    </section>
  );
}
