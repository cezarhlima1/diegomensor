import { allQuestions } from "../components/formulario-mentoria/questions";

export function sheetContact(body: Record<string, unknown>) {
  const field = (key: string) => typeof body[key] === "string" || typeof body[key] === "number" ? String(body[key]).trim().slice(0, 2000) : "";
  let phone = field("celular").replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(phone)) phone = phone.slice(2);
  return { name: field("username"), company: field("oficina"), phone, people: field("pessoas"), funnel: field("funil"), revenue: field("faturamento"), problem: field("problema") };
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
