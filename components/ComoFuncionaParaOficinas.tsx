import styles from "./como-funciona-para-oficinas.module.css";

const steps = [
  {
    title: "Assista às aulas",
    description: "Entenda o que precisa ser ajustado na precificação da tua oficina.",
  },
  {
    title: "Preencha as planilhas",
    description: "Coloque os números da tua própria oficina e faça os cálculos.",
  },
  {
    title: "Corrija tua precificação",
    description: "Veja quanto precisa cobrar e comece a aplicar nos próximos orçamentos.",
  },
];

export default function ComoFuncionaParaOficinas() {
  return (
    <section aria-labelledby="como-funciona-title" className="py-[72px] md:py-24">
      <div className="wrap">
        <h2 id="como-funciona-title" className="section-title mx-auto text-center">
          Como funciona <span className="text-blue">(sem complicar):</span>
        </h2>
        <ol className={styles.sequence}>
          {steps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.content}>
              <h3 className="font-display text-[20px] font-bold uppercase leading-[1.5]">
                {step.title}
              </h3>
              <p className="mt-4 text-[16px] leading-[1.8] text-[#b8c9d5]">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
