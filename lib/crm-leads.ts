import "server-only";
import type { PoolClient } from "pg";

function genericFormSource(value: unknown) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "formulario";
}

export async function assertValidSourceForNewLead(db: PoolClient, lead: Record<string, unknown>) {
  const existing = await db.query("select 1 from public.crm_leads where id=$1", [lead.id]);
  if (existing.rows[0]) return;
  const source = String(lead.source || "").trim();
  if (!source || genericFormSource(source)) throw new Error("specific-lead-source-required");
  const registered = await db.query("select 1 from public.crm_lead_sources where lower(name)=lower($1) limit 1", [source]);
  if (!registered.rows[0]) throw new Error("lead-source-not-registered");
}

export async function supportsMeetingScheduledFor(db: PoolClient) {
  const result = await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='crm_leads' and column_name='meeting_scheduled_for' limit 1");
  return Boolean(result.rows[0]);
}
export async function supportsMeetingOutcome(db: PoolClient) {
  const result = await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='crm_leads' and column_name='meeting_outcome' limit 1");
  return Boolean(result.rows[0]);
}
export async function supportsFollowUpAt(db: PoolClient) {
  const result = await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='crm_leads' and column_name='follow_up_at' limit 1");
  return Boolean(result.rows[0]);
}

export async function upsertLeadRecord(db: PoolClient, lead: Record<string, unknown>) {
  await assertValidSourceForNewLead(db, lead);
  await db.query("insert into public.crm_leads(id,name,company,phone,email,notes,tags,source,product,traffic_campaign_id,stage,gross_value,net_value,temperature,next_action,display_date,created_at,conversation_at,meeting_at,proposal_at,closed_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()) on conflict(id) do update set name=excluded.name,company=excluded.company,phone=excluded.phone,email=excluded.email,notes=excluded.notes,tags=excluded.tags,source=excluded.source,product=excluded.product,traffic_campaign_id=excluded.traffic_campaign_id,stage=excluded.stage,gross_value=excluded.gross_value,net_value=excluded.net_value,temperature=excluded.temperature,next_action=excluded.next_action,display_date=excluded.display_date,created_at=excluded.created_at,conversation_at=excluded.conversation_at,meeting_at=excluded.meeting_at,proposal_at=excluded.proposal_at,closed_at=excluded.closed_at,updated_at=now()", [lead.id, lead.name, lead.company || "", lead.phone || "", String(lead.email || "").trim().toLowerCase(), lead.notes || "", Array.isArray(lead.tags) ? lead.tags : [], lead.source || "Cadastro", lead.product || null, lead.campaignId || null, lead.stage, Number(lead.value) || 0, lead.netValue == null ? null : Number(lead.netValue), lead.temperature, lead.nextAction || "", lead.date || "", lead.createdAt || null, lead.conversationAt || null, lead.meetingAt || null, lead.proposalAt || null, lead.closedAt || null]);
  if (Object.prototype.hasOwnProperty.call(lead, "meetingScheduledFor")) {
    const supported = await supportsMeetingScheduledFor(db);
    if (!supported && lead.meetingScheduledFor) throw new Error("crm-meeting-scheduled-for-migration-required");
    if (supported) await db.query("update public.crm_leads set meeting_scheduled_for=$2,updated_at=now() where id=$1", [lead.id, lead.meetingScheduledFor || null]);
  }
  if (Object.prototype.hasOwnProperty.call(lead, "meetingOutcome")) {
    const supported = await supportsMeetingOutcome(db);
    if (!supported && lead.meetingOutcome) throw new Error("crm-meeting-outcome-migration-required");
    if (supported) await db.query("update public.crm_leads set meeting_outcome=$2,updated_at=now() where id=$1", [lead.id, lead.meetingOutcome || null]);
  }
  if (Object.prototype.hasOwnProperty.call(lead, "followUpAt")) {
    const supported = await supportsFollowUpAt(db);
    if (!supported && lead.followUpAt) throw new Error("crm-follow-up-at-migration-required");
    if (supported) await db.query("update public.crm_leads set follow_up_at=$2,updated_at=now() where id=$1", [lead.id, lead.followUpAt || null]);
  }
}
