import type { Metadata } from "next";
import ClarityScript from "@/components/ClarityScript";
import FacebookPixel from "@/components/FacebookPixel";
import OficinaAltaPerformanceAbertura from "@/components/oficina-alta-performance-abertura/OficinaAltaPerformanceAbertura";

export const metadata: Metadata = {
  title: "Oficina de Alta Performance® | Método de Gestão para Oficinas",
  description:
    "Organize processos, padronize sua equipe, aumente a produtividade e construa uma oficina mais lucrativa e menos dependente de você.",
  alternates: { canonical: "/oficinadealtaperformanceabertura" },
  openGraph: {
    title: "Oficina de Alta Performance®",
    description:
      "O método completo de gestão construído ao longo de 24 anos dentro de oficina.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/CAPA VENDA DOBRA1.png", width: 1380, height: 981 }],
  },
};

export default function OficinaAltaPerformanceAberturaPage() {
  return (
    <>
      <ClarityScript projectId="xz9b5owhei" />
      <FacebookPixel />
      <OficinaAltaPerformanceAbertura />
    </>
  );
}
