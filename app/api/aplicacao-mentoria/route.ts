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

function crmSourceForAttribution(attribution: { utmSource: string; utmContent: string }) {
  const source = attribution.utmSource.trim().toLowerCase();
  const content = attribution.utmContent.trim().toLowerCase();
  if (source === "instagram" && ["bio", "biografia"].includes(content)) return "Forms - Biografia";
  if (source === "instagram" && ["storie", "stories", "story"].includes(content)) return "Forms - Story";
  if (source === "instagram" && content === "feed") return "Forms - Feed";
  if (source === "youtube") return "Forms - Youtube";
  if (source === "isca") return "Forms - Isca";
  return "";
}

function comparableSourceName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:storie|stories)\b/g, "story")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourceChannelName(value: string) {
  return comparableSourceName(value)
    .split(" ")
    .filter((part) => !["form", "forms", "formulario", "instagram"].includes(part))
    .join(" ");
}

function phoneVariants(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return [digits, digits.slice(2)];
  if (digits.length === 10 || digits.length === 11) return [digits, `55${digits}`];
  return [digits];
}

async function registeredCrmSource(db: ReturnType<typeof crmPool>, expectedSource: string) {
  if (!expectedSource) return null;
  const registered = await db.query("select name from public.crm_lead_sources order by created_at");
  const names = registered.rows
    .map((row) => String(row.name || "")).filter(Boolean)
    .filter((name) => comparableSourceName(name) !== "formulario");
  const exactKey = comparableSourceName(expectedSource);
  const channelKey = sourceChannelName(expectedSource);
  return names.find((name) => comparableSourceName(name) === exactKey)
    || (channelKey ? names.find((name) => sourceChannelName(name) === channelKey) : undefined)
    || null;
}

export async function POST(request: Request) {
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

  if (body.mode === "partial") {
    const name = safeText(body.nome, 300);
    const phone = safeText(body.whatsapp, 300);
    if (name.length < 2 || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ ok: false, error: "invalid-contact" }, { status: 400 });
    }
    try {
      const db = crmPool();
      const existing = await db.query(
        "select id from public.crm_leads where regexp_replace(phone,'\\D','','g')=any($1::text[]) limit 1",
        [phoneVariants(phone)],
      );
      if (!existing.rows[0]?.id) {
        const expectedSource = crmSourceForAttribution(attribution);
        const crmSource = await registeredCrmSource(db, expectedSource);
        if (!crmSource) return NextResponse.json({ ok: false, error: "source-not-registered" }, { status: 422 });
        await db.query(
          "insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at) values($1,$2,'',$3,'','Iniciou o formulário e informou nome e WhatsApp.',$4,$5,'Mentoria OAG','Novo lead',0,'Morno','Concluir aplicação',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),now())",
          [crypto.randomUUID(), name, phone, [], crmSource],
        );
      }
      return NextResponse.json({ ok: true, partial: true });
    } catch (error) {
      console.error("Mentoria partial CRM write failed", error);
      return NextResponse.json({ ok: false, error: "partial-save-failed" }, { status: 502 });
    }
  }

  const webhook = process.env.MENTORIA_SHEETS_WEBHOOK_URL || process.env.SHEETS_WEBHOOK_URL;
  if (!webhook?.startsWith("https://")) return NextResponse.json({ ok: false, error: "missing-webhook" }, { status: 500 });

  const answers: Record<string, string> = {};
  for (const question of allQuestions) {
    const value = safeText(body[question.id], question.type === "textarea" ? 4_000 : 300);
    if (!value) return NextResponse.json({ ok: false, error: "missing-fields" }, { status: 400 });
    answers[question.id] = value;
  }
  if (answers.whatsapp.replace(/\D/g, "").length < 10) return NextResponse.json({ ok: false, error: "invalid-contact" }, { status: 400 });
  const email = "";

  const rawSessionId = safeText(body.sessionId, 100);
  const sessionId = SESSION_ID_RE.test(rawSessionId) ? rawSessionId : "";

  const readableAnswers = allQuestions.map((question) => ({ numero: question.number, pergunta: question.label, resposta: answers[question.id] }));
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        step: allQuestions.length,
        totalSteps: allQuestions.length,
        completed: true,
        name: answers.nome,
        phone: answers.whatsapp,
        email,
        source: attribution.utmSource,
        formSource: "aplicacao-mentoria",
        city: answers.cidadeEstado,
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

  try {
    const db = crmPool();
    const submittedAt = new Date().toISOString();
    const application = { sessionId, submittedAt, attribution, answers: readableAnswers };
    const expectedSource = crmSourceForAttribution(attribution);
    const crmSource = await registeredCrmSource(db, expectedSource);
    if (!crmSource) throw new Error("CRM_SOURCE_NOT_REGISTERED");
    const applicationColumn = await db.query(
      "select 1 from information_schema.columns where table_schema='public' and table_name='crm_leads' and column_name='application' limit 1",
    );
    const supportsApplication = Boolean(applicationColumn.rows[0]);
    const existing = await db.query(
      "select id,notes,application->>'sessionId' as application_session_id from public.crm_leads where regexp_replace(phone,'\\D','','g')=any($1::text[]) limit 1",
      [phoneVariants(answers.whatsapp)],
    );
    if (existing.rows[0]?.id) {
      const isFormDraft = existing.rows[0].notes === "Iniciou o formulário e informou nome e WhatsApp.";
      const isSameApplication = Boolean(sessionId && existing.rows[0].application_session_id === sessionId);
      if (supportsApplication && isFormDraft) {
        await db.query(
          "update public.crm_leads set name=$2,phone=$3,email=coalesce(nullif($4,''),email),application=$5::jsonb,source=$6,product='Mentoria OAG',stage='Novo lead',created_at=$7,display_date=to_char($7::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY'),conversation_at=null,meeting_at=null,proposal_at=null,next_action='',notes='',updated_at=now() where id=$1",
          [existing.rows[0].id, answers.nome, answers.whatsapp, email, JSON.stringify(application), crmSource, submittedAt],
        );
      } else if (supportsApplication && isSameApplication) {
        await db.query(
          "update public.crm_leads set application=$2::jsonb,updated_at=now() where id=$1",
          [existing.rows[0].id, JSON.stringify(application)],
        );
      } else if (supportsApplication) {
        await db.query(
          "update public.crm_leads set name=$2,phone=$3,email=coalesce(nullif($4,''),email),application=$5::jsonb,source=$6,product='Mentoria OAG',stage='Novo lead',gross_value=0,net_value=null,created_at=$7,display_date=to_char($7::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY'),conversation_at=null,meeting_at=null,proposal_at=null,closed_at=null,next_action='',notes='',tags=case when 'Segunda aplicação'=any(coalesce(tags,'{}'::text[])) then tags else array_append(coalesce(tags,'{}'::text[]),'Segunda aplicação') end,updated_at=now() where id=$1",
          [existing.rows[0].id, answers.nome, answers.whatsapp, email, JSON.stringify(application), crmSource, submittedAt],
        );
      } else if (isFormDraft) {
        await db.query(
          "update public.crm_leads set name=$2,phone=$3,email=coalesce(nullif($4,''),email),source=$5,product='Mentoria OAG',stage='Novo lead',created_at=$6,display_date=to_char($6::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY'),conversation_at=null,meeting_at=null,proposal_at=null,next_action='',notes='',updated_at=now() where id=$1",
          [existing.rows[0].id, answers.nome, answers.whatsapp, email, crmSource, submittedAt],
        );
      } else {
        await db.query(
          "update public.crm_leads set name=$2,phone=$3,email=coalesce(nullif($4,''),email),source=$5,product='Mentoria OAG',stage='Novo lead',gross_value=0,net_value=null,created_at=$6,display_date=to_char($6::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY'),conversation_at=null,meeting_at=null,proposal_at=null,closed_at=null,next_action='',notes='',tags=case when 'Segunda aplicação'=any(coalesce(tags,'{}'::text[])) then tags else array_append(coalesce(tags,'{}'::text[]),'Segunda aplicação') end,updated_at=now() where id=$1",
          [existing.rows[0].id, answers.nome, answers.whatsapp, email, crmSource, submittedAt],
        );
      }
    } else {
      if (supportsApplication) {
        await db.query(
          "insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at,application) values($1,$2,'',$3,$4,'',$5,$6,'Mentoria OAG','Novo lead',0,'Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),$7,$8::jsonb)",
          [crypto.randomUUID(), answers.nome, answers.whatsapp, email, [], crmSource, submittedAt, JSON.stringify(application)],
        );
      } else {
        await db.query(
          "insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at) values($1,$2,'',$3,$4,'',$5,$6,'Mentoria OAG','Novo lead',0,'Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),$7)",
          [crypto.randomUUID(), answers.nome, answers.whatsapp, email, [], crmSource, submittedAt],
        );
      }
    }
  } catch (error) {
    console.error("Mentoria CRM write failed", error);
    // A planilha ja recebeu a aplicacao. A sincronizacao com o CRM e
    // complementar e nao deve fazer o formulario exibir falha (nem induzir o
    // usuario a enviar o mesmo lead novamente).
  }

  return NextResponse.json({ ok: true });
}
