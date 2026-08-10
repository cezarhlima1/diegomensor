import type { Metadata } from "next";
import CRM from "@/components/crm/CRM";

export const metadata: Metadata = {
  title: "CRM | Mensor Treinamentos",
  description: "Gestão comercial e acompanhamento de oportunidades da Mensor Treinamentos.",
  robots: { index: false, follow: false },
};

export default function CRMPage() {
  return <CRM />;
}

