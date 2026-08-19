import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import Quiz from "@/components/quiz/Quiz";
import Footer from "@/components/Footer";
import ClarityScript from "@/components/ClarityScript";

export const metadata: Metadata = {
  title: "Você está cobrando errado? | Diego Mensor",
  description:
    "Em menos de 2 minutos, descubra se sua oficina está cobrando certo ou perdendo dinheiro em serviços todos os dias.",
};

export default function QuizPage() {
  return (
    <>
      <FacebookPixel />
      <ClarityScript projectId="xjeuhpvk1z" />
      <main>
        <Quiz />
      </main>
      <Footer />
    </>
  );
}
