import { NextResponse } from "next/server";
import { allQuestions } from "@/components/formulario-mentoria/questions";
import { crmPool } from "@/lib/crm-db";

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

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: answers.nome,
        phone: answers.whatsapp,
        email: answers.email,
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
    const application = { submittedAt, attribution, answers: readableAnswers };
    const tags = [attribution.utmSource, attribution.utmMedium, attribution.utmCampaign]
      .filter((value) => value && value !== "direto");
    const applicationColumn = await db.query(
      "select 1 from information_schema.columns where table_schema='public' and table_name='crm_leads' and column_name='application' limit 1",
    );
    const supportsApplication = Boolean(applicationColumn.rows[0]);
    const existing = await db.query(
      "select id from public.crm_leads where lower(email)=lower($1) or regexp_replace(phone,'\\D','','g')=regexp_replace($2,'\\D','','g') limit 1",
      [answers.email, answers.whatsapp],
    );
    if (existing.rows[0]?.id) {
      if (supportsApplication) {
        await db.query(
          "update public.crm_leads set name=$2,phone=$3,email=$4,application=$5::jsonb,tags=coalesce((select array_agg(distinct value) from unnest(coalesce(tags,'{}'::text[]) || $6::text[]) value),'{}'::text[]),source='Formulário',product='Mentoria OAG',stage='Novo lead',created_at=$7,display_date=to_char($7::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY'),conversation_at=null,meeting_at=null,proposal_at=null,next_action='',updated_at=now() where id=$1",
          [existing.rows[0].id, answers.nome, answers.whatsapp, answers.email.toLowerCase(), JSON.stringify(application), tags, submittedAt],
        );
      } else {
        await db.query(
          "update public.crm_leads set name=$2,phone=$3,email=$4,tags=coalesce((select array_agg(distinct value) from unnest(coalesce(tags,'{}'::text[]) || $5::text[]) value),'{}'::text[]),source='Formulário',product='Mentoria OAG',stage='Novo lead',created_at=$6,display_date=to_char($6::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY'),conversation_at=null,meeting_at=null,proposal_at=null,next_action='',updated_at=now() where id=$1",
          [existing.rows[0].id, answers.nome, answers.whatsapp, answers.email.toLowerCase(), tags, submittedAt],
        );
      }
    } else {
      if (supportsApplication) {
        await db.query(
          "insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at,application) values($1,$2,'',$3,$4,'',$5,'Formulário','Mentoria OAG','Novo lead',0,'Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),$6,$7::jsonb)",
          [crypto.randomUUID(), answers.nome, answers.whatsapp, answers.email.toLowerCase(), tags, submittedAt, JSON.stringify(application)],
        );
      } else {
        await db.query(
          "insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,temperature,next_action,display_date,created_at) values($1,$2,'',$3,$4,'',$5,'Formulário','Mentoria OAG','Novo lead',0,'Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),$6)",
          [crypto.randomUUID(), answers.nome, answers.whatsapp, answers.email.toLowerCase(), tags, submittedAt],
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
