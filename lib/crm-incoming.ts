import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { withCrmTransaction } from "./crm-db";

type Answer = { numero: number; pergunta: string; resposta: string };
export type IncomingApplication = { sessionId?: string; submittedAt?: string; answers?: Answer[]; history?: IncomingApplication[]; entryKey?: string; source?: string; [key: string]: unknown };

// JSONB reorders object keys. Identity must not depend on serialization order.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function applicationKey(application: IncomingApplication, source: string) {
  if (application.sessionId && !application.sheetsIscas) return `session:${application.sessionId}`;
  if (application.syncRecordId) return `sheet:${application.syncRecordId}`;
  return `${source}:${createHash("sha256").update(canonical(application.sheetsIscas || application.answers || application)).digest("hex")}`;
}

// A sheet sync updates a recorded application; a new session/row is a new entry.
export function mergeIncomingApplication(current: IncomingApplication, incoming: IncomingApplication, source: string) {
  const { history: oldHistory, ...snapshot } = current;
  const entryKey = applicationKey(incoming, source);
  const recorded = [snapshot, ...(oldHistory || [])];
  let matchingIndex = recorded.findIndex(entry => {
    if (incoming.sheetsIscas) {
      if (incoming.syncRecordId && entry.syncRecordId) return incoming.syncRecordId === entry.syncRecordId;
      if (!entry.sheetsIscas) return false;
      return canonical(entry.sheetsIscas) === canonical(incoming.sheetsIscas);
    }
    return incoming.sessionId ? !entry.sheetsIscas && entry.sessionId === incoming.sessionId : applicationKey(entry, String(entry.source || source)) === entryKey;
  });
  if (matchingIndex < 0 && incoming.sheetsIscas && incoming.syncRecordId) {
    const legacyMatches = recorded.map((entry, index) => ({ entry, index })).filter(({ entry }) =>
      !entry.syncRecordId && entry.sheetsIscas &&
      (entry.sheetsIscas as Record<string, unknown>).funnel === (incoming.sheetsIscas as Record<string, unknown>).funnel);
    if (legacyMatches.length > 1) throw new Error("ambiguous-legacy-application");
    if (legacyMatches.length === 1) matchingIndex = legacyMatches[0].index;
  }
  const repeated = matchingIndex < 0 && Boolean(Object.keys(snapshot).length);
  const history = [...(oldHistory || [])];
  // Reimporting an old application must not replace the most recent interest.
  if (matchingIndex > 0) {
    const previous = history[matchingIndex - 1];
    history[matchingIndex - 1] = { ...previous, ...incoming, submittedAt: previous.submittedAt || incoming.submittedAt, entryKey, source };
    return { repeated: false, historical: true, application: { ...snapshot, history } };
  }
  const answers = new Map((current.answers || []).map(answer => [answer.pergunta, answer]));
  for (const answer of incoming.answers || []) if (answer.resposta?.trim() && answer.resposta !== "Não preenchido") answers.set(answer.pergunta, answer);
  if (repeated) history.push(snapshot);
  const application: IncomingApplication = {
    ...incoming, entryKey, source, answers: [...answers.values()], history,
    ...(matchingIndex === 0 && current.entryAudit ? { entryAudit: current.entryAudit } : {}),
    submittedAt: matchingIndex === 0 ? current.submittedAt || incoming.submittedAt : incoming.submittedAt,
  };
  return { repeated, historical: false, application };

}

export async function updateIncomingLead(id: string, incoming: IncomingApplication, source: string, contact: { name?: string; phone?: string; company?: string; email?: string } = {}, client?: PoolClient, options: { baseline?: boolean } = {}) {
  const update = async (db: PoolClient) => {
    const lead = (await db.query("select * from public.crm_leads where id=$1 for update", [id])).rows[0];
    if (!lead) throw new Error("incoming-lead-not-found");
    const current = options.baseline && !Object.keys(lead.application || {}).length ? {} : { source: lead.source, ...(lead.application || {}) };
    const { repeated, historical, application } = mergeIncomingApplication(current, incoming, source);
    const identifiedEntry = Boolean(incoming.syncRecordId || incoming.sessionId);
    let newEntry = repeated && !options.baseline && identifiedEntry;
    if (repeated && !options.baseline && !identifiedEntry) {
      application.entryAudit = { status: "review", entryAt: null, reasons: ["Possível nova aplicação sem ID fixo; conferir antes de reabrir o atendimento"] };
    }
    if (historical) {
      await db.query("update public.crm_leads set application=$2::jsonb,updated_at=now() where id=$1", [id, JSON.stringify(application)]);
      return { repeated: false };
    }
    const at = incoming.submittedAt || new Date().toISOString();
    const lastContact = Math.max(0, ...(lead.contact_checkpoints || []).map((value: string) => Date.parse(value) || 0),
      ...(lead.journey_history || []).filter((event: { kind: string; stage?: string }) => ["stage", "return-completed", "no-show"].includes(event.kind) && event.stage !== "Novo lead")
        .map((event: { at: string }) => Date.parse(event.at) || 0));
    if (newEntry && incoming.sheetDate && (Date.parse(at) || 0) <= lastContact) {
      newEntry = false;
      application.entryAudit = { status: "review", entryAt: at, reasons: ["Já houve atendimento após esta aplicação; conferir antes de reabrir"] };
    }
    if (newEntry) application.entryAudit = { status: "confirmed", entryAt: at };
    const history = [...(lead.journey_history || [])];
    if (newEntry) history.push({ id: `reentry:${application.entryKey}:${at}`, kind: "reentry", at, stage: "Novo lead", source, funnel: (incoming.sheetsIscas as Record<string, unknown> | undefined)?.funnel, previousStage: lead.stage });
    let tags: string[] = lead.tags || [];
    if (newEntry && !tags.includes("Segunda aplicação")) tags = [...tags, "Segunda aplicação"];
    if (newEntry && tags.some(tag => tag.trim().toLowerCase() === "desqualificado")) tags = [...tags.filter(tag => tag.trim().toLowerCase() !== "desqualificado"), "Já desqualificado"];
    const needsReview = lead.stage === "Novo lead" && (application.entryAudit as { status?: string } | undefined)?.status === "review";
    const reviewStage = needsReview && (await db.query("select name from public.crm_pipeline_stages where name='Revisar entrada' limit 1")).rows[0];
    // Source, original dates, sales, notes, scheduling and previous journey stay intact.
    await db.query(`update public.crm_leads set
      name=coalesce(nullif($2,''),name),phone=coalesce(nullif($3,''),phone),
      company=coalesce(nullif($4,''),company),email=coalesce(nullif($5,''),email),
      application=$6::jsonb,tags=$7,journey_history=$8::jsonb,
      stage=case when $9 then 'Novo lead' when $11 then 'Revisar entrada' else stage end,
      display_date=case when $9 then to_char($10::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY') else display_date end,
      updated_at=now() where id=$1`,
    [id, contact.name || "", contact.phone || "", contact.company || "", contact.email || "", JSON.stringify(application), [...new Set(tags)], JSON.stringify(history), newEntry, at, Boolean(reviewStage)]);
    return { repeated: newEntry };
  };
  return client ? update(client) : withCrmTransaction(update);
}
