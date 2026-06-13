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
          <div className="font-display font-black text-[clamp(22px,3vw,30px)] text-white">
            <span className="text-blue">12x de R$19,70</span> ou R$197 à vista
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
