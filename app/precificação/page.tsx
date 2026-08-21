import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import Header from "@/components/Header";
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
      <Header />
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
