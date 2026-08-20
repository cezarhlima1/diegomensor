import type { Metadata } from "next";
import UpsellVturbPlayer from "@/components/UpsellVturbPlayer";
import styles from "./up.module.css";

export const metadata: Metadata = {
  title: "Condição exclusiva | Calculadora de Precificação",
  description: "Adicione a Calculadora de Precificação ao seu treinamento.",
  robots: { index: false, follow: false },
};

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
          <div className={styles.videoFrame}>
            <UpsellVturbPlayer />
          </div>
        </div>
      </section>

    </main>
  );
}
