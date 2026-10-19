import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import HeroParaOficinas from "@/components/HeroParaOficinas";
import DepoimentosParaOficinas from "@/components/DepoimentosParaOficinas";
import CursoParaOficinas from "@/components/CursoParaOficinas";
import DuvidasParaOficinas from "@/components/DuvidasParaOficinas";
import ComoFuncionaParaOficinas from "@/components/ComoFuncionaParaOficinas";
import PerfisParaOficinas from "@/components/PerfisParaOficinas";
import MateriaisParaOficinas from "@/components/MateriaisParaOficinas";
import OfertaParaOficinas from "@/components/OfertaParaOficinas";
import Author from "@/components/Author";
import Faq from "@/components/Faq";
import Guarantee from "@/components/Guarantee";
import WhatsAppParaOficinas from "@/components/WhatsAppParaOficinas";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import BackRedirect from "@/components/BackRedirect";
import OfertaLimitadaParaOficinas from "@/components/OfertaLimitadaParaOficinas";
import styles from "./page.module.css";

export default function PrecificacaoParaOficinasPage() {
  return (
    <div className={styles.page}>
      <FacebookPixel />
      <ClarityScript projectId="xbomd0cmow" />
      <OfertaLimitadaParaOficinas />
      <main>
        <HeroParaOficinas />
        <DepoimentosParaOficinas />
        <CursoParaOficinas />
        <DuvidasParaOficinas />
        <ComoFuncionaParaOficinas />
        <MateriaisParaOficinas />
        <OfertaParaOficinas />
        <PerfisParaOficinas />
        <Author />
        <Faq />
        <Guarantee />
        <WhatsAppParaOficinas />
      </main>
      <Footer />
      <ClientEffects />
      <BackRedirect />
    </div>
  );
}
