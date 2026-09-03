import { NextResponse } from "next/server";
import { allQuestions } from "@/components/formulario-mentoria/questions";
import { crmPool } from "@/lib/crm-db";

const MAX_BODY_BYTES = 32_768;
const TIMEOUT_MS = 8_000;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeText(value: unknown, max = 4_000) {
  const text = String(value ?? "").trim().slice(0, max);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function comparableSourceName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(?:storie|stories)\b/g, "story").replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceChannelName(value: string) {
  return comparableSourceName(value).split(" ").filter((part) => !["form", "forms", "formulario", "instagram"].includes(part)).join(" ");
}

function expectedSourceFor(utmSource: string, utmContent: string) {
  const source = utmSource.trim().toLowerCase();
  const content = utmContent.trim().toLowerCase();
  if (source === "instagram" && ["bio", "biografia"].includes(content)) return "Forms - Biografia";
  if (source === "instagram" && ["storie", "stories", "story"].includes(content)) return "Forms - Story";
  if (source === "instagram" && content === "feed") return "Forms - Feed";
  if (source === "youtube") return "Forms - Youtube";
  if (source === "isca") return "Forms - Isca";
  return "";
}

function phoneVariants(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return [digits, digits.slice(2)];
  if (digits.length === 10 || digits.length === 11) return [digits, `55${digits}`];
  return [digits];
}

export async function POST(request: Request) {
  const webhook = process.env.MENTORIA_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL;
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
  const readableAnswers = allQuestions.map((question) => ({ numero: question.number, pergunta: question.label, resposta: safeText(rawAnswers[question.id], question.type === "textarea" ? 4_000 : 300) || "Não preenchido" }));
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
  const submittedAt = new Date().toISOString();
  const application = { sessionId, submittedAt, step, totalSteps, completed, attribution, answers: readableAnswers };
  const name = safeText(rawAnswers.nome, 300);
  const phone = safeText(rawAnswers.whatsapp, 300);

  const sheetSave = async () => {
    if (!webhook?.startsWith("https://")) throw new Error("missing-webhook");
    const response = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, step, totalSteps, completed, name, phone, source: attribution.utmSource, formSource: "aplicacao-mentoria", answers: JSON.stringify(readableAnswers), ...attribution, submittedAt }), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error("webhook-failed");
  };

  const crmSave = async () => {
    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) return;
    const db = crmPool();
    const existing = await db.query("select id,application->>'sessionId' as application_session_id from public.crm_leads where application->>'sessionId'=$1 or regexp_replace(phone,'\\D','','g')=any($2::text[]) order by (application->>'sessionId'=$1) desc limit 1", [sessionId, phoneVariants(phone)]);
    if (existing.rows[0]?.id) {
      const repeated = Boolean(existing.rows[0].application_session_id && existing.rows[0].application_session_id !== sessionId);
      await db.query("update public.crm_leads set application=$2::jsonb,notes=case when notes='Iniciou o formulário e informou nome e WhatsApp.' then 'Aplicação iniciada e ainda não finalizada.' else notes end,tags=case when $3 and not ('Segunda aplicação'=any(coalesce(tags,'{}'::text[]))) then array_append(coalesce(tags,'{}'::text[]),'Segunda aplicação') else tags end,updated_at=now() where id=$1", [existing.rows[0].id, JSON.stringify(application), repeated]);
      return;
    }
    const expectedSource = expectedSourceFor(attribution.utmSource, attribution.utmContent);
    if (!expectedSource) throw new Error("CRM_SOURCE_NOT_IDENTIFIED");
    const registered = await db.query("select name from public.crm_lead_sources order by created_at");
    const channelKey = sourceChannelName(expectedSource);
    const crmSource = registered.rows.map((row) => String(row.name || "")).find((source) => comparableSourceName(source) === comparableSourceName(expectedSource) || (channelKey && sourceChannelName(source) === channelKey));
    if (!crmSource) throw new Error("CRM_SOURCE_NOT_REGISTERED");
    await db.query("insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at,application) values($1,$2,'',$3,'','Aplicação iniciada e ainda não finalizada.',$4,$5,'Mentoria OAG','Novo lead',0,'Morno','Concluir aplicação',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),now(),$6::jsonb)", [crypto.randomUUID(), name, phone, [], crmSource, JSON.stringify(application)]);
  };

  const [sheetResult, crmResult] = await Promise.allSettled([sheetSave(), crmSave()]);
  if (sheetResult.status === "rejected") console.error("Mentoria progress sheet write failed", sheetResult.reason);
  if (crmResult.status === "rejected") console.error("Mentoria progress CRM write failed", crmResult.reason);
  if (sheetResult.status === "rejected" && crmResult.status === "rejected") return NextResponse.json({ ok: false, error: "progress-save-failed" }, { status: 502 });
  return NextResponse.json({ ok: true, sheet: sheetResult.status === "fulfilled", crm: crmResult.status === "fulfilled" });
}
