import Cta from "./Cta";
import { Check } from "./icons";

const realChecks = [
  "Uma aula completa de como implementar um checklist do começo ao fim, de um jeito que vai impactar no teu faturamento.",
  "Ferramentas para usar dentro da oficina: planilha de custo de mão de obra e tabela de markup que eu aplico aqui na minha oficina.",
];

const feats = [
  "Aulas rápidas e práticas para aplicar no mesmo dia",
  "Material complementar para implementação",
  "Garantia de 7 dias",
  "Tire o dinheiro desse treinamento nos 3 primeiros ajustes de preço",
];

export default function Offer() {
  return (
    <>
      {/* dobra 1: bônus */}
      <section className="py-[72px] md:py-24">
        <div className="wrap max-w-3xl mx-auto text-center">
          <span className="tag reveal">Bônus prático</span>
          <h2 className="reveal d1 font-display font-extrabold text-[clamp(28px,3.6vw,46px)] my-[18px] mx-auto max-w-[18ch]">
            Só o bônus já <span className="text-blue">vale o preço:</span>
          </h2>

          <div className="reveal d2 grid gap-[14px] max-w-2xl mx-auto text-left mt-8">
            {realChecks.map((c) => (
              <div
                key={c}
                className="flex items-start gap-[12px] rounded-[14px] border border-line bg-card/70 px-5 py-5 text-[16px] leading-relaxed font-semibold text-offwhite"
              >
                <span className="price-feat-ck">
                  <Check className="w-[13px] h-[13px]" />
                </span>
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* dobra 2: a oferta */}
      <section id="checkout" className="checkout-light py-[72px] md:py-24">
        <div className="wrap max-w-2xl mx-auto text-center">
          <p className="reveal d1 text-[#24455c] text-[19px] leading-snug mb-9 max-w-[36ch] mx-auto">
            Hoje você vai ter acesso ao{" "}
            <b className="text-navy">Treinamento Precificação Para Oficinas</b> por apenas…
          </p>

          <div className="price-card reveal d2 text-center" data-glow>
            <span className="pointer-glow" />
            <span className="limited mx-auto">⚡ Condição especial por tempo limitado</span>

            <div className="flex items-baseline justify-center gap-3 mt-3">
              <span className="font-mono text-[18px] text-muted">
                de <s className="[text-decoration-color:var(--color-brand-red)]">R$497</s>
              </span>
              <span className="font-mono text-[14px] text-muted">por</span>
            </div>
            <div className="font-display font-black text-[clamp(26px,5vw,40px)] text-navy leading-none mt-2">
              R$197
            </div>
            <div className="font-mono text-muted text-[13px] tracking-[.1em] uppercase mt-1">
              à vista
            </div>
            <div className="font-mono text-muted text-[13px] uppercase mt-3">ou</div>
            <div className="price-main !text-[clamp(36px,7vw,68px)] mx-auto leading-none mt-1 mb-6">
              12x de R$20,25
            </div>

            <div className="grid gap-[11px] max-w-xs mx-auto text-left mb-6">
              {feats.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-[11px] text-[15px] font-semibold text-[#173b54]"
                >
                  <span className="price-feat-ck">
                    <Check className="w-[13px] h-[13px]" />
                  </span>
                  {f}
                </div>
              ))}
            </div>

            <Cta variant="wide">
              Quero acessar agora
            </Cta>

            <div className="font-mono text-[11.5px] text-muted text-center mt-4 tracking-[.03em]">
              Condição especial por tempo limitado • Acesso imediato + vitalício
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
