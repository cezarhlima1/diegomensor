import styles from "./materiais-para-oficinas.module.css";

const materials = [
  {
    image: "/material-aulas.jpg",
    alt: "Aula de precificação com Diego Mensor dentro da oficina",
    title: "Aulas rápidas diretas ao ponto",
    description: "Entenda de forma simples o que precisa considerar na hora de precificar e o porquê de cada cálculo.",
  },
  {
    image: "/previa-mao-de-obra.jpg",
    alt: "Planilha de cálculo de mão de obra",
    title: "Planilha de cálculo de mão de obra",
    description: "Faça os cálculos da tua oficina na prática e saiba quanto precisa cobrar.",
  },
  {
    image: "/previa-markup.jpg",
    alt: "Planilha de cálculo de markup para peças",
    title: "Planilha de cálculo de markup para peças",
    description: "Tenha a planilha para calcular e nunca mais errar o markup das peças.",
  },
  {
    image: "/material-checklist.jpg",
    alt: "Checklist de manutenção preventiva incluído na aula bônus",
    title: "Aula bônus de checklist",
    description: "Aprenda a implementar o checklist na tua oficina para conferir se a precificação está sendo feita corretamente.",
  },
];

export default function MateriaisParaOficinas() {
  return (
    <section className={styles.section} aria-labelledby="materiais-title">
      <div className="wrap">
        <h2 id="materiais-title" className="section-title mx-auto max-w-[30ch] text-center">
          Dentro do precificação para oficinas, <span className="text-blue">você vai acessar:</span>
        </h2>
        <div className={styles.grid}>
          {materials.map((material) => (
            <article key={material.title} className={styles.item}>
              <div className={styles.image}>
                <img src={material.image} alt={material.alt} loading="lazy" />
              </div>
              <div className={styles.copy}>
                <h3>{material.title}</h3>
                <p>{material.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
