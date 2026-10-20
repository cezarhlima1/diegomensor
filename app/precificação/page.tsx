// Versão independente: componentes, estilos e imagens próprios desta rota.
import FacebookPixel from "./_components/FacebookPixel";
import ClarityScript from "./_components/ClarityScript";
import HeroParaOficinas from "./_components/HeroParaOficinas";
import DepoimentosParaOficinas from "./_components/DepoimentosParaOficinas";
import CursoParaOficinas from "./_components/CursoParaOficinas";
import DuvidasParaOficinas from "./_components/DuvidasParaOficinas";
import ComoFuncionaParaOficinas from "./_components/ComoFuncionaParaOficinas";
import PerfisParaOficinas from "./_components/PerfisParaOficinas";
import MateriaisParaOficinas from "./_components/MateriaisParaOficinas";
import OfertaParaOficinas from "./_components/OfertaParaOficinas";
import Author from "./_components/Author";
import Faq from "./_components/Faq";
import WhatsAppParaOficinas from "./_components/WhatsAppParaOficinas";
import Footer from "./_components/Footer";
import ClientEffects from "./_components/ClientEffects";
import BackRedirect from "./_components/BackRedirect";
import OfertaLimitadaParaOficinas from "./_components/OfertaLimitadaParaOficinas";
import styles from "./page.module.css";
import SectionCta from "./_components/SectionCta";

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
        <PerfisParaOficinas />
        <MateriaisParaOficinas />
        <OfertaParaOficinas />
        <Author footer={<SectionCta />} />
        <Faq footer={<SectionCta />} />
        <WhatsAppParaOficinas />
      </main>
      <Footer />
      <ClientEffects />
      <BackRedirect />
    </div>
  );
}
