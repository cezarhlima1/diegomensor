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
            Quanto dinheiro você já perdeu só porque{" "}
            <span className="text-blue">cobrou errado?</span>
          </h1>

          <p className="reveal d2 text-muted text-[clamp(16px,1.7vw,20px)] max-w-[46ch] mb-[34px]">
            Todos os dias, donos de oficina deixam dinheiro na mesa sem perceber. Neste
            treinamento, você aprende a formar preços com segurança, proteger sua margem e{" "}
            <b className="text-offwhite">transformar cada serviço em lucro de verdade.</b>
          </p>

          <div className="reveal d3 flex flex-col items-start gap-[14px]">
            <Cta variant="lg">
              Quero aprender a cobrar certo
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
            <div className="screen" style={{ aspectRatio: "auto" }}>
              <div className="player">
                <div className="topbar">
                  <i />
                  <i />
                  <i />
                  <span>plataforma-do-treinamento</span>
                </div>
                <img
                  src="/capa.jpeg"
                  alt="Aula dentro da plataforma do treinamento"
                  className="block w-full h-auto"
                />
              </div>
            </div>
            <div className="base" />
          </div>
        </div>
      </div>
    </section>
  );
}
