import type { Metadata } from "next";
import Cadastro from "@/components/Cadastro";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Encontros ao vivo de domingo — Diego Mensor",
  description:
    "Aula ao vivo e gratuita todo domingo às 19h sobre gestão para oficina da vida real. Cadastre-se e entre no grupo dos encontros.",
};

export default function CadastroPage() {
  return (
    <>
      <main>
        <Cadastro />
      </main>
      <Footer />
    </>
  );
}
