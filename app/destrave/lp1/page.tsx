import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import OficinaOrganizada from "@/components/oficina-organizada/OficinaOrganizada";

export const metadata: Metadata = {
  title: "Operação: Oficina Organizada — Diego Mensor",
  description:
    "Em uma aula, descubra como organizar os serviços e fazer sua oficina fluir. Imersão online e ao vivo com Diego Mensor.",
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
