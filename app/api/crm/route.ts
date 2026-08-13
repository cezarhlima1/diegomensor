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
    const [leadsResult, purchasesResult, trafficResult, productsResult, historyResult, sourcesResult, messagesResult, goalsResult, stagesResult, stateResult] = await Promise.all([
      db.query("select * from public.crm_leads order by inserted_at"),
      db.query("select * from public.crm_purchases order by closed_at"),
      db.query("select * from public.crm_traffic_campaigns order by campaign_date desc"),
      db.query("select * from public.crm_products where active order by position, created_at"),
      db.query("select h.*, p.name as product_name from public.crm_product_price_history h join public.crm_products p on p.id = h.product_id order by h.changed_at"),
      db.query("select name from public.crm_lead_sources order by created_at"),
      db.query("select * from public.crm_message_templates order by created_at desc"),
      db.query("select month, amount from public.crm_monthly_goals"),
      db.query("select name from public.crm_pipeline_stages order by position"),
      db.query("select key,value from public.crm_state"),
    ]);
    const purchasesByLead = new Map<string, Array<Record<string, unknown>>>();
    for (const row of purchasesResult.rows) {
      const list = purchasesByLead.get(row.lead_id) || [];
      list.push({ id: row.id, product: row.product, source: row.purchase_source, value: Number(row.gross_value), netValue: Number(row.net_value), closedAt: row.closed_at, repurchase: row.is_repurchase, origin: row.purchase_origin, externalSaleCode: row.external_sale_code, campaignId: row.traffic_campaign_id });
      purchasesByLead.set(row.lead_id, list);
    }
    const historyByProduct = new Map<string, Array<Record<string, unknown>>>();
    for (const row of historyResult.rows) {
      const list = historyByProduct.get(row.product_name) || [];
      list.push({ id: row.id, changedAt: row.changed_at, previousPrice: Number(row.previous_gross_price), previousNetPrice: Number(row.previous_net_price), price: Number(row.gross_price), netPrice: Number(row.net_price) });
      historyByProduct.set(row.product_name, list);
    }
    return NextResponse.json({
      leads: leadsResult.rows.map((row) => ({ id: row.id, name: row.name, company: row.company, phone: row.phone, email: row.email, notes: row.notes || "", tags: row.tags || [], source: row.source, product: row.product, campaignId: row.traffic_campaign_id, stage: row.stage, value: Number(row.gross_value), netValue: row.net_value == null ? undefined : Number(row.net_value), temperature: row.temperature, nextAction: row.next_action, date: row.display_date, createdAt: row.created_at, conversationAt: row.conversation_at, meetingAt: row.meeting_at, proposalAt: row.proposal_at, closedAt: row.closed_at, purchases: purchasesByLead.get(row.id) || [] })),
      traffic: trafficResult.rows.map((row) => ({ id: row.id, month: row.month, date: row.campaign_date ? new Date(row.campaign_date).toISOString().slice(0, 10) : undefined, status: row.status, campaign: row.name, product: row.product, investment: Number(row.investment), clicks: row.clicks, pageViews: row.page_views, checkouts: row.checkouts, sales: row.sales, revenue: Number(row.gross_revenue), netRevenue: row.net_revenue == null ? undefined : Number(row.net_revenue) })),
      products: productsResult.rows.map((row) => ({ name: row.name, price: Number(row.gross_price), netPrice: Number(row.net_price), position: row.position, priceHistory: historyByProduct.get(row.name) || [] })),
      sources: sourcesResult.rows.map((row) => row.name),
      messages: messagesResult.rows.map((row) => ({ id: row.id, title: row.title, text: row.body })),
      goals: Object.fromEntries(goalsResult.rows.map((row) => [row.month, Number(row.amount)])),
      stages: stagesResult.rows.map((row) => row.name),
      state: Object.fromEntries(stateResult.rows.map((row) => [row.key, row.value])),
    });
  } catch (error) {
    console.error("CRM GET failed", error);
    return databaseError(error, "database-unavailable");
  }
}

export async function PATCH(request: Request) {
  const auth = await authorized();
  if (!auth.ok) return NextResponse.json({ error: auth.reason, ...("account" in auth ? { account: auth.account } : {}) }, { status: 401 });
  let body: { entity?: string; record?: Record<string, unknown>; oldId?: string; newId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  if ((body.entity === "product-rename" || body.entity === "source-rename") && body.oldId && body.newId) {
    try {
      await withCrmTransaction(async (db) => {
        if (body.entity === "product-rename") {
          await db.query("update public.crm_products set name=$2,updated_at=now() where name=$1", [body.oldId, body.newId]);
          await db.query("update public.crm_leads set product=$2,updated_at=now() where product=$1", [body.oldId, body.newId]);
          await db.query("update public.crm_purchases set product=$2 where product=$1", [body.oldId, body.newId]);
          await db.query("update public.crm_traffic_campaigns set product=$2,updated_at=now() where product=$1", [body.oldId, body.newId]);
        } else {
          await db.query("update public.crm_lead_sources set name=$2 where name=$1", [body.oldId, body.newId]);
          await db.query("update public.crm_leads set source=$2,updated_at=now() where source=$1", [body.oldId, body.newId]);
        }
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("CRM rename PATCH failed", error);
      return databaseError(error, "database-write-failed");
    }
  }
  if (body.entity === "lead" && body.record?.id) {
    const lead = body.record;
    try {
      await withCrmTransaction(async (db) => {
        await db.query("insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,traffic_campaign_id,stage,gross_value,net_value,temperature,next_action,display_date,created_at,conversation_at,meeting_at,proposal_at,closed_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()) on conflict(id) do update set name=excluded.name,company=excluded.company,phone=excluded.phone,email=excluded.email,notes=excluded.notes,tags=excluded.tags,source=excluded.source,product=excluded.product,traffic_campaign_id=excluded.traffic_campaign_id,stage=excluded.stage,gross_value=excluded.gross_value,net_value=excluded.net_value,temperature=excluded.temperature,next_action=excluded.next_action,display_date=excluded.display_date,created_at=excluded.created_at,conversation_at=excluded.conversation_at,meeting_at=excluded.meeting_at,proposal_at=excluded.proposal_at,closed_at=excluded.closed_at,updated_at=now()", [lead.id, lead.name, lead.company || "", lead.phone || "", String(lead.email || "").trim().toLowerCase(), lead.notes || "", Array.isArray(lead.tags) ? lead.tags : [], lead.source || "Cadastro", lead.product || null, lead.campaignId || null, lead.stage, Number(lead.value) || 0, lead.netValue == null ? null : Number(lead.netValue), lead.temperature, lead.nextAction || "", lead.date || "", lead.createdAt || null, lead.conversationAt || null, lead.meetingAt || null, lead.proposalAt || null, lead.closedAt || null]);
        for (const purchase of Array.isArray(lead.purchases) ? lead.purchases as Array<Record<string, unknown>> : []) {
          await db.query("insert into public.crm_purchases(id,lead_id,product,purchase_source,gross_value,net_value,closed_at,is_repurchase,purchase_origin,external_sale_code,traffic_campaign_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict(id) do update set lead_id=excluded.lead_id,product=excluded.product,purchase_source=excluded.purchase_source,gross_value=excluded.gross_value,net_value=excluded.net_value,closed_at=excluded.closed_at,is_repurchase=excluded.is_repurchase,purchase_origin=excluded.purchase_origin,external_sale_code=excluded.external_sale_code,traffic_campaign_id=excluded.traffic_campaign_id", [purchase.id, lead.id, purchase.product, purchase.origin === "campaign" || purchase.externalSaleCode || purchase.campaignId ? "Tráfego" : purchase.source || lead.source || "Cadastro", Number(purchase.value) || 0, Number(purchase.netValue) || 0, purchase.closedAt, Boolean(purchase.repurchase), purchase.origin === "campaign" || purchase.externalSaleCode || purchase.campaignId ? "campaign" : "pipeline", purchase.externalSaleCode || null, purchase.campaignId || null]);
        }
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("CRM lead PATCH failed", error);
      return databaseError(error, "database-write-failed");
    }
  }
  if (body.entity !== "traffic" || !body.record?.id) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  const item = body.record;
  try {
    const db = crmPool();
    await db.query("insert into public.crm_traffic_campaigns(id,campaign_date,month,status,name,product,investment,clicks,page_views,checkouts,sales,gross_revenue,net_revenue,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()) on conflict(id) do update set campaign_date=excluded.campaign_date,month=excluded.month,status=excluded.status,name=excluded.name,product=excluded.product,investment=excluded.investment,clicks=excluded.clicks,page_views=excluded.page_views,checkouts=excluded.checkouts,sales=excluded.sales,gross_revenue=excluded.gross_revenue,net_revenue=excluded.net_revenue,updated_at=now()", [item.id, item.date || `${item.month}-01`, item.month, item.status || "Em andamento", item.campaign, item.product, Number(item.investment) || 0, Number(item.clicks) || 0, Number(item.pageViews) || 0, Number(item.checkouts) || 0, Number(item.sales) || 0, Number(item.revenue) || 0, item.netRevenue == null ? null : Number(item.netRevenue)]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CRM campaign PATCH failed", error);
    return databaseError(error, "database-write-failed");
  }
}

export async function DELETE(request: Request) {
  const auth = await authorized();
  if (!auth.ok) return NextResponse.json({ error: auth.reason, ...("account" in auth ? { account: auth.account } : {}) }, { status: 401 });
  let body: { entity?: string; id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid-json" }, { status: 400 }); }
  if (!body.entity || !body.id) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
  try {
    const db = crmPool();
    const operations: Record<string, { query: string; value: string }> = {
      traffic: { query: "delete from public.crm_traffic_campaigns where id=$1", value: body.id },
      lead: { query: "delete from public.crm_leads where id=$1", value: body.id },
      purchase: { query: "delete from public.crm_purchases where id=$1", value: body.id },
      product: { query: "update public.crm_products set active=false,updated_at=now() where name=$1", value: body.id },
      source: { query: "delete from public.crm_lead_sources where name=$1", value: body.id },
      message: { query: "delete from public.crm_message_templates where id=$1", value: body.id },
      stage: { query: "delete from public.crm_pipeline_stages where name=$1", value: body.id },
    };
    const operation = operations[body.entity];
    if (!operation) return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    await db.query(operation.query, [operation.value]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CRM DELETE failed", error);
    return databaseError(error, "database-write-failed");
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
      for (const [position, product] of products.entries()) {
        await db.query("insert into public.crm_products(name,gross_price,net_price,position,active,updated_at) values($1,$2,$3,$4,true,now()) on conflict(name) do update set gross_price=excluded.gross_price,net_price=excluded.net_price,position=excluded.position,active=true,updated_at=now()", [product.name, Number(product.price) || 0, Number(product.netPrice ?? product.price) || 0, position]);
      }
      for (const product of products) {
        const productRow = await db.query("select id from public.crm_products where name=$1", [product.name]);
        for (const change of Array.isArray(product.priceHistory) ? product.priceHistory as Array<Record<string, unknown>> : []) await db.query("insert into public.crm_product_price_history(id,product_id,previous_gross_price,previous_net_price,gross_price,net_price,changed_at) values($1,$2,$3,$4,$5,$6,$7) on conflict(id) do update set product_id=excluded.product_id,previous_gross_price=excluded.previous_gross_price,previous_net_price=excluded.previous_net_price,gross_price=excluded.gross_price,net_price=excluded.net_price,changed_at=excluded.changed_at", [change.id, productRow.rows[0].id, change.previousPrice, change.previousNetPrice, change.price, change.netPrice, change.changedAt]);
      }
      for (const source of sources) await db.query("insert into public.crm_lead_sources(name) values($1) on conflict do nothing", [source]);
      for (const lead of leads) await db.query("insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,traffic_campaign_id,stage,gross_value,net_value,temperature,next_action,display_date,created_at,conversation_at,meeting_at,proposal_at,closed_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()) on conflict(id) do update set name=excluded.name,company=excluded.company,phone=excluded.phone,email=excluded.email,notes=excluded.notes,tags=excluded.tags,source=excluded.source,product=excluded.product,traffic_campaign_id=excluded.traffic_campaign_id,stage=excluded.stage,gross_value=excluded.gross_value,net_value=excluded.net_value,temperature=excluded.temperature,next_action=excluded.next_action,display_date=excluded.display_date,created_at=excluded.created_at,conversation_at=excluded.conversation_at,meeting_at=excluded.meeting_at,proposal_at=excluded.proposal_at,closed_at=excluded.closed_at,updated_at=now()", [lead.id, lead.name, lead.company || "", lead.phone || "", String(lead.email || "").trim().toLowerCase(), lead.notes || "", Array.isArray(lead.tags) ? lead.tags : [], lead.source || "Cadastro", lead.product || null, lead.campaignId || null, lead.stage, Number(lead.value) || 0, lead.netValue == null ? null : Number(lead.netValue), lead.temperature, lead.nextAction || "", lead.date || "", lead.createdAt || null, lead.conversationAt || null, lead.meetingAt || null, lead.proposalAt || null, lead.closedAt || null]);
      for (const lead of leads) for (const purchase of Array.isArray(lead.purchases) ? lead.purchases as Array<Record<string, unknown>> : []) await db.query("insert into public.crm_purchases(id,lead_id,product,purchase_source,gross_value,net_value,closed_at,is_repurchase,purchase_origin,external_sale_code,traffic_campaign_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) on conflict(id) do update set lead_id=excluded.lead_id,product=excluded.product,purchase_source=excluded.purchase_source,gross_value=excluded.gross_value,net_value=excluded.net_value,closed_at=excluded.closed_at,is_repurchase=excluded.is_repurchase,purchase_origin=excluded.purchase_origin,external_sale_code=excluded.external_sale_code,traffic_campaign_id=excluded.traffic_campaign_id", [purchase.id, lead.id, purchase.product, purchase.origin === "campaign" || purchase.externalSaleCode || purchase.campaignId ? "Tráfego" : purchase.source || lead.source || "Cadastro", Number(purchase.value) || 0, Number(purchase.netValue) || 0, purchase.closedAt, Boolean(purchase.repurchase), purchase.origin === "campaign" || purchase.externalSaleCode || purchase.campaignId ? "campaign" : "pipeline", purchase.externalSaleCode || null, purchase.campaignId || null]);
      for (const item of traffic) { const campaignDate = /^\d{4}-\d{2}-\d{2}/.test(String(item.date || "")) ? item.date : `${item.month}-01`; await db.query("insert into public.crm_traffic_campaigns(id,campaign_date,month,status,name,product,investment,clicks,page_views,checkouts,sales,gross_revenue,net_revenue,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()) on conflict(id) do update set campaign_date=excluded.campaign_date,month=excluded.month,status=excluded.status,name=excluded.name,product=excluded.product,investment=excluded.investment,clicks=excluded.clicks,page_views=excluded.page_views,checkouts=excluded.checkouts,sales=excluded.sales,gross_revenue=excluded.gross_revenue,net_revenue=excluded.net_revenue,updated_at=now()", [item.id, campaignDate, item.month, item.status || "Em andamento", item.campaign, item.product, Number(item.investment) || 0, Number(item.clicks) || 0, Number(item.pageViews) || 0, Number(item.checkouts) || 0, Number(item.sales) || 0, Number(item.revenue) || 0, item.netRevenue == null ? null : Number(item.netRevenue)]); }
      // Campanhas são removidas apenas pelo DELETE explícito. Um snapshot
      // atrasado de outra aba nunca pode apagar uma campanha recém-criada.
      for (const message of messages) await db.query("insert into public.crm_message_templates(id,title,body,updated_at) values($1,$2,$3,now()) on conflict(id) do update set title=excluded.title,body=excluded.body,updated_at=now()", [message.id, message.title, message.text]);
      for (const [month, amount] of Object.entries(goals)) await db.query("insert into public.crm_monthly_goals(month,amount,updated_at) values($1,$2,now()) on conflict(month) do update set amount=excluded.amount,updated_at=now()", [month, Number(amount) || 0]);
      for (const [position, stage] of stages.entries()) await db.query("insert into public.crm_pipeline_stages(name,position) values($1,$2) on conflict(name) do update set position=excluded.position", [stage, position]);
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("CRM PUT failed", error);
    return databaseError(error, "database-write-failed");
  }
}
