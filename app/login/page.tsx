import type { Metadata } from "next";
import Login from "@/components/auth/Login";

export const metadata: Metadata = {
  title: "Entrar - Diego Mensor",
  description:
    "Acesse a calculadora de precificação da sua oficina com seu e-mail e senha.",
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[440px]">
        <Login />
      </div>
    </main>
  );
}
