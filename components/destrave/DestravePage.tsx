import Cta from "@/components/Cta";
import { Check, Lock } from "@/components/icons";
import { DESTRAVE_CHECKOUT_URL } from "@/lib/links";
import DestravePriceBar from "./DestravePriceBar";
import DestraveTicket from "./DestraveTicket";
import DestraveFaq from "./DestraveFaq";
import DestraveChainMotif from "./DestraveChainMotif";
import DestraveGiantWord from "./DestraveGiantWord";
import type { DestraveCopy } from "./types";

const testimonials = [
  { src: "/depoimentocaptura1.png", alt: "Depoimento de participante da imersão", caption: "resultado real no grupo" },
  { src: "/depoimentocaptura2.png", alt: "Depoimento de participante da imersão", caption: "relato após aplicar o método" },
];

const tickerText = "IMERSÃO ONLINE | AO VIVO | 01 DE AGOSTO |";
const tickerLine = `${tickerText} ${tickerText} ${tickerText} `;

function renderHighlightedText(text: string, highlightedWords?: string[]) {
  if (!highlightedWords?.length) return text;

  const escapedWords = highlightedWords.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`(${escapedWords.join("|")})`, "g");
  return text.split(pattern).map((part, index) =>
    highlightedWords.includes(part) ? (
      <span key={index} className="text-[#0495F0]">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function DestravePage({ copy }: { copy: DestraveCopy }) {
  return (
    <div className="destrave-theme">
      {/* 1º BLOCO — herói */}
      <section
        data-hero
        className={`relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-20 ${copy.heroBackgroundImage ? "destrave-hero--with-cover" : ""}`}
      >
        <div className="hero-bg" aria-hidden="true" />
        <DestraveGiantWord word="OFICINA" className="-left-6 -bottom-[6%] hidden md:block" />
        {!copy.heroTitle && (
          <DestraveChainMotif className="dest-chain-motif pointer-events-none absolute -top-2 right-[-40px] w-[420px] max-w-none opacity-[.35] rotate-[-4deg] hidden sm:block" />
        )}
        <div
          className={`wrap grid grid-cols-1 items-center ${
            copy.heroTitle ? "" : "lg:grid-cols-[1.15fr_.85fr] gap-14"
          }`}
        >
          <div>
            <span className="hero-badge reveal">
              <Lock className="w-[13px] h-[13px]" />
              {copy.eventLine}
            </span>

            {copy.heroTitle ? (
              <>
                <h1 className="reveal d1 font-display font-black text-[clamp(42px,5.8vw,66px)] leading-[.98] tracking-[-.03em] text-balance mt-7 mb-5 max-w-[20ch]">
                  {copy.heroTitle}
                </h1>
                <p className="reveal d2 font-display font-semibold text-[clamp(20px,2.4vw,28px)] leading-[1.28] text-offwhite text-balance mb-8 max-w-[34ch]">
                  {copy.headline.map((seg, i) =>
                    seg.blue ? (
                      <span key={i} className="text-dest-accent">
                        {seg.text}
                      </span>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )}
                </p>
              </>
            ) : (
              <h1 className="reveal d1 font-display font-black text-[clamp(30px,4.6vw,52px)] my-6 max-w-[18ch]">
                {copy.headline.map((seg, i) =>
                  seg.blue ? (
                    <span key={i} className="text-dest-accent">
                      {seg.text}
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </h1>
            )}

            <div
              className={`reveal d2 text-left mb-8 ${
                copy.heroTitle
                  ? "max-w-[34rem] border-t border-white/25 pt-5"
                  : "max-w-[520px]"
              }`}
            >
              <p className="lead mb-4">{copy.bulletsIntro}</p>

              <ul className="grid gap-3 list-none">
                {copy.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15.5px] leading-[1.38] font-medium text-offwhite">
                    <span className="check-ic">
                      <Check className="w-[14px] h-[14px]" />
                    </span>
                    {typeof b === "string" ? (
                      b
                    ) : (
                      <span>
                        {b.firstLine}
                        <br className="hidden md:block" /> {b.secondLine}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="reveal d3 flex flex-col items-start">
              <Cta variant="lg" href={DESTRAVE_CHECKOUT_URL}>
                {copy.ctaLabel}
              </Cta>
              <DestravePriceBar label={copy.priceBarLabel} align="left" />
            </div>
          </div>

          {!copy.heroTitle && (
            <DestraveTicket
              eventLine={copy.eventLine}
              priceOld={copy.finalBlock.priceOld}
              priceNew={copy.finalBlock.priceNew}
            />
          )}
        </div>
      </section>

      {copy.heroTitle && (
        <section className="destrave-ticker" aria-label={tickerText}>
          <div className="destrave-ticker__track" aria-hidden="true">
            <div className="destrave-ticker__group">{tickerLine}</div>
            <div className="destrave-ticker__group">{tickerLine}</div>
          </div>
        </section>
      )}

      {/* 2º BLOCO */}
      <section className={`py-[72px] md:py-24 ${copy.heroTitle ? "destrave-block2--lp1" : ""}`}>
        <div className="wrap text-center max-w-[760px]">
          <h2 className="section-title reveal mx-auto">
            {renderHighlightedText(copy.block2.title, copy.block2.highlightedWords)}
          </h2>
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
      <section className={`py-[72px] md:py-24 ${copy.block3.subtitle ? "destrave-block3--lp1" : ""}`}>
        <div className="wrap text-center">
          <h2
            className={
              copy.block3.subtitle
                ? "reveal mx-auto max-w-[20ch] font-display font-black text-[clamp(36px,5.2vw,60px)] leading-[.98] tracking-[-.03em]"
                : "section-title reveal mx-auto max-w-[26ch]"
            }
          >
            {copy.block3.title}
          </h2>
          {copy.block3.subtitle && (
            <p className="reveal d1 mx-auto mt-5 max-w-[34ch] font-display font-light text-[clamp(18px,2.2vw,25px)] leading-[1.3] text-offwhite">
              {copy.block3.subtitle}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[820px] mx-auto mt-10 items-start">
            {testimonials.map((t, i) => (
              <figure key={i} className={`testi reveal d${i + 1} !p-0 overflow-hidden`}>
                <div className="dest-photo overflow-hidden">
                  <img src={t.src} alt={t.alt} className="block w-full h-auto" />
                </div>
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
            <div className="author-photo dest-photo relative min-h-[280px] lg:min-h-[380px] border-b lg:border-b-0 lg:border-r border-blue/20 overflow-hidden">
              <img src="/diego.jpeg" alt="Diego Mensor" className="absolute inset-0 w-full h-full object-cover object-top" />
            </div>

            <div className="self-center px-8 py-10 lg:px-[42px] lg:py-11">
              <span className="tag">Quem é Diego Mensor</span>
              <h3
                className={`font-display text-white mt-4 leading-[1.04] ${
                  copy.authorBlock.subtitle
                    ? "font-black text-[clamp(28px,3.4vw,38px)] tracking-[-.03em] mb-4"
                    : "font-extrabold text-[clamp(20px,2.6vw,26px)] mb-3 leading-snug"
                }`}
              >
                {copy.authorBlock.title}
              </h3>
              {copy.authorBlock.subtitle ? (
                <>
                  <p className="font-display font-light text-[clamp(18px,2vw,23px)] leading-[1.3] text-offwhite mb-6">
                    {copy.authorBlock.subtitle}
                  </p>
                  <div className="grid gap-4 text-[#d7e6f2] text-[clamp(15px,1.7vw,18px)] leading-relaxed mb-6">
                    {copy.authorBlock.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                </>
              ) : (
                <p className="text-[#d7e6f2] text-[clamp(15px,1.7vw,18px)] mb-6">{copy.authorBlock.paragraph}</p>
              )}
              <Cta variant="lg" href={DESTRAVE_CHECKOUT_URL}>
                {copy.authorBlock.ctaLabel}
              </Cta>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO FINAL — oferta */}
      <section className="relative overflow-hidden py-[72px] md:py-24 text-center bg-[linear-gradient(180deg,transparent,rgba(10,27,38,.5))]">
        <DestraveGiantWord word="DESTRAVE" className="left-1/2 -translate-x-1/2 -bottom-[10%] hidden md:block" />
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
    </div>
  );
}
