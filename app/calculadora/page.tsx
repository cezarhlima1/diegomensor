import type { Metadata } from "next";
import Calculadora from "@/components/calculadora/Calculadora";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Calculadora de Precificação - Diego Mensor",
  description:
    "Calcule o custo real da sua hora, precifique peças com o markup certo e monte orçamentos para a sua oficina. Histórico salvo no navegador.",
};

export default function CalculadoraPage() {
  return (
    <>
      <main>
        <Calculadora />
      </main>
      <Footer />
    </>
  );
}
