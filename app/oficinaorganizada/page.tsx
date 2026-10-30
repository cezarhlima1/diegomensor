import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import OficinaOrganizada from "@/components/oficina-organizada/OficinaOrganizada";
import { extractTracking } from "@/components/oficina-organizada/checkout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operação: Oficina Organizada — Diego Mensor",
  description:
    "Em uma aula, aprenda como organizar a rotina do pátio e ter mais controle da tua oficina. Imersão online e ao vivo com Diego Mensor.",
  alternates: {
    canonical: "https://www.mensortreinamentos.com.br/oficinaorganizada",
  },
};

export default async function OficinaOrganizadaPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialTracking = extractTracking({ get: key => {
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  } });
  return (
    <>
      <FacebookPixel />
      <ClarityScript projectId="xthz0xw8o1" />
      <main>
        <OficinaOrganizada initialTracking={initialTracking} />
      </main>
    </>
  );
}
