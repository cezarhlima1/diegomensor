import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import HeroParaOficinas from "@/components/HeroParaOficinas";
import DepoimentosParaOficinas from "@/components/DepoimentosParaOficinas";
import CursoParaOficinas from "@/components/CursoParaOficinas";
import DuvidasParaOficinas from "@/components/DuvidasParaOficinas";
import Steps from "@/components/Steps";
import PerfisParaOficinas from "@/components/PerfisParaOficinas";
import MateriaisParaOficinas from "@/components/MateriaisParaOficinas";
import Offer from "@/components/Offer";
import Choice from "@/components/Choice";
import Author from "@/components/Author";
import FinalOffer from "@/components/FinalOffer";
import Faq from "@/components/Faq";
import Guarantee from "@/components/Guarantee";
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
        <Steps titles={[
          "Por que precificação primeiro?",
          "A importância de cobrar certo",
          "Quanto custa manter sua oficina aberta?",
          "Planilha na prática",
          "Precificando de forma correta",
          "Quanto cada mecânico deve produzir?",
          "Contratar mais funcionários pode diminuir o custo da sua hora",
          "O que é o Tempario?",
          "Como funciona o Tempario Automotivo",
          "Pague aluguel para você mesmo",
        ]} />
        <MateriaisParaOficinas />
        <PerfisParaOficinas />
        <Offer />
        <Choice />
        <Author />
        <FinalOffer />
        <Faq />
        <Guarantee />
      </main>
      <Footer />
      <ClientEffects />
      <BackRedirect />
    </div>
  );
}
