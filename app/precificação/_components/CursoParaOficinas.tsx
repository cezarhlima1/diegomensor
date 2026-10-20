import SectionCta from "./SectionCta";
import styles from "./curso-para-oficinas.module.css";

const images = [
  { n: 6, src: "/precificacao/curso-aula-oficina.jpg", alt: "Diego Mensor ensinando precificação dentro da oficina", featured: true },
  { n: 1, src: "/precificacao/curso-primeiro-passo.jpg", alt: "Aula: primeiro passo da precificação" },
  { n: 3, src: "/precificacao/curso-custo-oficina.jpg", alt: "Aula: quanto custa sua oficina aberta?" },
  { n: 2, src: "/precificacao/curso-precificando.jpg", alt: "Aula: precificando de forma correta" },
  { n: 8, src: "/precificacao/previa-mao-de-obra.jpg", alt: "Planilha de custo operacional e cálculo do valor da mão de obra", featured: true },
  { n: 4, src: "/precificacao/curso-cobrar-certo.jpg", alt: "Aula: a importância de cobrar certo" },
  { n: 14, src: "/precificacao/material-apostila.jpg", alt: "Apostila de precificação para oficinas" },
];

export default function CursoParaOficinas() {
  return (
    <section className="relative overflow-hidden py-[72px] md:py-24" aria-labelledby="curso-title">
      <div className="wrap">
        <h2 id="curso-title" className="section-title reveal mx-auto max-w-[38ch] text-center">
          Você vai acessar imediatamente, <span className="text-blue">aulas curtas e objetivas</span> e o material necessário pra resolver essa bagaça de precificação ainda hoje.
        </h2>
        <div className={`${styles.collage} mt-12 md:mt-16`}>
          {images.map((image, index) => (
            <figure key={image.n} className={`${styles.frame} ${image.featured ? styles.featured : ""} reveal d${(index % 3) + 1}`}>
              <img src={image.src} alt={image.alt} loading="lazy" className="block h-auto w-full" />
            </figure>
          ))}
        </div>
        <SectionCta />
      </div>
    </section>
  );
}
