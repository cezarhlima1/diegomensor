import type { Metadata } from "next";
import DiagnosticoForm from "@/components/diagnostico-mentoria/DiagnosticoForm";

export const metadata: Metadata = {
  title: "Diagnóstico Inicial da Mentoria | Diego Mensor",
  description: "O primeiro passo da sua mentoria: um diagnóstico completo da sua oficina, gestão e objetivos.",
  robots: { index: false, follow: false },
};

export default function DiagnosticoMentoriaPage() {
  return <DiagnosticoForm />;
}
