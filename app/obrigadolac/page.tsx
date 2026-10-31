import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import Footer from "@/components/Footer";
import ObrigadoDestrave from "@/components/ObrigadoDestrave";
import styles from "./obrigadolac.module.css";
import ClientEffects from "@/components/ClientEffects";

export const metadata: Metadata = {
  title: "Cadastro quase concluído — Operação: Oficina Organizada",
  description: "Responda à pesquisa rápida e entre no grupo oficial da Operação: Oficina Organizada.",
  robots: { index: false, follow: false },
};

export default function ObrigadoLacPage() {
  return (
    <div className={styles.page}>
      <FacebookPixel conversion="CompleteRegistration" />
      <main>
        <ObrigadoDestrave />
      </main>
      <Footer />
      <ClientEffects />
    </div>
  );
}
