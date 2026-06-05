import Cta from "./Cta";

export default function Hero() {
  return (
    <section data-hero className="relative overflow-hidden pt-[130px] pb-[90px] lg:pt-[150px]">
      {/* gradiente azul à direita (espaço para a foto do Diego) — com parallax */}
      <div className="hero-bg" aria-hidden="true" />

      <div className="wrap grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        {/* coluna texto */}
        <div>
          <span className="hero-badge reveal">
            <span className="dot" />
            Acesso imediato • Vitalício • Oferta especial
          </span>

          <h1 className="reveal d1 font-display font-black text-[clamp(34px,5.4vw,62px)] my-6 max-w-[16ch]">
            Pare de trabalhar muito… e comece a ver{" "}
            <span className="text-blue">mais dinheiro sobrando</span> na oficina.
          </h1>

          <p className="reveal d2 text-muted text-[clamp(16px,1.7vw,20px)] max-w-[46ch] mb-[34px]">
            Você conserta carro como ninguém — mas nunca te ensinaram quanto custa{" "}
            <b className="text-offwhite">manter a oficina aberta</b> nem quanto você deveria
            cobrar. É exatamente isso que muda aqui.
          </p>

          <div className="reveal d3 flex flex-col items-start gap-[14px]">
            <Cta href="#checkout" variant="lg">
              Quero acessar por R$197
            </Cta>
            <span className="reassure">
              Parcelável • <b>Acesso imediato</b> • Garantia 7 dias
            </span>
          </div>

          {/* mini-stats com count-up */}
          <div className="reveal d4 flex flex-wrap gap-7 mt-[38px]">
            <div>
              <div className="stat-n">
                <span data-count="7">0</span>
              </div>
              <div className="text-[12.5px] text-muted">passos práticos</div>
            </div>
            <span className="w-px bg-line" />
            <div>
              <div className="stat-n">
                <span data-count="24">0</span>
                <small className="text-[14px] text-muted"> anos</small>
              </div>
              <div className="text-[12.5px] text-muted">de oficina na vida real</div>
            </div>
            <span className="w-px bg-line" />
            <div>
              <div className="stat-n">∞</div>
              <div className="text-[12.5px] text-muted">acesso vitalício</div>
            </div>
          </div>
        </div>

        {/* coluna visual: mockup de notebook (placeholder de imagem) */}
        <div className="reveal d3 relative">
          <div className="laptop max-w-[520px] mx-auto lg:mr-0 lg:ml-auto">
            <div className="screen">
              <div className="player">
                <div className="topbar">
                  <i />
                  <i />
                  <i />
                  <span>treinamento-precificacao.mp4</span>
                </div>
                <div className="stage">
                  <div className="play-btn" aria-label="Reproduzir aula" />
                  <div className="meta">
                    <div className="ep">Aula 01 de 07</div>
                    <div className="title">Quanto custa manter sua oficina aberta?</div>
                    <div className="progress">
                      <i />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="base" />
          </div>

          {/* etiqueta de preço flutuante */}
          <div className="float-price">
            <div className="k">12x de</div>
            <div className="v">R$19,70</div>
          </div>
        </div>
      </div>
    </section>
  );
}
