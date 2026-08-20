import type { Metadata } from "next";
import styles from "./up.module.css";

export const metadata: Metadata = {
  title: "Condição exclusiva | Calculadora de Precificação",
  description: "Adicione a Calculadora de Precificação ao seu treinamento.",
  robots: { index: false, follow: false },
};

// Substitua pelos links definitivos quando os vídeos e o checkout estiverem prontos.
const VSL_URL = "";

function VideoFrame({ url, label }: { url: string; label: string }) {
  return (
    <div className={styles.videoFrame}>
      {url ? (
        <iframe
          src={url}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className={styles.videoPlaceholder}>
          <span className={styles.play} aria-hidden="true">▶</span>
          <strong>{label}</strong>
          <small>O vídeo será inserido aqui</small>
        </div>
      )}
    </div>
  );
}

export default function UpsellPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.warningBar}>Não fecha essa página ainda pra não PERDER!</div>

      <section className={styles.hero}>
        <div className={styles.wrap}>
          <p className={styles.exclusive}>Você acaba de liberar uma condição exclusiva</p>
          <h1>Depois que você fizer o primeiro orçamento com essa ferramenta, vai ser difícil entender como conseguiu trabalhar tanto tempo sem ela.</h1>
          <p className={styles.promise}>Gravei um vídeo pra te explicar como usar ela pra agilizar e padronizar teus orçamentos.</p>
          <VideoFrame url={VSL_URL} label="Apresentação da Calculadora de Precificação" />
        </div>
      </section>

    </main>
  );
}
