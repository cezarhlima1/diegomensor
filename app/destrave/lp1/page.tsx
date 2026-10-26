import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import OficinaOrganizada from "@/components/oficina-organizada/OficinaOrganizada";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operação: Oficina Organizada — Diego Mensor",
  description:
    "Em uma aula, aprenda como organizar a rotina do pátio e ter mais controle da tua oficina. Imersão online e ao vivo com Diego Mensor.",
};

export default function DestraveLp1Page() {
  return (
    <>
      <FacebookPixel />
      <ClarityScript projectId="xthz0xw8o1" />
      <main>
        <OficinaOrganizada />
      </main>
    </>
  );
}
