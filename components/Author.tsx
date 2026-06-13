export default function Author() {
  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap">
        <div className="author-card reveal grid grid-cols-1 lg:grid-cols-[.85fr_1.15fr]">
          {/* foto do Diego */}
          <div className="author-photo relative min-h-[280px] lg:min-h-[380px] border-b lg:border-b-0 lg:border-r border-blue/20 overflow-hidden">
            <img
              src="/diego.jpeg"
              alt="Diego Mensor"
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          </div>

          {/* texto */}
          <div className="self-center px-8 py-10 lg:px-[42px] lg:py-11">
            <span className="tag">Quem é Diego Mensor</span>
            <p className="text-[#d7e6f2] text-[clamp(15px,1.7vw,18px)] my-5 mb-[22px]">
              Com <span className="text-blue font-bold">24 anos dentro da oficina</span> e 14 anos
              como proprietário, eu sei o que é trabalhar pra caramba, faturar… e ainda sentir que o
              dinheiro não acompanha o esforço. A gente aprendeu a consertar carro, mas poucos donos
              aprenderam quanto custa operar uma empresa. Por isso criei o{" "}
              <span className="text-blue font-bold">Precificação para Oficinas</span>. Isso não é
              teoria bonita. É oficina na vida real.
            </p>
            <div className="font-display font-black text-[26px] text-white mt-1">Diego Mensor</div>
            <div className="font-mono text-blue font-bold tracking-[.04em]">@diegomensor</div>
          </div>
        </div>
      </div>
    </section>
  );
}
