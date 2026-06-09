import type { Metadata } from "next";
import Quiz from "@/components/quiz/Quiz";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Diagnóstico da sua Oficina — Diego Mensor",
  description:
    "Responda 5 perguntas rápidas e descubra qual treinamento de precificação faz mais sentido pra sua oficina agora.",
};

export default function QuizPage() {
  return (
    <>
      <main>
        <Quiz />
      </main>
      <Footer />
    </>
  );
}
