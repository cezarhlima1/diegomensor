import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 16_384;
const MAX_CAMPO = 500;
const MAX_RESPOSTAS = 8_000;
const TIMEOUT_WEBHOOK_MS = 8_000;

function textoPlanilha(valor: unknown, maximo = MAX_CAMPO): string {
  const texto = String(valor ?? "").trim().slice(0, maximo);
  // Evita formula injection caso o Apps Script grave o valor diretamente.
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

/**
 * Recebe o lead do quiz (nome/e-mail/telefone) e repassa para o
 * Web App do Google Apps Script, que grava uma linha na planilha.
 *
 * A URL do Apps Script fica em SHEETS_WEBHOOK_URL (server-side, fora do bundle).
 */
export async function POST(req: Request) {
  const webhook = process.env.SHEETS_WEBHOOK_URL;
  if (!webhook || !webhook.startsWith("https://")) {
    return NextResponse.json({ ok: false, error: "missing-webhook" }, { status: 500 });
  }
  const tamanho = Number(req.headers.get("content-length"));
  if (Number.isFinite(tamanho) && tamanho > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
  }

  let body: { name?: string; email?: string; phone?: string; source?: string; answers?: string };
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const name = textoPlanilha(body.name, 120);
  const email = textoPlanilha(body.email, 254).toLowerCase();
  const phone = textoPlanilha(body.phone, 30);
  const source = textoPlanilha(body.source, 80) || "desconhecido";
  const answers = textoPlanilha(body.answers, MAX_RESPOSTAS);

  if (
    name.length < 3 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    phone.replace(/\D/g, "").length < 10
  ) {
    return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
  }

  try {
    const resposta = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, source, ...(answers ? { answers } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT_WEBHOOK_MS),
    });
    if (!resposta.ok) throw new Error(`webhook respondeu ${resposta.status}`);
  } catch {
    return NextResponse.json({ ok: false, error: "sheets-failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
