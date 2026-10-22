import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { withCrmTransaction } from "./crm-db";

type Answer = { numero: number; pergunta: string; resposta: string };
export type IncomingApplication = { sessionId?: string; submittedAt?: string; answers?: Answer[]; history?: IncomingApplication[]; entryKey?: string; source?: string; [key: string]: unknown };

// Keep a snapshot of every entry; progress in the same session updates that entry.
export function mergeIncomingApplication(current: IncomingApplication, incoming: IncomingApplication, source: string) {
  const { history: oldHistory, ...snapshot } = current;
  const key = incoming.sessionId || createHash("sha256").update(JSON.stringify(incoming.sheetsIscas || incoming.answers || incoming)).digest("hex");
  const entryKey = incoming.sessionId ? `session:${key}` : `${source}:${key}`;
  const previousKey = current.entryKey || (current.sessionId ? `session:${current.sessionId}` : current.sheetsIscas ? `${current.source || source}:${createHash("sha256").update(JSON.stringify(current.sheetsIscas)).digest("hex")}` : "");
  const repeated = previousKey ? previousKey !== entryKey && !(oldHistory || []).some(entry => entry.entryKey === entryKey) : Boolean(Object.keys(snapshot).length && !(incoming.sessionId && current.sessionId === incoming.sessionId));
  const answers = new Map((current.answers || []).map(answer => [answer.pergunta, answer]));
  for (const answer of incoming.answers || []) if (answer.resposta?.trim() && answer.resposta !== "Não preenchido") answers.set(answer.pergunta, answer);
  const history = [...(oldHistory || [])];
  if (repeated) history.push(snapshot);
  return { repeated, application: { ...snapshot, ...incoming, entryKey, source, answers: [...answers.values()], history } };
}

export async function updateIncomingLead(id: string, incoming: IncomingApplication, source: string, contact: { name?: string; phone?: string; company?: string; email?: string } = {}, client?: PoolClient) {
  const update = async (db: PoolClient) => {
    const lead = (await db.query("select * from public.crm_leads where id=$1 for update", [id])).rows[0];
    if (!lead) throw new Error("incoming-lead-not-found");
    const { repeated, application } = mergeIncomingApplication({ source: lead.source, ...(lead.application || {}) }, incoming, source);
    const at = incoming.submittedAt || new Date().toISOString();
    const history = [...(lead.journey_history || [])];
    if (repeated) history.push({ id: `reentry:${application.entryKey}:${at}`, kind: "reentry", at, stage: "Novo lead", source, previousStage: lead.stage });
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
