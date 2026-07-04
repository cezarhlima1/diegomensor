import type { Metadata } from "next";
import Registrar from "@/components/auth/Registrar";

export const metadata: Metadata = {
  title: "Criar conta - Diego Mensor",
  description:
    "Cadastre-se como administrador, crie a sua empresa e comece a usar a calculadora de precificação.",
};

export default function RegistrarPage() {
  return (
    <main className="auth-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[440px]">
        <Registrar />
      </div>
    </main>
  );
}
