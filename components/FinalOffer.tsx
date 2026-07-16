import Cta from "./Cta";

export default function FinalOffer() {
  return (
    <section className="py-[72px] md:py-24 text-center bg-[linear-gradient(180deg,transparent,rgba(1,57,97,.25))]">
      <div className="wrap">
        <span className="tag reveal">Oferta especial</span>
        <h2 className="reveal d1 font-display font-black text-[clamp(28px,4vw,48px)] mt-[18px] mb-[30px] mx-auto max-w-[22ch]">
          Deixe de tentar resolver erro de precificação trabalhando mais.{" "}
          <span className="text-blue">Comece entendendo os números da sua oficina.</span>
        </h2>

        <div className="final-card reveal d2 max-w-[680px] mx-auto">
          <div className="text-white">
            <div className="font-display text-[clamp(18px,2.5vw,24px)]">
              de <s className="[text-decoration-color:var(--color-brand-red)] text-muted font-medium">R$497</s>{" "}
              <span className="text-muted font-medium">por</span>
            </div>
            <div className="font-display font-black text-[clamp(26px,5vw,40px)] text-offwhite leading-none mt-2">
              R$197
            </div>
            <div className="font-mono text-[13px] text-muted tracking-[.1em] uppercase mt-1">
              à vista
            </div>
            <div className="font-mono text-[13px] text-muted uppercase mt-3">ou</div>
            <div className="price-main !text-[clamp(36px,7vw,68px)] mx-auto leading-none mt-1">
              12x de R$20,25
            </div>
            <small className="block font-mono font-medium text-[13px] text-muted tracking-[.06em] uppercase mt-2">
              Acesso imediato + vitalício
            </small>
          </div>
          <div className="mt-[26px]">
            <Cta variant="wide">
              Quero acessar agora
            </Cta>
          </div>
        </div>
      </div>
    </section>
  );
}
