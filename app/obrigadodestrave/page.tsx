import type { Metadata } from "next";
import Footer from "@/components/Footer";
import ObrigadoDestrave from "@/components/ObrigadoDestrave";
import ClientEffects from "@/components/ClientEffects";

export const metadata: Metadata = {
  title: "Cadastro quase concluído — Imersão DESTRAVE",
  description: "Responda à pesquisa rápida e entre no grupo oficial da Imersão DESTRAVE.",
  robots: { index: false, follow: false },
};

export default function ObrigadoDestravePage() {
  return (
    <>
      <main>
        <ObrigadoDestrave />
      </main>
      <Footer />
      <ClientEffects />
    </>
  );
}
