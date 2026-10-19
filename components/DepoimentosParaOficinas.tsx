import Cta from "./Cta";
import styles from "./depoimentos-para-oficinas.module.css";

const cases = [
  {
    images: [
      { src: "/Depoimento01.png", alt: "Resultado da oficina antes de ajustar a precificação", label: "Antes" },
      { src: "/Depoimento02.png", alt: "Resultado da oficina depois de ajustar a precificação", label: "Depois" },
    ],
    text: "Os mesmos 33 carros. Só que agora, cobrando corretamente por cada serviço.",
  },
  {
    images: [{ src: "/depoimentocaptura2.png", alt: "Depoimento sobre o aumento de faturamento após os ajustes de precificação", label: "" }],
    text: "O faturamento praticamente dobrou depois dos ajustes de precificação dentro da oficina.",
  },
  {
    images: [{ src: "/Depoimento 003.PNG", alt: "Depoimento sobre a meta de R$100 mil batida antes do fim do mês", label: "" }],
    text: "Mais um mês acima dos R$100 mil, com a meta batida antes do último dia, depois de ajustar a precificação.",
  },
  {
    images: [{ src: "/Depoimento 002.png", alt: "Depoimento sobre o melhor mês desde a abertura da oficina", label: "" }],
    text: "O ajuste de precificação faz isso: o melhor mês desde que abriram a oficina!",
  },
];

export default function DepoimentosParaOficinas() {
  return (
    <section className="py-[72px] md:py-24" aria-labelledby="depoimentos-title">
      <div className="wrap">
        <h2 id="depoimentos-title" className="section-title reveal mx-auto text-center max-w-[30ch]">
          Isso aqui é o que acontece quando você aprende a <span className="text-blue">precificar corretamente:</span>
        </h2>

        <div className={styles.cases}>
          {cases.map((item) => (
            <article key={item.text} className={styles.card}>
              <div className={styles.evidence}>
                <div className={styles.prints}>
                  {item.images.map((image) => (
                    <figure key={image.src} className={styles.print}>
                      {image.label && (
                        <figcaption className={styles.label}>
                          {image.label}
                        </figcaption>
                      )}
                      <a href={image.src} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar: ${image.alt}`} className={styles.imageLink}>
                        <img src={image.src} alt={image.alt} loading="lazy" />
                      </a>
                    </figure>
                  ))}
                </div>
                <span className={styles.hint}>Abra o print para ver em tamanho original.</span>
              </div>
              <p className={styles.narrative}>
                {item.text}
              </p>
            </article>
          ))}
        </div>

        <div className="reveal mt-12 text-center md:mt-16">
          <Cta variant="lg">Quero aprender a cobrar certo</Cta>
        </div>
      </div>
    </section>
  );
}
