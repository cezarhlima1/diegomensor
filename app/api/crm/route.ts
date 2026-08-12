import { NextResponse } from "next/server";
import { crmPool, withCrmTransaction } from "@/lib/crm-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Snapshot = {
  leads?: Array<Record<string, unknown>>;
  traffic?: Array<Record<string, unknown>>;
  products?: Array<Record<string, unknown>>;
  sources?: string[];
  messages?: Array<Record<string, unknown>>;
  goals?: Record<string, number>;
  stages?: string[];
};

async function authorized() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, reason: "session-missing" } as const;
    const allowedEmails = (process.env.CRM_ALLOWED_EMAIL || "susanesamt@gmail.com")
      .replace(/["']/g, "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (allowedEmails.includes(user.email.trim().toLowerCase())) return { ok: true } as const;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.is_super_admin) return { ok: true } as const;

    return { ok: false, reason: "email-not-allowed", account: user.email } as const;
  } catch {
    return { ok: false, reason: "auth-unavailable" } as const;
  }
}

function databaseError(error: unknown, fallback: string) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : undefined;
  return NextResponse.json({ error: fallback, ...(code ? { code } : {}) }, { status: 503 });
}

export async function GET() {
  const auth = await authorized();
  if (!auth.ok) return NextResponse.json({ error: auth.reason, ...("account" in auth ? { account: auth.account } : {}) }, { status: 401 });
  try {
    const db = crmPool();
    const [leadsResult, purchasesResult, trafficResult, productsResult, historyResult, sourcesResult, messagesResult, goalsResult, stagesResult] = await Promise.all([
      db.query("select * from public.crm_leads order by inserted_at"),
      db.query("select * from public.crm_purchases order by closed_at"),
      db.query("select * from public.crm_traffic_campaigns order by campaign_date desc"),
      db.query("select * from public.crm_products where active order by gross_price"),
      db.query("select h.*, p.name as product_name from public.crm_product_price_history h join public.crm_products p on p.id = h.product_id order by h.changed_at"),
      db.query("select name from public.crm_lead_sources order by created_at"),
      db.query("select * from public.crm_message_templates order by created_at desc"),
      db.query("select month, amount from public.crm_monthly_goals"),
      db.query("select name from public.crm_pipeline_stages order by position"),
    ]);
    const purchasesByLead = new Map<string, Array<Record<string, unknown>>>();
    for (const row of purchasesResult.rows) {
      const list = purchasesByLead.get(row.lead_id) || [];
      list.push({ id: row.id, product: row.product, value: Number(row.gross_value), netValue: Number(row.net_value), closedAt: row.closed_at, repurchase: row.is_repurchase });
      purchasesByLead.set(row.lead_id, list);
    }
    const historyByProduct = new Map<string, Array<Record<string, unknown>>>();
    for (const row of historyResult.rows) {
      const list = historyByProduct.get(row.product_name) || [];
      list.push({ id: row.id, changedAt: row.changed_at, previousPrice: Number(row.previous_gross_price), previousNetPrice: Number(row.previous_net_price), price: Number(row.gross_price), netPrice: Number(row.net_price) });
      historyByProduct.set(row.product_name, list);
    }
    return NextResponse.json({
      leads: leadsResult.rows.map((row) => ({ id: row.id, name: row.name, company: row.company, phone: row.phone, email: row.email, notes: row.notes || "", tags: row.tags || [], source: row.source, product: row.product, stage: row.stage, value: Number(row.gross_value), netValue: row.net_value == null ? undefined : Number(row.net_value), temperature: row.temperature, nextAction: row.next_action, date: row.display_date, createdAt: row.created_at, conversationAt: row.conversation_at, meetingAt: row.meeting_at, proposalAt: row.proposal_at, closedAt: row.closed_at, purchases: purchasesByLead.get(row.id) || [] })),
      traffic: trafficResult.rows.map((row) => ({ id: row.id, month: row.month, date: row.campaign_date, status: row.status, campaign: row.name, product: row.product, investment: Number(row.investment), clicks: row.clicks, pageViews: row.page_views, checkouts: row.checkouts, sales: row.sales, revenue: Number(row.gross_revenue), netRevenue: row.net_revenue == null ? undefined : Number(row.net_revenue) })),
      products: productsResult.rows.map((row) => ({ name: row.name, price: Number(row.gross_price), netPrice: Number(row.net_price), priceHistory: historyByProduct.get(row.name) || [] })),
      sources: sourcesResult.rows.map((row) => row.name),
      messages: messagesResult.rows.map((row) => ({ id: row.id, title: row.title, text: row.body })),
      goals: Object.fromEntries(goalsResult.rows.map((row) => [row.month, Number(row.amount)])),
      stages: stagesResult.rows.map((row) => row.name),
    });
  } catch (error) {
    console.error("CRM GET failed", error);
    return databaseError(error, "database-unavailable");
  }
}

export async function PUT(request: Request) {
  const auth = await authorized();
  if (!auth.ok) return NextResponse.json({ error: auth.reason, ...("account" in auth ? { account: auth.account } : {}) }, { status: 401 });
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > 2_000_000) return NextResponse.json({ error: "payload-too-large" }, { status: 413 });
  let snapshot: Snapshot;
  try { snapshot = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  const leads = Array.isArray(snapshot.leads) ? snapshot.leads : [];
  const traffic = Array.isArray(snapshot.traffic) ? snapshot.traffic : [];
  const products = Array.isArray(snapshot.products) ? snapshot.products : [];
  const sources = Array.isArray(snapshot.sources) ? snapshot.sources : [];
  const messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
  const goals = snapshot.goals && typeof snapshot.goals === "object" ? snapshot.goals : {};
  const stages = Array.isArray(snapshot.stages) ? snapshot.stages : [];
  try {
    await withCrmTransaction(async (db) => {
      for (const product of products) {
        await db.query("insert into public.crm_products(name,gross_price,net_price,active,updated_at) values($1,$2,$3,true,now()) on conflict(name) do update set gross_price=excluded.gross_price,net_price=excluded.net_price,active=true,updated_at=now()", [product.name, Number(product.price) || 0, Number(product.netPrice ?? product.price) || 0]);
      }
      const productNames = products.map((item) => String(item.name));
      await db.query("update public.crm_products set active=false,updated_at=now() where not(name = any($1::text[]))", [productNames]);
      await db.query("delete from public.crm_product_price_history");
      for (const product of products) {
        const productRow = await db.query("select id from public.crm_products where name=$1", [product.name]);
        for (const change of Array.isArray(product.priceHistory) ? product.priceHistory as Array<Record<string, unknown>> : []) await db.query("insert into public.crm_product_price_history(id,product_id,previous_gross_price,previous_net_price,gross_price,net_price,changed_at) values($1,$2,$3,$4,$5,$6,$7)", [change.id, productRow.rows[0].id, change.previousPrice, change.previousNetPrice, change.price, change.netPrice, change.changedAt]);
      }
      await db.query("delete from public.crm_lead_sources");
      for (const source of sources) await db.query("insert into public.crm_lead_sources(name) values($1) on conflict do nothing", [source]);
      for (const lead of leads) await db.query("insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,stage,gross_value,net_value,temperature,next_action,display_date,created_at,conversation_at,meeting_at,proposal_at,closed_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now()) on conflict(id) do update set name=excluded.name,company=excluded.company,phone=excluded.phone,email=excluded.email,notes=excluded.notes,tags=excluded.tags,source=excluded.source,product=excluded.product,stage=excluded.stage,gross_value=excluded.gross_value,net_value=excluded.net_value,temperature=excluded.temperature,next_action=excluded.next_action,display_date=excluded.display_date,created_at=excluded.created_at,conversation_at=excluded.conversation_at,meeting_at=excluded.meeting_at,proposal_at=excluded.proposal_at,closed_at=excluded.closed_at,updated_at=now()", [lead.id, lead.name, lead.company || "", lead.phone || "", lead.email || "", lead.notes || "", Array.isArray(lead.tags) ? lead.tags : [], lead.source || "Cadastro", lead.product || null, lead.stage, Number(lead.value) || 0, lead.netValue == null ? null : Number(lead.netValue), lead.temperature, lead.nextAction || "", lead.date || "", lead.createdAt || null, lead.conversationAt || null, lead.meetingAt || null, lead.proposalAt || null, lead.closedAt || null]);
      const leadIds = leads.map((item) => String(item.id));
      await db.query("delete from public.crm_leads where not(id = any($1::text[]))", [leadIds]);
      await db.query("delete from public.crm_purchases");
      for (const lead of leads) for (const purchase of Array.isArray(lead.purchases) ? lead.purchases as Array<Record<string, unknown>> : []) await db.query("insert into public.crm_purchases(id,lead_id,product,gross_value,net_value,closed_at,is_repurchase) values($1,$2,$3,$4,$5,$6,$7)", [purchase.id, lead.id, purchase.product, Number(purchase.value) || 0, Number(purchase.netValue) || 0, purchase.closedAt, Boolean(purchase.repurchase)]);
      for (const item of traffic) await db.query("insert into public.crm_traffic_campaigns(id,campaign_date,month,status,name,product,investment,clicks,page_views,checkouts,sales,gross_revenue,net_revenue,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()) on conflict(id) do update set campaign_date=excluded.campaign_date,month=excluded.month,status=excluded.status,name=excluded.name,product=excluded.product,investment=excluded.investment,clicks=excluded.clicks,page_views=excluded.page_views,checkouts=excluded.checkouts,sales=excluded.sales,gross_revenue=excluded.gross_revenue,net_revenue=excluded.net_revenue,updated_at=now()", [item.id, item.date || `${item.month}-01`, item.month, item.status || "Em andamento", item.campaign, item.product, Number(item.investment) || 0, Number(item.clicks) || 0, Number(item.pageViews) || 0, Number(item.checkouts) || 0, Number(item.sales) || 0, Number(item.revenue) || 0, item.netRevenue == null ? null : Number(item.netRevenue)]);
      await db.query("delete from public.crm_traffic_campaigns where not(id = any($1::text[]))", [traffic.map((item) => String(item.id))]);
      await db.query("delete from public.crm_message_templates");
      for (const message of messages) await db.query("insert into public.crm_message_templates(id,title,body) values($1,$2,$3)", [message.id, message.title, message.text]);
      await db.query("delete from public.crm_monthly_goals");
      for (const [month, amount] of Object.entries(goals)) await db.query("insert into public.crm_monthly_goals(month,amount,updated_at) values($1,$2,now())", [month, Number(amount) || 0]);
      await db.query("delete from public.crm_pipeline_stages");
      for (const [position, stage] of stages.entries()) await db.query("insert into public.crm_pipeline_stages(name,position) values($1,$2)", [stage, position]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CRM PUT failed", error);
    return databaseError(error, "database-write-failed");
  }
}
