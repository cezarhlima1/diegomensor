import type { Metadata } from "next";
import Login from "@/components/auth/Login";

export const metadata: Metadata = {
  title: "Acesso ao CRM | Mensor Treinamentos",
  description: "Acesso administrativo ao CRM da Mensor Treinamentos.",
  robots: { index: false, follow: false },
};

export default function CRMLoginPage() {
  return (
    <main className="auth-page">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[440px]">
        <Login area="crm" />
      </div>
    </main>
  );
}
