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
  const matchingIndex = recorded.findIndex(entry => {
    if (incoming.sheetsIscas) {
      if (incoming.syncRecordId && entry.syncRecordId) return incoming.syncRecordId === entry.syncRecordId;
      if (!entry.sheetsIscas) return false;
      if (incoming.syncRecordId && !entry.syncRecordId) {
        return (entry.sheetsIscas as Record<string, unknown>).funnel === (incoming.sheetsIscas as Record<string, unknown>).funnel;
      }
      return canonical(entry.sheetsIscas) === canonical(incoming.sheetsIscas);
    }
    return incoming.sessionId ? !entry.sheetsIscas && entry.sessionId === incoming.sessionId : applicationKey(entry, String(entry.source || source)) === entryKey;
  });
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
    submittedAt: matchingIndex === 0 ? current.submittedAt || incoming.submittedAt : incoming.submittedAt,
  };
  return { repeated, historical: false, application };

}

export async function updateIncomingLead(id: string, incoming: IncomingApplication, source: string, contact: { name?: string; phone?: string; company?: string; email?: string } = {}, client?: PoolClient) {
  const update = async (db: PoolClient) => {
    const lead = (await db.query("select * from public.crm_leads where id=$1 for update", [id])).rows[0];
    if (!lead) throw new Error("incoming-lead-not-found");
    const { repeated, historical, application } = mergeIncomingApplication({ source: lead.source, ...(lead.application || {}) }, incoming, source);
    if (historical) {
      await db.query("update public.crm_leads set application=$2::jsonb,updated_at=now() where id=$1", [id, JSON.stringify(application)]);
      return { repeated: false };
    }
    const at = incoming.submittedAt || new Date().toISOString();
    const history = [...(lead.journey_history || [])];
    if (repeated) history.push({ id: `reentry:${application.entryKey}:${at}`, kind: "reentry", at, stage: "Novo lead", source, funnel: (incoming.sheetsIscas as Record<string, unknown> | undefined)?.funnel, previousStage: lead.stage });
    let tags: string[] = lead.tags || [];
    if (repeated && !tags.includes("Segunda aplicação")) tags = [...tags, "Segunda aplicação"];
    if (repeated && tags.some(tag => tag.trim().toLowerCase() === "desqualificado")) tags = [...tags.filter(tag => tag.trim().toLowerCase() !== "desqualificado"), "Já desqualificado"];
    // Source, original dates, sales, notes, scheduling and previous journey stay intact.
    await db.query(`update public.crm_leads set
      name=coalesce(nullif($2,''),name),phone=coalesce(nullif($3,''),phone),
      company=coalesce(nullif($4,''),company),email=coalesce(nullif($5,''),email),
      application=$6::jsonb,tags=$7,journey_history=$8::jsonb,
      stage=case when $9 then 'Novo lead' else stage end,
      display_date=case when $9 then to_char($10::timestamptz at time zone 'America/Sao_Paulo','DD/MM/YYYY') else display_date end,
      updated_at=now() where id=$1`,
    [id, contact.name || "", contact.phone || "", contact.company || "", contact.email || "", JSON.stringify(application), [...new Set(tags)], JSON.stringify(history), repeated, at]);
    return { repeated };
  };
  return client ? update(client) : withCrmTransaction(update);
}
