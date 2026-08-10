import type { Metadata } from "next";
import MentoriaForm from "@/components/formulario-mentoria/MentoriaForm";

export const metadata: Metadata = {
  title: "Aplicação para Mentoria | Diego Mensor",
  description: "Preencha sua aplicação para a mentoria e conte um pouco sobre o momento atual da sua oficina.",
  robots: { index: false, follow: false },
};

export default function FormularioMentoriaPage() {
  return <MentoriaForm />;
}

