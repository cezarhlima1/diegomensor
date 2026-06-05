import Cta from "./Cta";
import { Check } from "./icons";

const items = [
  "Trabalham cada vez mais… e continuam apertados no caixa",
  "Nunca calcularam corretamente sua hora trabalhada",
  "Não querem continuar tocando a empresa no improviso",
];

const testimonials = [
  {
    initial: "J",
    name: "Jardel — Oficina Mecânica",
    quote:
      "Eu cobrava a hora no chute. Fiz a conta do jeito que o Diego ensina e descobri que estava trabalhando quase de graça. Ajustei o preço e o caixa respirou.",
  },
  {
    initial: "M",
    name: "Marcos — Auto Center",
    quote:
      "Sempre achei que era questão de vender mais. Era questão de saber meu custo. Em uma semana corrigi a precificação e parei de perder dinheiro em serviço grande.",
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

        {/* faixa de 2 depoimentos (prints placeholder) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[820px] mx-auto mt-11">
          {testimonials.map((t, i) => (
            <div key={i} className={`testi reveal d${i + 1}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="testi-av">{t.initial}</div>
                <div>
                  <b className="block font-display font-bold text-sm">{t.name}</b>
                  <span className="font-mono text-[11px] text-muted">WhatsApp • print de relato</span>
                </div>
                <div className="ml-auto text-amber text-[13px] tracking-[2px]">★★★★★</div>
              </div>
              <p className="text-[14.5px] text-offwhite">&ldquo;{t.quote}&rdquo;</p>
              <span className="inline-flex items-center gap-1.5 mt-3 font-mono text-[11px] text-brand-green">
                <Check className="w-[13px] h-[13px]" /> aplicou o método
              </span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10 reveal d2">
          <Cta href="#checkout" variant="lg">
            Quero acessar por R$197
          </Cta>
        </div>
      </div>
    </section>
  );
}
