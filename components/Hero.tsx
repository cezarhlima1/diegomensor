import Cta from "./Cta";

export default function Hero() {
  return (
    <section data-hero className="relative overflow-hidden pt-[130px] pb-[90px] lg:pt-[150px]">
      {/* gradiente de fundo com parallax */}
      <div className="hero-bg" aria-hidden="true" />

      <div className="wrap max-w-[940px] text-center">
        <div className="flex flex-col items-center">
          <span className="hero-badge reveal">
            <span className="dot" />
            Precificação é o pilar principal da tua oficina
          </span>

          <h1 className="reveal d1 font-display font-black text-[clamp(34px,5.4vw,62px)] my-6 max-w-[22ch]">
            O erro silencioso que <span className="text-blue">suga o dinheiro</span> de todas as oficinas: precificar errado.
          </h1>

          <p className="reveal d2 max-w-[56ch] rounded-[16px] border border-blue/15 bg-blue/[.045] px-5 py-5 text-[clamp(16px,1.7vw,20px)] leading-[1.7] text-[#c8d7df] mb-[34px] md:px-7">
            Todos os dias, eu escuto donos de oficina me explicando como precificam e vai por mim: <strong className="text-white">tudo errado.</strong> E não é uma oficina, são todos os tamanhos de oficina, com equipe, sem equipe não importa. <strong className="text-blue">Esse erro pega todo mundo!</strong>
          </p>

          <div className="reveal d3 flex flex-col items-center gap-[14px]">
            <Cta variant="lg">
              Quero aprender a cobrar certo
            </Cta>
            <span className="reassure">
              Parcelável • <b>Acesso imediato</b> • Garantia 7 dias
            </span>
          </div>

          {/* mini-stats com count-up */}
          <div className="reveal d4 flex flex-wrap justify-center gap-7 mt-[38px]">
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

      </div>
    </section>
  );
}
