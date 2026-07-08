import type { Metadata } from "next";
import Quiz from "@/components/quiz/Quiz";
import Footer from "@/components/Footer";
import ClarityScript from "@/components/ClarityScript";

export const metadata: Metadata = {
  title: "Diagnóstico da sua Oficina - Diego Mensor",
  description:
    "Responda 5 perguntas rápidas e descubra qual treinamento de precificação faz mais sentido pra sua oficina agora.",
};

export default function QuizPage() {
  return (
    <>
      <ClarityScript projectId="xjeuhpvk1z" />
      <main>
        <Quiz />
      </main>
      <Footer />
    </>
  );
}
