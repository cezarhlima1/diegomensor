import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import ComboContent from "./_components/ComboContent";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import BackRedirect from "@/components/BackRedirect";
import OfertaLimitadaParaOficinas from "@/components/OfertaLimitadaParaOficinas";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Calculadora de Precificação + Treinamento para Oficinas | Diego Mensor",
  description: "Aprenda a ajustar a precificação em 40 minutos e tenha 12 meses de acesso à calculadora para montar e acompanhar os orçamentos da tua oficina. Combo completo por R$597.",
};

export default function PrecificacaoParaOficinasPage() {
  return (
    <div className={styles.page}>
      <FacebookPixel />
      <ClarityScript projectId="xbomd0cmow" />
      <OfertaLimitadaParaOficinas />
      <main>
        <ComboContent />
      </main>
      <Footer />
      <ClientEffects />
      <BackRedirect />
    </div>
  );
}
