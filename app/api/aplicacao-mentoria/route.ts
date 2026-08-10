import { NextResponse } from "next/server";
import { allQuestions } from "@/components/formulario-mentoria/questions";

const MAX_BODY_BYTES = 32_768;
const TIMEOUT_MS = 8_000;

function safeText(value: unknown, max = 4_000) {
  const text = String(value ?? "").trim().slice(0, max);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export async function POST(request: Request) {
  const webhook = process.env.MENTORIA_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL;
  if (!webhook?.startsWith("https://")) return NextResponse.json({ ok: false, error: "missing-webhook" }, { status: 500 });

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("large");
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const answers: Record<string, string> = {};
  for (const question of allQuestions) {
    const value = safeText(body[question.id], question.type === "textarea" ? 4_000 : 300);
    if (!value) return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
    answers[question.id] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email) || answers.whatsapp.replace(/\D/g, "").length < 10) return NextResponse.json({ ok: false, error: "invalid-contact" }, { status: 400 });

  const readableAnswers = allQuestions.map((question) => ({ numero: question.number, pergunta: question.label, resposta: answers[question.id] }));

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: answers.nome,
        phone: answers.whatsapp,
        email: answers.email,
        source: "aplicacao-mentoria",
        city: answers.cidadeEstado,
        answers: JSON.stringify(readableAnswers),
        submittedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("webhook-failed");
  } catch {
    return NextResponse.json({ ok: false, error: "submission-failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

