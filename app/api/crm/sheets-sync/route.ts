import { createHash, timingSafeEqual } from "node:crypto";
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
  const reviewId = `sheet-review:${createHash('sha256').update(syncRecordId || JSON.stringify(contact)).digest('hex')}`;
  try {
    const result = await withCrmTransaction(async (db) => {
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", ["sheets-iscas-sync"]);
      const matches = await db.query(`select id from public.crm_leads where
        ($1<>'' and public.crm_normalized_phone(phone)=$1)
        or ($2<>'' and source='Forms - Manychat' and lower(name)=lower($2) and (phone='' or $1='') and (company='' or $3='' or lower(company)=lower($3)))
        or ($4<>'' and (id=(select value from public.crm_state where key=$5) or application->>'syncRecordId'=$4 or exists(
          select 1 from jsonb_array_elements(case when jsonb_typeof(application->'history')='array' then application->'history' else '[]'::jsonb end) entry where entry->>'syncRecordId'=$4
        ))) or id=$6 for update`, [contact.phone, contact.name, contact.company, syncRecordId || '', `sheet_contact:${syncRecordId || ''}`, reviewId]);
      const priorReview = matches.rows.find(row => row.id === reviewId);
      if (priorReview) return { id: priorReview.id, created: false, skipped: true, review: true, reason: 'review-already-recorded' };
      const needsReview = matches.rows.length > 1;
      const existing = needsReview ? undefined : matches.rows[0];
      // This integration only fills gaps in the CRM. A resend, edited row or new
      // application from a known contact must never update or reopen that lead.
      const rememberContact = async (id: string) => {
        if (syncRecordId) await db.query("insert into public.crm_state(key,value) values($1,$2) on conflict(key) do update set value=excluded.value,updated_at=now()", [`sheet_contact:${syncRecordId}`, id]);
      };
      if (existing) {
        // Only integration metadata is recorded; the existing lead is untouched.
        await rememberContact(existing.id);
        return { id: existing.id, created: false, skipped: true, reason: 'existing-contact' };
      }
      const receivedAt = new Date().toISOString();
      const entryAt = sheetEntryDate(body.sheetDate);
      const application = { ...sheetApplication(contact), receivedAt, ...(entryAt ? { sheetDate: String(body.sheetDate), submittedAt: entryAt } : {}), ...(syncRecordId ? { syncRecordId } : {}) };
      const source = "Forms - Manychat";
      await db.query("insert into public.crm_lead_sources(name) values($1) on conflict do nothing", [source]);
      const id = needsReview ? reviewId : crypto.randomUUID();
      // Etiqueta com o funil exatamente como veio na coluna FUNIL da
      // planilha, pra identificar de qual automação o lead saiu.
      const tags = [...(contact.funnel ? [contact.funnel] : []), ...(needsReview ? ["Verificar entrada"] : [])];
      const verifiedAt = entryAt || (applicationId && body.baseline !== true ? receivedAt : null);
      const recordedApplication = { ...application,
        ...(needsReview ? { identityReview: { status: 'pending', originalPhone: contact.phone, matchedLeadIds: matches.rows.map(row => row.id) } } : {}),
        entryAudit: needsReview ? { status: 'review', entryAt: verifiedAt, reasons: ['Mais de um cadastro corresponde a esta entrada. Conferir a identificação.'] } : verifiedAt ? { status: "confirmed", entryAt: verifiedAt } : { status: "review", entryAt: null, reasons: ["Sem data comprovada de aplicação"] },
      };
      // A review entry is not an extra contact with the same phone. Preserve
      // the submitted number in its application until a person resolves it.
      const phone = needsReview ? '' : contact.phone;
      const nextAction = needsReview ? `Verificar identificação da entrada${contact.phone ? ` · Telefone recebido: ${contact.phone}` : ''}` : '';
      await db.query("insert into public.crm_leads(id,name,company,phone,email,source,stage,temperature,next_action,display_date,created_at,application,product,tags) values($1,$2,$3,$4,'',$5,$9,'Morno',$10,to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),now(),$6::jsonb,$7,$8)", [id, contact.name, contact.company, phone, source, JSON.stringify(recordedApplication), sheetProduct(contact.funnel), tags, "Novo lead", nextAction]);
      await rememberContact(id);
      return { id, created: true, ...(needsReview ? { review: true } : {}) };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Sheets CRM synchronization failed");
    return NextResponse.json({ ok: false, error: "sync-failed" }, { status: 503 });
  }
}
