import { NextResponse } from "next/server";
import { allQuestions } from "@/components/formulario-mentoria/questions";

const MAX_BODY_BYTES = 32_768;
const TIMEOUT_MS = 8_000;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const sessionId = safeText(body.sessionId, 100);
  if (!SESSION_ID_RE.test(sessionId)) return NextResponse.json({ ok: false, error: "invalid-session" }, { status: 400 });

  const rawAnswers = body.answers && typeof body.answers === "object" ? body.answers as Record<string, unknown> : {};
  const readableAnswers = allQuestions
    .filter((question) => rawAnswers[question.id] !== undefined && rawAnswers[question.id] !== null)
    .map((question) => ({ numero: question.number, pergunta: question.label, resposta: safeText(rawAnswers[question.id], question.type === "textarea" ? 4_000 : 300) }));

  const rawAttribution = body.attribution && typeof body.attribution === "object" ? body.attribution as Record<string, unknown> : {};
  const attribution = {
    utmSource: safeText(rawAttribution.utmSource, 100) || "direto",
    utmMedium: safeText(rawAttribution.utmMedium, 100),
    utmCampaign: safeText(rawAttribution.utmCampaign, 150),
    utmContent: safeText(rawAttribution.utmContent, 150),
    utmTerm: safeText(rawAttribution.utmTerm, 150),
    landingPage: safeText(rawAttribution.landingPage, 1_000),
    referrer: safeText(rawAttribution.referrer, 1_000) || "direto",
  };

  const step = Math.max(0, Math.min(allQuestions.length, Math.trunc(Number(body.step)) || 0));
  const totalSteps = allQuestions.length;
  const completed = body.completed === true;

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        step,
        totalSteps,
        completed,
        source: attribution.utmSource,
        formSource: "aplicacao-mentoria",
        answers: JSON.stringify(readableAnswers),
        ...attribution,
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
