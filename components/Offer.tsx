import Cta from "./Cta";
import { Check } from "./icons";

const feats = ["Acesso imediato", "Acesso vitalício", "Aplique ainda hoje"];

export default function Offer() {
  return (
    <section id="checkout" className="py-[72px] md:py-24">
      <div className="wrap grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        {/* esquerda: papo honesto */}
        <div>
          <span className="tag reveal">Na honestidade</span>
          <h2 className="reveal d1 font-display font-extrabold text-[clamp(28px,3.6vw,46px)] my-[18px] max-w-[16ch]">
            Sem 15 bônus <span className="text-blue">que você nunca vai abrir.</span>
          </h2>
          <p className="reveal d2 text-muted text-[17px] mb-[22px]">
            Nós somos donos de oficina. A gente quer coisa simples, prática e que funcione na nossa
            realidade. Vou te entregar exatamente o que você precisa pra entender quanto custa manter
            sua oficina, quanto deveria cobrar e onde você está deixando dinheiro na mesa.
          </p>
          <div className="anchor-line reveal d3">
            Existe uma <span className="text-blue">GRANDE chance</span> de uma única correção de
            preço já pagar esse treinamento.
          </div>
        </div>

        {/* direita: card de preço */}
        <div className="price-card reveal d2" data-glow>
          <span className="pointer-glow" />
          <span className="limited">⚡ Condição especial por tempo limitado</span>
          <div className="font-mono text-sm text-muted">
            Esse conhecimento poderia custar{" "}
            <s className="[text-decoration-color:var(--color-brand-red)]">R$497</s>
          </div>
          <h3 className="text-[23px] font-extrabold my-1.5 mb-5 leading-tight">
            Treinamento Precificação Para Oficinas
          </h3>

          <div className="grid gap-[11px] mb-6">
            {feats.map((f) => (
              <div key={f} className="flex items-center gap-[11px] text-[15px] font-semibold text-offwhite">
                <span className="price-feat-ck">
                  <Check className="w-[13px] h-[13px]" />
                </span>
                {f}
              </div>
            ))}
          </div>

          <div className="font-mono text-xs tracking-[.2em] text-muted uppercase">Por apenas</div>
          <div className="price-main">12x de R$19,70</div>
          <div className="font-mono text-offwhite text-[15px] mb-5">
            ou <b className="text-white">R$197</b> à vista
          </div>

          <Cta href="#" variant="wide">
            Quero acessar agora
          </Cta>

          <div className="font-mono text-[11.5px] text-muted text-center mt-4 tracking-[.03em]">
            Condição especial por tempo limitado • Acesso imediato + vitalício
          </div>
        </div>
      </div>
    </section>
  );
}
