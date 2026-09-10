import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { withCrmTransaction } from "@/lib/crm-db";
import { sheetApplication, sheetContact, sheetProduct } from "@/lib/crm-sheets";

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
  if ((!contact.phone && !contact.name) || (contact.phone && !/^\d{10,11}$/.test(contact.phone))) return NextResponse.json({ ok: false, error: "invalid-contact" }, { status: 422 });
  try {
    const result = await withCrmTransaction(async (db) => {
      await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", ["sheets-iscas-sync"]);
      const matches = await db.query("select id,name,company,application from public.crm_leads where ($1<>'' and public.crm_normalized_phone(phone)=$1) or ($2<>'' and source='Forms - Manychat' and lower(name)=lower($2) and (phone='' or $1='') and (company='' or $3='' or lower(company)=lower($3))) for update", [contact.phone, contact.name, contact.company]);
      if (matches.rows.length > 1) return { conflict: true };
      const existing = matches.rows[0];
      const application = sheetApplication(contact, existing?.application || {});
      if (existing) {
        await db.query("update public.crm_leads set name=coalesce(nullif(name,''),$2),company=coalesce(nullif(company,''),$3),application=$4::jsonb,phone=coalesce(nullif(phone,''),$5),updated_at=now() where id=$1", [existing.id, contact.name, contact.company, JSON.stringify(application), contact.phone]);
        return { id: existing.id, created: false };
      }
      const source = "Forms - Manychat";
      await db.query("insert into public.crm_lead_sources(name) values($1) on conflict do nothing", [source]);
      const id = crypto.randomUUID();
      await db.query("insert into public.crm_leads(id,name,company,phone,email,source,stage,temperature,next_action,display_date,created_at,application,product,tags) values($1,$2,$3,$4,'',$5,'Novo lead','Morno','',to_char(now() at time zone 'America/Sao_Paulo','DD/MM/YYYY'),now(),$6::jsonb,$7,array['Planilha ISCAS'])", [id, contact.name, contact.company, contact.phone, source, JSON.stringify(application), sheetProduct(contact.funnel)]);
      return { id, created: true };
    });
    if (result.conflict) return NextResponse.json({ ok: false, error: "duplicate-phone-conflict" }, { status: 409 });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    console.error("Sheets CRM synchronization failed");
    return NextResponse.json({ ok: false, error: "sync-failed" }, { status: 503 });
  }
}
