import { updateIncomingLead } from "@/lib/crm-incoming";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { withCrmTransaction } from "@/lib/crm-db";
import { sheetApplication, sheetContact, sheetProduct, sheetEntryDate } from "@/lib/crm-sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.SHEETS_TO_CRM_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "sync-not-configured" }, { status: 503 });
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16384) return NextResponse.json({ ok: false, error: "payload-too-large" }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid-body");
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }
  const contact = sheetContact(body);
  // A username can identify a contact while its phone is still missing.
  if ((!contact.phone && !contact.name) || (contact.phone && !/^\d{8,15}$/.test(contact.phone))) return NextResponse.json({ ok: false, error: "invalid-contact" }, { status: 422 });
  // The application ID belongs to the submission, never to its row position.
  const applicationId = typeof body.applicationId === "string" ? body.applicationId.trim().slice(0, 200) : "";
  const syncRecordId = applicationId
    ? `${String(body.spreadsheetId || "iscas").slice(0, 200)}:${applicationId}` : undefined;
  try {
    const result = await withCrmTransaction(async (db) => {
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", ["sheets-iscas-sync"]);
      const matches = await db.query("select id,name,company,stage,application from public.crm_leads where ($1<>'' and public.crm_normalized_phone(phone)=$1) or ($2<>'' and source='Forms - Manychat' and lower(name)=lower($2) and (phone='' or $1='') and (company='' or $3='' or lower(company)=lower($3))) for update", [contact.phone, contact.name, contact.company]);
      if (matches.rows.length > 1) return { conflict: true };
      const existing = matches.rows[0];
      const receivedAt = new Date().toISOString();
      const entryAt = sheetEntryDate(body.sheetDate);
      const application = { ...sheetApplication(contact), receivedAt, ...(entryAt ? { sheetDate: String(body.sheetDate), submittedAt: entryAt } : {}), ...(syncRecordId ? { syncRecordId } : {}) };
      if (existing) {
        const baseline = body.baseline === true && Boolean(applicationId);
        if (baseline && existing.stage !== "Novo lead") {
          return { id: existing.id, created: false, skipped: true, reason: "existing-lead-outside-new" };
        }
        const incoming = application;
        const { repeated } = await updateIncomingLead(existing.id, { ...incoming, submittedAt: entryAt || receivedAt }, "Forms - Manychat", { company: contact.company, phone: contact.phone }, db, { baseline });
        return { id: existing.id, created: false, reactivated: repeated };
      }
      const source = "Forms - Manychat";
      await db.query("insert into public.crm_lead_sources(name) values($1) on conflict do nothing", [source]);
      const id = crypto.randomUUID();
      // Etiqueta com o funil exatamente como veio na coluna FUNIL da
      // planilha, pra identificar de qual automação o lead saiu.
      const tags = contact.funnel ? [contact.funnel] : [];
      const verifiedAt = entryAt || (applicationId && body.baseline !== true ? receivedAt : null);
      const recordedApplication = { ...application, entryAudit: verifiedAt ? { status: "confirmed", entryAt: verifiedAt } : { status: "review", entryAt: null, reasons: ["Sem data comprovada de aplicação"] } };
      const reviewStage = !verifiedAt && (await db.query("select name from public.crm_pipeline_stages where name='Revisar entrada' limit 1")).rows[0];
      await db.query("insert into public.crm_leads(id,name,company,phone,email,source,stage,temperature,next_action,display_date,created_at,application,product,tags) values($1,$2,$3,$4,'',$5,$9,'Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),now(),$6::jsonb,$7,$8)", [id, contact.name, contact.company, contact.phone, source, JSON.stringify(recordedApplication), sheetProduct(contact.funnel), tags, reviewStage ? "Revisar entrada" : "Novo lead"]);
      return { id, created: true };
    });
    if (result.conflict) return NextResponse.json({ ok: false, error: "duplicate-phone-conflict" }, { status: 409 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "ambiguous-legacy-application") {
      return NextResponse.json({ ok: false, error: "application-identity-conflict" }, { status: 409 });
    }
    console.error("Sheets CRM synchronization failed");
    return NextResponse.json({ ok: false, error: "sync-failed" }, { status: 503 });
  }
}
