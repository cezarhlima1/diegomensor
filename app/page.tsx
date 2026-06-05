import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ForWho from "@/components/ForWho";
import Steps from "@/components/Steps";
import Receive from "@/components/Receive";
import Offer from "@/components/Offer";
import Choice from "@/components/Choice";
import Author from "@/components/Author";
import FinalOffer from "@/components/FinalOffer";
import Faq from "@/components/Faq";
import Guarantee from "@/components/Guarantee";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ForWho />
        <Steps />
        <Receive />
        <Offer />
        <Choice />
        <Author />
        <FinalOffer />
        <Faq />
        <Guarantee />
      </main>
      <Footer />
      {/* interações (reveal, count-up, magnético, glow, parallax) */}
      <ClientEffects />
    </>
  );
}
