import { NextResponse } from "next/server";
import { allQuestions } from "@/components/diagnostico-mentoria/questions";

const MAX_BODY_BYTES = 131_072;
function safe(value: unknown, max = 6000) { const text = String(value ?? "").trim().slice(0, max); return /^[=+\-@]/.test(text) ? `'${text}` : text; }

export async function POST(request: Request) {
  const webhook = process.env.DIAGNOSTICO_MENTORIA_SHEETS_WEBHOOK_URL || process.env.MENTORIA_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL;
  if (!webhook?.startsWith("https://")) return NextResponse.json({ ok: false, error: "missing-webhook" }, { status: 500 });
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
  let body: Record<string, unknown>;
  try { const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error(); body = JSON.parse(raw); }
  catch { return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 }); }
  const answers: Record<string, string> = {};
  for (const q of allQuestions) { const value = safe(body[q.id]); if (!q.optional && !value) return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 }); answers[q.id] = value; }
  const readable = allQuestions.map((q, index) => ({ numero: index + 1, pergunta: q.label, resposta: answers[q.id] || "Não informado" }));
  try {
    const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: answers.nome, phone: "", email: "", source: "diagnostico-inicial-mentoria", city: answers.cidade, workshop: answers.oficina, answers: JSON.stringify(readable), submittedAt: new Date().toISOString() }), signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error();
  } catch { return NextResponse.json({ ok: false, error: "submission-failed" }, { status: 502 }); }
  return NextResponse.json({ ok: true });
}
