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
                <img
                  src="/notebook2.jpeg"
                  alt="Módulos do treinamento dentro da plataforma"
                  className="flex-1 min-h-0 w-full object-cover object-top"
                />
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
