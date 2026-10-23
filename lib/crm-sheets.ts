import { allQuestions } from "../components/formulario-mentoria/questions";

export function sheetContact(body: Record<string, unknown>) {
  const field = (key: string) => typeof body[key] === "string" || typeof body[key] === "number" ? String(body[key]).trim().slice(0, 2000) : "";
  let phone = field("celular").replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(phone)) phone = phone.slice(2);
  const revenue = field("faturamento");
  return { name: field("username"), company: field("oficina"), phone, people: field("pessoas"), funnel: field("funil"), revenue: revenue === "#ERROR!" ? "Mais de R$ 150 mil" : revenue, problem: field("problema") };
}

export function sheetProduct(funnel: string) {
  const normalized = funnel.toLowerCase();
  if (normalized.includes("calculadora")) return "Calculadora de precificação";
  if (normalized.includes("mentoria")) return "Mentoria OAG";
  return null;
}

type Application = { answers?: Array<{ numero: number; pergunta: string; resposta: string }>; attribution?: Record<string, unknown>; [key: string]: unknown };

// Fill missing answers without replacing answers collected by the form or sales team.
export function sheetApplication(contact: ReturnType<typeof sheetContact>, current: Application = {}) {
  const values: Record<string, string> = { nome: contact.name, whatsapp: contact.phone, tamanhoEquipe: contact.people, faturamento: contact.revenue, situacao: contact.problem };
  const answers = [...(current.answers || [])];
  for (const question of allQuestions) {
    const value = values[question.id];
    if (!value) continue;
    const index = answers.findIndex((answer) => answer.pergunta === question.label);
    const answer = { numero: question.number, pergunta: question.label, resposta: value };
    if (index < 0) answers.push(answer);
    else if (!answers[index].resposta?.trim() || answers[index].resposta === "Não preenchido") answers[index] = answer;
  }
  return { ...current, answers, attribution: { utmSource: "isca", utmCampaign: contact.funnel, ...current.attribution }, sheetsIscas: { ...contact } };
}

// DATA in this spreadsheet is written in São Paulo local time.
export function sheetEntryDate(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}-03:00`);
  if (!Number.isFinite(parsed.getTime()) || new Date(parsed.getTime() - 3 * 3600000).toISOString().slice(0, 19) !== raw) return null;
  return parsed.toISOString();
}
