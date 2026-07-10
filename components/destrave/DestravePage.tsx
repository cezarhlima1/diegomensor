import Cta from "@/components/Cta";
import { Check } from "@/components/icons";
import { DESTRAVE_CHECKOUT_URL } from "@/lib/links";
import DestravePriceBar from "./DestravePriceBar";
import DestraveTicket from "./DestraveTicket";
import DestraveFaq from "./DestraveFaq";
import type { DestraveCopy } from "./types";

const testimonials = [
  { src: "/depoimento.jpeg", alt: "Print de WhatsApp com relato de dono de oficina", caption: "resultado real no grupo" },
  { src: "/depoimento1.jpeg", alt: "Print de WhatsApp com relato de aluno sobre a gestão da oficina", caption: "relato após aplicar o método" },
];

export default function DestravePage({ copy }: { copy: DestraveCopy }) {
  return (
    <>
      {/* 1º BLOCO — herói */}
      <section data-hero className="relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-20">
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap grid grid-cols-1 lg:grid-cols-[1.15fr_.85fr] gap-14 items-center">
          <div>
            <span className="hero-badge reveal">
              <span className="dot" />
              {copy.eventLine}
            </span>

            <h1 className="reveal d1 font-display font-black text-[clamp(30px,4.6vw,52px)] my-6 max-w-[18ch]">
              {copy.headline.map((seg, i) =>
                seg.blue ? (
                  <span key={i} className="text-blue">
                    {seg.text}
                  </span>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )}
            </h1>

            <p className="reveal d2 lead mb-5">{copy.bulletsIntro}</p>

            <ul className="reveal d2 grid gap-3 max-w-[520px] text-left list-none mb-8">
              {copy.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-[15.5px] font-medium text-offwhite">
                  <span className="check-ic">
                    <Check className="w-[14px] h-[14px]" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="reveal d3 flex flex-col items-start">
              <Cta variant="lg" href={DESTRAVE_CHECKOUT_URL}>
                {copy.ctaLabel}
              </Cta>
              <DestravePriceBar label={copy.priceBarLabel} align="left" />
            </div>
          </div>

          <DestraveTicket
            eventLine={copy.eventLine}
            priceOld={copy.finalBlock.priceOld}
            priceNew={copy.finalBlock.priceNew}
          />
        </div>
      </section>

      {/* 2º BLOCO */}
      <section className="py-[72px] md:py-24">
        <div className="wrap text-center max-w-[760px]">
          <h2 className="section-title reveal mx-auto">{copy.block2.title}</h2>
          <p className="lead reveal d1 mt-4 mb-8">{copy.block2.intro}</p>

          <ul className="grid gap-3 max-w-[560px] mx-auto text-left list-none">
            {copy.block2.checks.map((c, i) => (
              <li
                key={i}
                className={`reveal d${i + 1} flex items-start gap-3 rounded-[14px] px-5 py-[16px] text-[15.5px] font-medium text-offwhite border border-line bg-[linear-gradient(160deg,var(--color-card),#10171f)]`}
              >
                <span className="check-ic">
                  <Check className="w-[14px] h-[14px]" />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3º BLOCO — prova social */}
      <section className="py-[72px] md:py-24">
        <div className="wrap text-center">
          <h2 className="section-title reveal mx-auto max-w-[26ch]">{copy.block3.title}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[820px] mx-auto mt-10 items-start">
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

          <div className="mt-10 reveal d2">
            <Cta variant="lg" href={DESTRAVE_CHECKOUT_URL}>
              {copy.block3.ctaLabel}
            </Cta>
          </div>
        </div>
      </section>

      {/* ÚLTIMO BLOCO — autor */}
      <section className="py-[72px] md:py-24">
        <div className="wrap">
          <div className="author-card reveal grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr]">
            <div className="author-photo relative min-h-[280px] lg:min-h-[380px] border-b lg:border-b-0 lg:border-r border-blue/20 overflow-hidden">
              <img src="/diego.jpeg" alt="Diego Mensor" className="absolute inset-0 w-full h-full object-cover object-top" />
            </div>

            <div className="self-center px-8 py-10 lg:px-[42px] lg:py-11">
              <span className="tag">Quem é Diego Mensor</span>
              <h3 className="font-display font-extrabold text-[clamp(20px,2.6vw,26px)] text-white mt-4 mb-3 leading-snug">
                {copy.authorBlock.title}
              </h3>
              <p className="text-[#d7e6f2] text-[clamp(15px,1.7vw,18px)] mb-6">{copy.authorBlock.paragraph}</p>
              <Cta variant="lg" href={DESTRAVE_CHECKOUT_URL}>
                {copy.authorBlock.ctaLabel}
              </Cta>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO FINAL — oferta */}
      <section className="py-[72px] md:py-24 text-center bg-[linear-gradient(180deg,transparent,rgba(1,57,97,.25))]">
        <div className="wrap">
          <span className="tag reveal">Oferta especial</span>
          <h2 className="reveal d1 font-display font-black text-[clamp(26px,3.6vw,42px)] mt-[18px] mb-[30px] mx-auto max-w-[26ch]">
            {copy.finalBlock.heading}
          </h2>

          <div className="final-card reveal d2 max-w-[520px] mx-auto text-center" data-glow>
            <span className="pointer-glow" aria-hidden="true" />
            <span className="limited mx-auto">⚡ Lote por tempo limitado</span>

            <div className="flex items-baseline justify-center gap-3 mt-2">
              <span className="font-mono text-[16px] text-muted">
                de <s className="[text-decoration-color:var(--color-brand-red)]">{copy.finalBlock.priceOld}</s>
              </span>
              <span className="font-mono text-[13px] text-muted">por</span>
            </div>
            <div className="price-main !text-[clamp(34px,6.4vw,58px)] mx-auto leading-none mt-1">
              {copy.finalBlock.priceNew}
            </div>
            <p className="text-muted text-[14px] mt-2 mb-7 max-w-[38ch] mx-auto">{copy.finalBlock.priceNote}</p>

            <div className="grid gap-[11px] max-w-sm mx-auto text-left mb-7">
              {copy.finalBlock.items.map((it, i) => (
                <div key={i} className="flex items-start gap-[11px] text-[15px] font-semibold text-offwhite">
                  <span className="price-feat-ck">
                    <Check className="w-[13px] h-[13px]" />
                  </span>
                  {it}
                </div>
              ))}
            </div>

            <Cta variant="wide" href={DESTRAVE_CHECKOUT_URL}>
              {copy.finalBlock.ctaLabel}
            </Cta>
            <DestravePriceBar label={copy.finalBlock.priceBarLabel} />
          </div>
        </div>
      </section>

      <DestraveFaq />
    </>
  );
}
