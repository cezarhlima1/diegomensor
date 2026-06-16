import { NextResponse } from "next/server";

/**
 * Recebe o lead do quiz (nome/e-mail/telefone) e repassa para o
 * Web App do Google Apps Script, que grava uma linha na planilha.
 *
 * A URL do Apps Script fica em SHEETS_WEBHOOK_URL (server-side, fora do bundle).
 */
export async function POST(req: Request) {
  const webhook = process.env.SHEETS_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ ok: false, error: "missing-webhook" }, { status: 500 });
  }

  let body: { name?: string; email?: string; phone?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const source = (body.source ?? "").trim() || "desconhecido";

  if (!name || !email || !phone) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, source }),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "sheets-failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
