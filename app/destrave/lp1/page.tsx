import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import DestravePage from "@/components/destrave/DestravePage";
import { lp1Copy } from "@/components/destrave/copy";

export const metadata: Metadata = {
  title: "Imersão DESTRAVE — Diego Mensor",
  description:
    "Em um dia, construa o plano de ação para destravar a gestão da sua oficina e aumentar seus resultados. 08 de agosto, das 8h às 18h.",
};

export default function DestraveLp1Page() {
  return (
    <>
      <FacebookPixel />
      <main>
        <DestravePage copy={lp1Copy} />
      </main>
      <Footer />
      <ClientEffects />
    </>
  );
}
