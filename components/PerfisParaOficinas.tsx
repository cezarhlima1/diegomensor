const profiles = [
  {
    title: "Dono de oficina que faz tudo sozinho",
    description: "e precisa finalmente saber quanto cobrar pela própria mão de obra.",
  },
  {
    title: "Oficina pequena, com poucos funcionários",
    description: "que já tem movimento, mas ainda define preço sem ter certeza se a conta está certa.",
  },
  {
    title: "Oficina com equipe e operação maior",
    description: "que fatura, vende todos os dias, mas quer revisar se mão de obra e peças estão sendo precificadas corretamente.",
  },
  {
    title: "Quem está começando uma oficina",
    description: "e quer definir os preços do jeito certo desde o início, em vez de copiar o que os outros cobram.",
  },
];

export default function PerfisParaOficinas() {
  return (
    <section className="relative isolate overflow-hidden py-[72px] md:py-24" aria-labelledby="perfis-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,rgba(4,149,240,.12),transparent_70%)]" />
      <div className="wrap">
        <div className="text-center">
          <span className="tag reveal">Para quem é</span>
          <h2 id="perfis-title" className="section-title reveal d1 mx-auto mt-5 max-w-[29ch]">
            Esse treinamento é para quem precisa <span className="text-blue">cobrar certo dentro da oficina.</span>
          </h2>
        </div>

        <ul className="mx-auto mt-12 grid max-w-[1100px] list-none gap-5 md:mt-16 md:grid-cols-2 md:gap-7">
          {profiles.map((profile, index) => (
            <li key={profile.title} className={`reveal d${(index % 2) + 1} relative rounded-[24px] border border-blue/20 bg-[linear-gradient(145deg,#142735,#0d151d)] p-7 shadow-[0_18px_48px_-24px_rgba(0,0,0,.65)] md:p-10`}>
              <span aria-hidden="true" className="mb-7 flex h-11 w-11 items-center justify-center rounded-full border border-blue/30 bg-blue/10 text-xl font-bold text-blue">✓</span>
              <h3 className="max-w-[25ch] font-display text-[clamp(24px,2.7vw,32px)] font-black leading-[1.2] text-offwhite">
                {profile.title}
              </h3>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-[1.8] text-[#b8c9d5] md:text-[16px]">
                {profile.description}
              </p>
            </li>
          ))}
        </ul>

        <div className="reveal mx-auto mt-10 max-w-[1100px] rounded-[24px] border border-blue/35 bg-blue/[.08] px-6 py-8 text-center md:mt-12 md:px-12 md:py-10">
          <p className="mx-auto max-w-[52ch] font-display text-[clamp(21px,2.7vw,30px)] font-bold leading-[1.45] text-offwhite">
            Não importa se tua oficina fatura <span className="text-blue">R$10mil ou R$150 mil:</span> se tu vende mão de obra e peças, precisa saber quanto cobrar.
          </p>
        </div>
      </div>
    </section>
  );
}
