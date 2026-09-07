import { NextResponse } from "next/server";
import { withCrmTransaction } from "@/lib/crm-db";
import { upsertLeadRecord } from "@/lib/crm-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fonte fixa para leads recebidos da planilha "Automações de cadastro ISCAS".
// Já existe cadastrada em crm_lead_sources — ver app/api/crm/route.ts.
const SOURCE = "Forms - Manychat";

// "Funil" da planilha traz o nome da campanha; mapeamos para o produto
// correspondente quando reconhecido. Fora esses casos, produto fica em branco.
const PRODUCT_BY_FUNNEL_HINT: Array<{ hint: string; product: string }> = [
  { hint: "calculadora", product: "Calculadora de precificação" },
  { hint: "mentoria", product: "Mentoria OAG" },
];

function productForFunnel(funil: string) {
  const normalized = funil.toLowerCase();
  return PRODUCT_BY_FUNNEL_HINT.find(({ hint }) => normalized.includes(hint))?.product;
}

type SheetRow = {
  rowNumber?: number;
  username?: string;
  oficina?: string;
  celular?: string;
  pessoas?: string;
  funil?: string;
  faturamento?: string;
  problema?: string;
};

export async function POST(request: Request) {
  const secret = process.env.SHEETS_TO_CRM_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "missing-secret" }, { status: 500 });

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: SheetRow;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const rowNumber = Number(body.rowNumber);
  const username = String(body.username || "").trim();
  const celular = String(body.celular || "").replace(/\D/g, "");
  if (!rowNumber || (!username && !celular)) {
    // Linha ainda incompleta (edição parcial) — não é erro, só não sincroniza ainda.
    return NextResponse.json({ ok: true, skipped: true });
  }

  const oficina = String(body.oficina || "").trim();
  const funil = String(body.funil || "").trim();
  const pessoas = String(body.pessoas || "").trim();
  const faturamento = String(body.faturamento || "").trim();
  const problema = String(body.problema || "").trim();

  const notes = [
    funil && `Funil: ${funil}`,
    pessoas && `Pessoas na operação: ${pessoas}`,
    faturamento && `Faturamento médio: ${faturamento}`,
    problema && `Principal problema: ${problema}`,
  ].filter(Boolean).join("\n");

  const lead = {
    id: `sheet-iscas-${rowNumber}`,
    name: username || oficina,
    company: oficina,
    phone: celular,
    source: SOURCE,
    product: funil ? productForFunnel(funil) : undefined,
    stage: "Novo lead",
    value: 0,
    temperature: "Morno",
    date: new Date().toISOString().slice(0, 10),
    notes,
    tags: ["Planilha ISCAS"],
  };

  try {
    await withCrmTransaction((db) => upsertLeadRecord(db, lead));
  } catch (error) {
    console.error("CRM sheets-sync failed", error);
    return NextResponse.json({ ok: false, error: "database-write-failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
