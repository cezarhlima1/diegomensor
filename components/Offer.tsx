import Cta from "./Cta";
import { Check } from "./icons";

const realChecks = [
  "Quanto custa manter sua oficina aberta",
  "Quanto sua empresa realmente deveria cobrar",
  "Onde você pode estar deixando dinheiro na mesa",
];

const feats = ["Acesso imediato", "Acesso vitalício", "Aplique ainda hoje"];

export default function Offer() {
  return (
    <>
      {/* dobra 1: papo honesto */}
      <section className="py-[72px] md:py-24">
        <div className="wrap max-w-3xl mx-auto text-center">
          <span className="tag reveal">Na honestidade</span>
          <h2 className="reveal d1 font-display font-extrabold text-[clamp(28px,3.6vw,46px)] my-[18px] mx-auto max-w-[18ch]">
            Sem 15 bônus <span className="text-blue">que você nunca vai abrir.</span>
          </h2>

          <p className="reveal d2 text-muted text-[17px] mb-4">
            Na honestidade eu te falo sem problema nenhum: nós somos donos de oficina, ninguém aqui
            quer perder tempo com 15 bônus que nunca vai abrir. Queremos coisas simples, práticas e
            que funcionem na nossa realidade.
          </p>
          <p className="reveal d2 text-muted text-[17px] mb-6">
            Por isso eu não vou te encher de um monte de acesso inútil só pra fazer essa oferta
            parecer maior. Eu vou te entregar exatamente o que você precisa pra entender:
          </p>

          <div className="reveal d3 grid gap-[11px] max-w-md mx-auto text-left mb-6">
            {realChecks.map((c) => (
              <div
                key={c}
                className="flex items-center gap-[11px] text-[15px] font-semibold text-offwhite"
              >
                <span className="price-feat-ck">
                  <Check className="w-[13px] h-[13px]" />
                </span>
                {c}
              </div>
            ))}
          </div>

          <p className="reveal d3 text-muted text-[17px] mb-[22px]">
            Sem enrolação, com foco na vida real de oficina, como eu aplico aqui na minha!
          </p>

          <div className="anchor-line reveal d3 text-left">
            Existe uma <span className="text-blue">GRANDE chance</span> de uma única correção de
            preço já pagar esse treinamento.
          </div>
        </div>
      </section>

      {/* dobra 2: a oferta */}
      <section id="checkout" className="py-[72px] md:py-24">
        <div className="wrap max-w-2xl mx-auto text-center">
          <p className="reveal text-muted text-[17px] mb-2.5">
            No total, esse tipo de conhecimento poderia facilmente custar{" "}
            <s className="[text-decoration-color:var(--color-brand-red)]">R$497,00</s>.
          </p>
          <p className="reveal d1 text-offwhite text-[19px] leading-snug mb-9 max-w-[36ch] mx-auto">
            Mas hoje você vai ter acesso ao{" "}
            <b className="text-white">Treinamento Precificação Para Oficinas</b> por apenas…
          </p>

          <div className="price-card reveal d2 text-center" data-glow>
            <span className="pointer-glow" />
            <span className="limited mx-auto">⚡ Condição especial por tempo limitado</span>

            <div className="font-mono text-xs tracking-[.2em] text-muted uppercase">Por apenas</div>
            <div className="price-main !text-[clamp(32px,7vw,64px)] mx-auto">12x de R$19,70</div>
            <div className="font-mono text-offwhite text-[16px] mb-6">
              ou <b className="text-white">R$197</b> à vista
            </div>

            <div className="grid gap-[11px] max-w-xs mx-auto text-left mb-6">
              {feats.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-[11px] text-[15px] font-semibold text-offwhite"
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
