import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import HeroParaOficinas from "@/components/HeroParaOficinas";
import DepoimentosParaOficinas from "@/components/DepoimentosParaOficinas";
import CursoParaOficinas from "@/components/CursoParaOficinas";
import DuvidasParaOficinas from "@/components/DuvidasParaOficinas";
import Steps from "@/components/Steps";
import PerfisParaOficinas from "@/components/PerfisParaOficinas";
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

export default function PrecificacaoParaOficinasPage() {
  return (
    <>
      <FacebookPixel />
      <ClarityScript projectId="xbomd0cmow" />
      <OfertaLimitadaParaOficinas />
      <main>
        <HeroParaOficinas />
        <DepoimentosParaOficinas />
        <CursoParaOficinas />
        <DuvidasParaOficinas />
        <Steps />
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
    </>
  );
}
