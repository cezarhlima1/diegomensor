import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import Hero from "@/components/Hero";
import ForWho from "@/components/ForWho";
import Steps from "@/components/Steps";
import Offer from "@/components/Offer";
import Choice from "@/components/Choice";
import Author from "@/components/Author";
import FinalOffer from "@/components/FinalOffer";
import Faq from "@/components/Faq";
import Guarantee from "@/components/Guarantee";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import BackRedirect from "@/components/BackRedirect";

export default function PrecificacaoPage() {
  return (
    <>
      <FacebookPixel />
      <ClarityScript projectId="xbomd0cmow" />
      <div className="fixed inset-x-0 top-0 z-[60] flex h-12 items-center justify-center bg-[#d71920] px-4 text-center font-display text-[clamp(15px,2vw,20px)] font-black uppercase tracking-[.02em] text-white shadow-[0_6px_24px_rgba(215,25,32,.35)]">
        Atenção: isso vai sair fora do ar
      </div>
      <main>
        <Hero />
        <ForWho />
        <Steps />
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
