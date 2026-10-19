import styles from "./perfis-para-oficinas.module.css";

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
      <div className="wrap">
        <div className="text-center">
          <span className="tag reveal">Para quem é</span>
          <h2 id="perfis-title" className="section-title reveal d1 mx-auto mt-5 max-w-[29ch]">
            Esse treinamento é para quem precisa <span className="text-blue">cobrar certo dentro da oficina.</span>
          </h2>
        </div>

        <ul className={styles.profiles}>
          {profiles.map((profile) => (
            <li key={profile.title} className={styles.profile}>
              <h3>
                {profile.title}
              </h3>
              <p>
                {profile.description}
              </p>
            </li>
          ))}
        </ul>

        <div className={styles.closing}>
          <p>
            Não importa se tua oficina fatura <span className="text-blue">R$10mil ou R$150 mil:</span> se tu vende mão de obra e peças, precisa saber quanto cobrar.
          </p>
        </div>
      </div>
    </section>
  );
}
