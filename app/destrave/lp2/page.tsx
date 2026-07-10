import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import DestravePage from "@/components/destrave/DestravePage";
import { lp2Copy } from "@/components/destrave/copy";

export const metadata: Metadata = {
  title: "Imersão DESTRAVE — Diego Mensor",
  description:
    "Em um único dia, construa o caminho que sua oficina precisa para organizar a gestão e alcançar melhores resultados. 01 de agosto, das 8h às 18h.",
};

export default function DestraveLp2Page() {
  return (
    <>
      <FacebookPixel />
      <main>
        <DestravePage copy={lp2Copy} />
      </main>
      <Footer />
      <ClientEffects />
    </>
  );
}
