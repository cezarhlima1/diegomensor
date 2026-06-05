import Cta from "./Cta";

const denies = ["Sem chute de preço", "Sem copiar o concorrente", "Sem precificar cada dia um valor diferente"];

export default function Receive() {
  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        {/* mockup à esquerda */}
        <div className="reveal">
          <div className="laptop max-w-[520px]">
            <div className="screen">
              <div className="player">
                <div className="topbar">
                  <i />
                  <i />
                  <i />
                  <span>modulos / 7 aulas</span>
                </div>
                <div className="stage !place-items-stretch">
                  <div className="p-[18px] grid gap-[9px] content-center w-full">
                    <div className="font-mono text-[10px] text-blue tracking-[.1em] uppercase">
                      Conteúdo do treinamento
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg px-[11px] py-[9px] bg-blue/10 border border-blue/30">
                      <span className="font-mono text-blue text-xs">01</span>
                      <span className="text-xs text-white">Quanto custa manter a oficina</span>
                      <span className="ml-auto w-4 h-4 rounded-full bg-blue" />
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg px-[11px] py-[9px] bg-[rgba(143,178,204,.06)]">
                      <span className="font-mono text-muted text-xs">02</span>
                      <span className="text-xs text-offwhite">Aluguel pra você mesmo</span>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-lg px-[11px] py-[9px] bg-[rgba(143,178,204,.06)]">
                      <span className="font-mono text-muted text-xs">03</span>
                      <span className="text-xs text-offwhite">Precificando do jeito certo</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-dim text-center mt-0.5">
                      + 4 aulas práticas
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="base" />
          </div>
        </div>

        {/* texto à direita */}
        <div>
          <span className="tag reveal">Veja o que você vai receber</span>
          <h2 className="reveal d1 font-display font-extrabold text-[clamp(28px,3.6vw,44px)] my-4">
            Treinamento <span className="text-blue">Completo</span>
          </h2>
          <p className="lead reveal d2">
            São <b className="text-white">7 aulas</b> para descobrir{" "}
            <span className="text-blue font-bold">quanto sua oficina realmente precisa cobrar.</span>
          </p>

          <div className="grid gap-3 mt-7">
            {denies.map((text, i) => (
              <div
                key={i}
                className={`reveal d${i + 2} flex items-center gap-[13px] text-[clamp(15px,1.6vw,18px)] font-semibold text-offwhite`}
              >
                <span className="deny-x">✕</span>
                <s className="[text-decoration-color:rgba(240,88,76,.7)]">{text}</s>
              </div>
            ))}
          </div>

          <div className="reveal d4 mt-[30px]">
            <Cta href="#checkout" variant="lg">
              Quero acessar por R$197
            </Cta>
          </div>
        </div>
      </div>
    </section>
  );
}
