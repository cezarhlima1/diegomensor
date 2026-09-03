"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./crm.module.css";
import CRMAdmin, { type CrmModule } from "./CRMAdmin";
import { allQuestions } from "@/components/formulario-mentoria/questions";

type Stage = string;
type View = CrmModule | "admin";
type PaymentMethod = "Pix" | "Boleto" | "Cartão" | "Green" | "Transferência" | "Outro";
type MeetingOutcome = "Agendada" | "Realizada" | "No-show" | "Cancelada";
type LeadApplication = {
  submittedAt?: string;
  attribution?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; landingPage?: string };
  answers?: Array<{ numero: number; pergunta: string; resposta: string }>;
};
type Installment = { id: string; number: number; dueDate: string; amount: number; status: "Previsto" | "Recebido" | "Atrasado" | "Cancelado"; receivedAt?: string };
type Purchase = { id: string; product: string; source?: string; value: number; netValue: number; closedAt: string; repurchase: boolean; origin?: "campaign" | "pipeline"; externalSaleCode?: string; campaignId?: string; paymentMethod?: PaymentMethod; paymentProvider?: string; paymentNotes?: string; installments?: Installment[]; closerUserId?: string; closerName?: string; commissionRate?: number; commissionBasis?: "received" };
type Closer = { id: string; name: string; email: string; commissionRate: number; goal?: number };
type Expense = { id: string; description: string; category: string; amount: number; dueDate: string; status: "Prevista" | "Paga" | "Atrasada" | "Cancelada"; fixed?: boolean; virtualRecurring?: boolean; paidAt?: string; notes?: string };
type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  notes?: string;
  tags?: string[];
  source: string;
  product?: string;
  stage: Stage;
  value: number;
  netValue?: number;
  temperature: "Quente" | "Morno" | "Frio";
  nextAction: string;
  date: string;
  createdAt?: string;
  conversationAt?: string;
  meetingAt?: string;
  meetingScheduledFor?: string | null;
  meetingOutcome?: MeetingOutcome | null;
  followUpAt?: string | null;
  proposalAt?: string;
  closedAt?: string;
  purchases?: Purchase[];
  campaignId?: string;
  application?: LeadApplication;
  contactCheckpoints?: string[];
};
type LeadImportRecord = Lead | (Pick<Lead, "id"> & { purchases: Purchase[]; preserveLeadRecord: true });
type TrafficRecord = {
  id: string;
  month: string;
  date?: string;
  status?: "Em andamento" | "Fechada";
  campaign: string;
  product: string;
  investment: number;
  clicks: number;
  pageViews: number;
  checkouts: number;
  sales: number;
  revenue: number;
  netRevenue?: number;
};
type ProductPriceChange = { id: string; changedAt: string; previousPrice: number; previousNetPrice: number; price: number; netPrice: number };
type ProductDefinition = { name: string; price: number; netPrice?: number; position?: number; priceHistory?: ProductPriceChange[] };
type ImportedSale = { code: string; date: string; name: string; email: string; phone: string; gross: number; net: number; rowNumber?: number; issue?: string };

const products = [
  { name: "Precificação para oficinas", price: 197 },
  { name: "Produtividade para oficinas", price: 97 },
  { name: "Calculadora de precificação", price: 497 },
  { name: "Treinamento OAP", price: 1197 },
  { name: "Mentoria OAG", price: 10000 },
] as const;
const leadSources = ["Quiz", "Cadastro", "Direct", "Tráfego"] as const;
const legacySources: Record<string, string> = {
  "Formulário mentoria": "Formulário",
  Instagram: "Direct",
  Indicação: "Cadastro",
  Evento: "Tráfego",
  YouTube: "Quiz",
};
const normalizeSource = (source: string) => legacySources[source] || (leadSources.includes(source as typeof leadSources[number]) ? source : "Cadastro");
const isGenericFormSource = (source: string) => source.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "formulario";
const groupedOriginName = (source: string) => {
  const normalized = source.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(manychat|many chat)\b/.test(normalized)) return "Forms - Manychat";
  if (/\b(story|stories|storie)\b/.test(normalized)) return "Forms - Story";
  if (/\b(bio|biografia)\b/.test(normalized)) return "Forms - Biografia";
  if (/\byoutube\b/.test(normalized)) return "Forms - Youtube";
  if (normalized === "formulario" || normalized === "forms" || normalized === "form") return "Forms - Sem especificação";
  return source.trim() || "Origem não informada";
};
const normalizeQuestion = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const answersForLead = (lead: Lead) => allQuestions.map((question) => {
  const answer = lead.application?.answers?.find((item) => normalizeQuestion(item.pergunta) === normalizeQuestion(question.label));
  const formLead = Boolean(lead.application || lead.notes?.toLowerCase().includes("formulário") || lead.source.toLowerCase().startsWith("forms"));
  const fallback = formLead && question.id === "whatsapp" ? lead.phone : formLead && question.id === "nome" ? lead.name : "";
  return { numero: question.number, pergunta: question.label, resposta: answer?.resposta?.trim() || fallback.trim() || "Não preenchido" };
});
const productPrice = (product?: string) => products.find((item) => item.name === product)?.price || 0;
const netForValue = (value: number, productName: string | undefined, catalog: ProductDefinition[]) => { const product = catalog.find((item) => item.name === productName); if (!product?.price) return value; return value * ((product.netPrice ?? product.price) / product.price); };
const productLadder = (catalog: ProductDefinition[]) => [...catalog];
const purchasesForLead = (lead: Lead, catalog: ProductDefinition[]): Purchase[] => lead.purchases !== undefined ? lead.purchases : lead.stage === "Fechado" && lead.closedAt ? [{ id: `legacy-${lead.id}`, origin: "pipeline", product: lead.product || "Não informado", source: lead.source, value: lead.value, netValue: lead.netValue ?? netForValue(lead.value, lead.product, catalog), closedAt: lead.closedAt, repurchase: false }] : [];
// O banco remove o campaignId quando uma campanha é excluída, mas preserva a
// compra. O código externo mantém a origem importada identificável.
const isCampaignPurchase = (purchase: Purchase) => purchase.origin === "campaign" || (purchase.origin === undefined && !purchase.id.startsWith("ascension-") && Boolean(purchase.campaignId || purchase.externalSaleCode));
type Channel = "organic" | "traffic" | "all";
const isTrafficSource = (source?: string) => source?.trim().toLowerCase() === "tráfego" || source?.trim().toLowerCase() === "trafego";
const isTrafficLead = (lead: Lead) => isTrafficSource(lead.source)
  || Boolean(lead.tags?.some((tag) => isTrafficSource(tag)))
  || purchasesForLead(lead, []).some((purchase) => isCampaignPurchase(purchase) || isTrafficSource(purchase.source));
const purchaseMatchesChannel = (purchase: Purchase, lead: Lead, channel: Channel) => {
  if (channel === "all") return true;
  const traffic = isCampaignPurchase(purchase) || isTrafficSource(purchase.source || lead.source) || Boolean(lead.tags?.some((tag) => isTrafficSource(tag)));
  return channel === "traffic" ? traffic : !traffic;
};
const purchasesForCampaignAll = (leads: Lead[], campaignId: string, catalog: ProductDefinition[]) => leads.flatMap((lead) => purchasesForLead(lead, catalog)).filter((purchase) => purchase.campaignId === campaignId);
const brazilDateKey = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const brazilMonthKey = (value?: string | Date) => brazilDateKey(value).slice(0, 7);
const inMonth = (date: string | undefined, month: string) => brazilMonthKey(date) === month;
const inRange = (date: string | undefined, start: string, end: string) => { const key = brazilDateKey(date); return Boolean(key && key >= start && key <= end); };
const formatEventDate = (date?: string) => date ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(date)) : "Ainda não ocorreu";
const dateInputValue = (date?: string) => brazilDateKey(date);
const dateFromInput = (date: string) => date ? new Date(`${date}T12:00:00-03:00`).toISOString() : undefined;
const addMonths = (date: string, months: number) => { const [year, month, day] = date.slice(0, 10).split("-").map(Number); const target = new Date(year, month - 1 + months, 1); const safeDay = Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()); return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`; };
const buildInstallments = (purchaseId: string, total: number, count: number, firstDueDate: string): Installment[] => { const cents = Math.round(Math.max(0, total) * 100); const base = Math.floor(cents / count); return Array.from({ length: count }, (_, index) => ({ id: `${purchaseId}-${index + 1}`, number: index + 1, dueDate: addMonths(firstDueDate, index), amount: (base + (index === 0 ? cents - base * count : 0)) / 100, status: "Previsto" })); };
const safeCampaignDate = (date?: string, month?: string) => {
  const candidate = String(date || (month ? `${month}-01` : "")).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : "";
};
const formatCampaignDate = (date?: string, month?: string) => {
  const candidate = safeCampaignDate(date, month);
  if (!candidate) return "Data não informada";
  const parsed = new Date(`${candidate}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR").format(parsed);
};
const tagColor = (tag: string) => {
  const palette = ["#2f9ed1", "#8b6bd6", "#d28a3f", "#36a879", "#d05f76", "#667fd1", "#b576c7", "#32a6a0", "#c76b3f", "#7a9f35", "#b35c9d"];
  return palette[[...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
};
const stageColor = (stage: string) => {
  const palette = ["#5aaee8", "#37b6a0", "#8f78dd", "#e5a442", "#df6f7d", "#55b86d", "#d47abe", "#6e92e5", "#d67b4e", "#70a94c", "#a56bd0", "#3ab1c4"];
  return palette[[...`etapa-${stage}`].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
};
const productColor = (product: string) => {
  const knownProducts: Record<string, string> = {
    "Precificação para oficinas": "#e58b48",
    "Produtividade para oficinas": "#42a99b",
    "Calculadora de precificação": "#8b73d6",
    "Treinamento OAP": "#d25f80",
    "Oficina de Alta Performance - OAP": "#d25f80",
    "Mentoria OAG": "#4f83d7",
    "Treinamento Presencial": "#78a642",
  };
  if (knownProducts[product]) return knownProducts[product];
  const palette = ["#f08a4b", "#af72db", "#3db8b0", "#e05d8d", "#88a83d", "#597ed8", "#d3a23e", "#47a86d", "#c06bc0", "#cf6656", "#718fd2", "#42a5bd"];
  return palette[[...`produto-${product}`].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
};
const hydrateLeadDates = (lead: Lead, createdAt: string): Lead => ({ ...lead, createdAt, conversationAt: lead.conversationAt || (lead.stage !== "Novo lead" ? createdAt : undefined), meetingAt: lead.meetingAt || (["Reunião agendada", "Proposta", "Fechado"].includes(lead.stage) ? createdAt : undefined), proposalAt: lead.proposalAt || (["Proposta", "Fechado"].includes(lead.stage) ? createdAt : undefined), closedAt: lead.closedAt || (lead.stage === "Fechado" ? createdAt : undefined) });

const defaultStages: Stage[] = [
  "Novo lead",
  "Primeiro contato",
  "Em conversação",
  "Reunião agendada",
  "Proposta",
  "Fechado",
];
const initialLeads: Lead[] = [];
const goalsStorageKey = "mensor-crm-goals-v2";
const uniqueId = () => crypto.randomUUID();
const phoneKey = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
};
const leadIdentityMatch = (left: Lead, right: Lead) => {
  const leftEmail = left.email.trim().toLowerCase();
  const rightEmail = right.email.trim().toLowerCase();
  const leftPhone = phoneKey(left.phone);
  const rightPhone = phoneKey(right.phone);
  return Boolean((leftEmail && rightEmail && leftEmail === rightEmail) || (leftPhone && rightPhone && leftPhone === rightPhone));
};
const isDisqualifiedLead = (lead: Lead) => (lead.tags || []).some((tag) => tag.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "desqualificado");
const mergeLeadData = (current: Lead, incoming: Lead): Lead => {
  const purchases = [...purchasesForLead(current, [])];
  for (const purchase of purchasesForLead(incoming, [])) {
    const index = purchases.findIndex((item) => item.id === purchase.id
      || Boolean(item.externalSaleCode && purchase.externalSaleCode && item.externalSaleCode === purchase.externalSaleCode)
      || (item.product === purchase.product && Math.abs(item.value - purchase.value) < .005 && brazilDateKey(item.closedAt) === brazilDateKey(purchase.closedAt)));
    if (index >= 0) purchases[index] = { ...purchases[index], ...purchase };
    else purchases.push({ ...purchase, repurchase: purchases.length > 0 || purchase.repurchase });
  }
  return {
    ...current,
    name: current.name || incoming.name,
    company: current.company || incoming.company,
    phone: current.phone || incoming.phone,
    email: current.email || incoming.email,
    notes: [current.notes, incoming.notes].filter(Boolean).filter((item, index, all) => all.indexOf(item) === index).join("\n"),
    tags: Array.from(new Set([...(current.tags || []), ...(incoming.tags || [])])),
    ...(incoming.stage === "Fechado" && purchasesForLead(incoming, []).length ? { stage: incoming.stage, product: incoming.product, value: incoming.value, netValue: incoming.netValue, closedAt: incoming.closedAt } : {}),
    purchases,
  };
};
const mergeLeadCollections = (current: Lead[], incoming: Lead[]) => {
  const merged = [...current];
  for (const lead of incoming) {
    const index = merged.findIndex((item) => item.id === lead.id || leadIdentityMatch(item, lead));
    if (index >= 0) merged[index] = mergeLeadData(merged[index], lead);
    else merged.unshift(lead);
  }
  return merged;
};
const filterLeadsByProduct = (leads: Lead[], product: string, catalog: ProductDefinition[]) => {
  if (product === "Todos") return leads;
  return leads.flatMap((lead) => {
    const purchases = purchasesForLead(lead, catalog).filter((purchase) => purchase.product === product);
    if (lead.product !== product && !purchases.length) return [];
    return [{ ...lead, purchases }];
  });
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const accountingNumber = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function Money({ value }: { value: number }) {
  return <span className={styles.money}><small>R$</small><span>{accountingNumber.format(value)}</span></span>;
}
const channelStats = (channelLeads: Lead[], channel: Channel, start: string, end: string, catalog: ProductDefinition[]) => {
  const reporting = channelLeads.filter((lead) => inRange(lead.createdAt, start, end));
  const open = channelLeads.filter((lead) => lead.stage === "Proposta" && inRange(lead.proposalAt, start, end));
  const won = channelLeads.flatMap((lead) => purchasesForLead(lead, catalog).filter((purchase) => purchaseMatchesChannel(purchase, lead, channel)));
  const periodWon = won.filter((purchase) => inRange(purchase.closedAt, start, end));
  const closedLeads = channelLeads.filter((lead) => purchasesForLead(lead, catalog).some((purchase) => purchaseMatchesChannel(purchase, lead, channel) && inRange(purchase.closedAt, start, end)));
  const proposals = channelLeads.filter((lead) => inRange(lead.proposalAt, start, end));
  const proposalValue = proposals.reduce((sum, lead) => sum + lead.value, 0);
  const wonValue = periodWon.reduce((sum, purchase) => sum + purchase.value, 0);
  return {
    total: reporting.length,
    meetings: channelLeads.filter((lead) => inRange(lead.meetingAt, start, end)).length,
    proposals: proposals.length,
    closed: closedLeads.length,
    sales: periodWon.length,
    openValue: open.reduce((sum, lead) => sum + lead.value, 0),
    wonValue,
    netWonValue: periodWon.reduce((sum, purchase) => sum + purchase.netValue, 0),
    conversion: reporting.length ? closedLeads.length / reporting.length * 100 : 0,
    proposalConversion: proposals.length ? closedLeads.length / proposals.length * 100 : 0,
    proposalValue,
    valueConversion: proposalValue ? wonValue / proposalValue * 100 : 0,
    hot: reporting.filter((lead) => lead.temperature === "Quente" && lead.stage !== "Fechado").length,
  };
};
const whatsappLink = (lead: Lead) => {
  const digits = lead.phone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = lead.name.trim().split(" ")[0];
  const message = `Olá, ${firstName}! Tudo bem? Aqui é da Mensor Treinamentos. Recebi seu contato e queria entender melhor o momento da sua oficina.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function CRM() {
  const [view, setView] = useState<View>("geral");
  const [access, setAccess] = useState<{ isAdmin: boolean; permissions: CrmModule[] }>({ isAdmin: false, permissions: [] });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map((lead) => hydrateLeadDates(lead, new Date().toISOString())));
  const leadsRef = useRef<Lead[]>(leads);
  const localDataRevision = useRef(0);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => brazilMonthKey(new Date()));
  const [dashboardProduct, setDashboardProduct] = useState("Todos");
  const [dateRange, setDateRange] = useState(() => { const now = new Date(); const month = brazilMonthKey(now); const [year, monthNumber] = month.split("-").map(Number); return { start: `${month}-01`, end: `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}` }; });
  const [traffic, setTraffic] = useState<TrafficRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDefinition[]>([...products]);
  const [catalogSources, setCatalogSources] = useState<string[]>([...leadSources]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState<"connecting" | "saving" | "connected" | "offline">("connecting");
  const [databaseIssue, setDatabaseIssue] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const syncRequest = useRef(0);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const skipNextSnapshotSync = useRef(false);
  const leadSaveTimers = useRef<Map<string, number>>(new Map());
  const notificationAudio = useRef<AudioContext | null>(null);
  const [syncRevision, setSyncRevision] = useState(0);
  const [pipelineStages, setPipelineStages] = useState<Stage[]>(defaultStages);
  const [closers, setClosers] = useState<Closer[]>([]);

  useEffect(() => { leadsRef.current = leads; }, [leads]);
  useEffect(() => {
    const enableNotificationAudio = () => {
      if (!notificationAudio.current) notificationAudio.current = new AudioContext();
      if (notificationAudio.current.state === "suspended") void notificationAudio.current.resume();
    };
    window.addEventListener("pointerdown", enableNotificationAudio, { once: true });
    window.addEventListener("keydown", enableNotificationAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", enableNotificationAudio);
      window.removeEventListener("keydown", enableNotificationAudio);
      if (notificationAudio.current) void notificationAudio.current.close();
      notificationAudio.current = null;
    };
  }, []);
  const playNewLeadNotification = () => {
    const context = notificationAudio.current;
    if (!context || context.state !== "running") return;
    const now = context.currentTime;
    [0, .16].forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(index ? 880 : 660, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(.16, now + delay + .015);
      gain.gain.exponentialRampToValueAtTime(.001, now + delay + .22);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(now + delay); oscillator.stop(now + delay + .24);
    });
  };
  useEffect(() => { if (!loaded) return; void fetch(`/api/crm/closers?month=${selectedMonth}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setClosers(data.closers || [])).catch(() => setClosers([])); }, [loaded, selectedMonth]);

  const registerDatabaseFailure = async (response?: Response) => {
    if (!response) { setDatabaseIssue("Falha de rede"); setDatabaseStatus("offline"); return; }
    let detail = "Erro na sincronização";
    try {
      const body = await response.json();
      const labels: Record<string, string> = {
        "session-missing": "Sessão não identificada",
        "email-not-allowed": "E-mail sem autorização",
        "auth-unavailable": "Autenticação indisponível",
        "database-unavailable": "Falha ao ler o banco",
        "database-write-failed": "Falha ao gravar no banco",
        "crm-meeting-scheduled-for-migration-required": "A data da reunião ainda não está habilitada no banco",
        "crm-meeting-outcome-migration-required": "O resultado da reunião ainda não está habilitado no banco",
        "crm-follow-up-at-migration-required": "A data de retorno ainda não está habilitada no banco",
      };
      detail = labels[body.error] || detail;
      if (body.account) detail += ` · ${body.account}`;
      if (body.code) detail += ` · código ${body.code}`;
    } catch { detail += ` · HTTP ${response.status}`; }
    setDatabaseIssue(detail);
    setDatabaseStatus("offline");
  };

  useEffect(() => { const savedTheme = localStorage.getItem("mensor-crm-theme"); if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme); }, []);
  const toggleTheme = () => setTheme((current) => { const next = current === "dark" ? "light" : "dark"; localStorage.setItem("mensor-crm-theme", next); return next; });

  useEffect(() => {
    setLoaded(true);
    localStorage.removeItem("mensor-crm-v2");
    localStorage.removeItem("mensor-crm-v3");
    localStorage.removeItem("mensor-crm-traffic-v1");
    localStorage.removeItem("mensor-crm-traffic-v2");
    localStorage.removeItem("mensor-crm-products-v1");
    localStorage.removeItem("mensor-crm-sources-v1");
  }, []);
  const saveCampaign = async (record: TrafficRecord) => {
    setDatabaseStatus("saving");
    setDatabaseIssue("");
    const persist = async () => {
      const response = await fetch("/api/crm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "traffic", record }) });
      if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao salvar campanha"); }
      skipNextSnapshotSync.current = true;
      setTraffic((current) => current.some((item) => item.id === record.id) ? current.map((item) => item.id === record.id ? record : item) : [record, ...current]);
      setDatabaseIssue("");
      setDatabaseStatus("connected");
    };
    syncQueue.current = syncQueue.current.catch(() => undefined).then(persist);
    await syncQueue.current;
  };
  const removeCampaign = async (id: string) => {
    setDatabaseStatus("saving");
    setDatabaseIssue("");
    const persist = async () => {
      const response = await fetch("/api/crm", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "traffic", id }) });
      if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao excluir campanha"); }
      skipNextSnapshotSync.current = true;
      setTraffic((current) => current.filter((item) => item.id !== id));
      setLeads((current) => current.map((lead) => ({
        ...lead,
        purchases: lead.purchases?.map((purchase) => purchase.campaignId === id ? { ...purchase, origin: "campaign" as const, campaignId: undefined } : purchase),
      })));
      setDatabaseIssue("");
      setDatabaseStatus("connected");
    };
    syncQueue.current = syncQueue.current.catch(() => undefined).then(persist);
    await syncQueue.current;
  };
  const persistImportBatch = async (nextLeads: Lead[], nextTraffic: TrafficRecord[], changedLeads: LeadImportRecord[], changedTraffic: TrafficRecord[] = []) => {
    setDatabaseStatus("saving"); setDatabaseIssue("");
    const persist = async () => {
      const response = await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leads: changedLeads, traffic: changedTraffic }) });
      if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao salvar importação"); }
      skipNextSnapshotSync.current = true;
      setLeads(nextLeads); setTraffic(nextTraffic); setDatabaseIssue(""); setDatabaseStatus("connected");
    };
    syncQueue.current = syncQueue.current.catch(() => undefined).then(persist);
    await syncQueue.current;
  };
  const saveLead = async (lead: Lead) => {
    setDatabaseStatus("saving");
    setDatabaseIssue("");
    const persist = async () => {
      const response = await fetch("/api/crm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "lead", record: lead }) });
      if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao salvar lead"); }
      const result = await response.json();
      const expectedTags = JSON.stringify([...(lead.tags || [])].sort());
      const savedTags = JSON.stringify([...(result.saved?.tags || [])].sort());
      const expectedMeetingDate = lead.meetingScheduledFor ? brazilDateKey(lead.meetingScheduledFor) : null;
      const savedMeetingDate = result.saved?.meetingScheduledFor ? brazilDateKey(result.saved.meetingScheduledFor) : null;
      const expectedMeetingOutcome = lead.meetingOutcome || null;
      const savedMeetingOutcome = result.saved?.meetingOutcome || null;
      const sameDate = (expected?: string | null, saved?: string | null) => (expected ? brazilDateKey(expected) : null) === (saved ? brazilDateKey(saved) : null);
      const journeyConfirmed = sameDate(lead.createdAt, result.saved?.createdAt) && sameDate(lead.conversationAt, result.saved?.conversationAt) && sameDate(lead.meetingAt, result.saved?.meetingAt) && savedMeetingDate === expectedMeetingDate && sameDate(lead.followUpAt, result.saved?.followUpAt) && sameDate(lead.proposalAt, result.saved?.proposalAt) && sameDate(lead.closedAt, result.saved?.closedAt);
      if (result.saved?.stage !== lead.stage || (result.saved?.product || undefined) !== (lead.product || undefined) || savedTags !== expectedTags || !journeyConfirmed || savedMeetingOutcome !== expectedMeetingOutcome) {
        setDatabaseIssue("O banco não confirmou todos os dados do lead"); setDatabaseStatus("offline");
        throw new Error("Confirmação do banco divergente");
      }
      skipNextSnapshotSync.current = true;
      setDatabaseIssue("");
      setDatabaseStatus("connected");
      setLastSavedAt(new Date());
    };
    syncQueue.current = syncQueue.current.catch(() => undefined).then(persist);
    await syncQueue.current;
  };
  const toggleContactToday = (id: string) => {
    const lead = leadsRef.current.find((item) => item.id === id);
    if (!lead) return;
    const today = brazilDateKey(new Date());
    const checkpoints = lead.contactCheckpoints || [];
    const doneToday = checkpoints.some((checkpoint) => brazilDateKey(checkpoint) === today);
    const updated = { ...lead, contactCheckpoints: doneToday ? checkpoints.filter((checkpoint) => brazilDateKey(checkpoint) !== today) : [...checkpoints, new Date().toISOString()] };
    const next = leadsRef.current.map((item) => item.id === id ? updated : item);
    leadsRef.current = next;
    localDataRevision.current += 1;
    setLeads(next);
    setSelected((current) => current?.id === id ? updated : current);
    void saveLead(updated).catch((error) => console.error("Falha ao registrar contato com o lead", error));
  };
  const scheduleLeadSave = (lead: Lead) => {
    setDatabaseStatus("saving");
    setDatabaseIssue("");
    const existing = leadSaveTimers.current.get(lead.id);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      leadSaveTimers.current.delete(lead.id);
      void saveLead(lead).catch((error) => console.error("Falha ao salvar lead", error));
    }, 600);
    leadSaveTimers.current.set(lead.id, timer);
  };
  const flushLeadSave = (id: string) => {
    const timer = leadSaveTimers.current.get(id);
    if (!timer) return;
    window.clearTimeout(timer);
    leadSaveTimers.current.delete(id);
    const lead = leadsRef.current.find((item) => item.id === id);
    if (lead) void saveLead(lead).catch((error) => console.error("Falha ao salvar lead", error));
  };
  const flushAllLeadSaves = () => {
    for (const [id, timer] of leadSaveTimers.current) {
      window.clearTimeout(timer); leadSaveTimers.current.delete(id);
      const lead = leadsRef.current.find((item) => item.id === id);
      if (lead) void saveLead(lead).catch((error) => console.error("Falha ao salvar lead", error));
    }
  };
  const deleteRecord = async (entity: "lead" | "purchase" | "product" | "source" | "message" | "stage" | "expense", id: string) => {
    const persist = async () => {
      const response = await fetch("/api/crm", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id }) });
      if (!response.ok) { await registerDatabaseFailure(response); throw new Error(`Falha ao excluir ${entity}`); }
    };
    syncQueue.current = syncQueue.current.catch(() => undefined).then(persist);
    try { await syncQueue.current; return true; }
    catch (error) { console.error(`Falha ao excluir ${entity}`, error); return false; }
  };
  const saveExpense = async (record: Expense) => {
    setDatabaseStatus("saving"); setDatabaseIssue("");
    const response = await fetch("/api/crm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "expense", record }) });
    if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao salvar despesa"); }
    setExpenses((current) => current.some((item) => item.id === record.id) ? current.map((item) => item.id === record.id ? record : item) : [record, ...current]);
    setDatabaseStatus("connected"); setLastSavedAt(new Date());
  };
  const removeExpense = async (id: string) => { if (!await deleteRecord("expense", id)) return; setExpenses((current) => current.filter((item) => item.id !== id)); };
  const saveCloserGoal = async (closerId: string, month: string, amount: number) => {
    const response = await fetch("/api/crm/closers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ closerId, month, amount }) });
    if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao salvar meta da closer"); }
    setClosers((current) => current.map((closer) => closer.id === closerId ? { ...closer, goal: amount } : closer));
  };
  useEffect(() => { setCatalogLoaded(true); }, []);
  const saveProducts = (next: ProductDefinition[]) => setCatalogProducts(next);
  const saveSources = (next: string[]) => setCatalogSources(next);
  const renameRecord = async (entity: "product-rename" | "source-rename", oldId: string, newId: string) => {
    if (oldId === newId) return true;
    const response = await fetch("/api/crm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, oldId, newId }) });
    if (response.ok) return true;
    await registerDatabaseFailure(response);
    return false;
  };
  const renameProduct = async (oldName: string, product: ProductDefinition) => { if (!await renameRecord("product-rename", oldName, product.name)) return; setCatalogProducts((current) => current.map((item) => item.name === oldName ? product : item)); setLeads((current) => current.map((lead) => lead.product === oldName ? { ...lead, product: product.name } : lead)); setTraffic((current) => current.map((item) => item.product === oldName ? { ...item, product: product.name } : item)); };
  const renameSource = async (oldName: string, name: string) => { if (!await renameRecord("source-rename", oldName, name)) return; setCatalogSources((current) => current.map((item) => item === oldName ? name : item)); setLeads((current) => current.map((lead) => lead.source === oldName ? { ...lead, source: name } : lead)); };

  useEffect(() => {
    const handleLocalChange = () => setSyncRevision((value) => value + 1);
    window.addEventListener("mensor-crm-change", handleLocalChange);
    return () => window.removeEventListener("mensor-crm-change", handleLocalChange);
  }, []);
  useEffect(() => {
    if (!loaded || !catalogLoaded || databaseReady) return;
    let cancelled = false;
    const connectDatabase = async () => {
      try {
        const response = await fetch("/api/crm", { cache: "no-store" });
        if (!response.ok) { await registerDatabaseFailure(response); return; }
        const remote = await response.json();
        if (cancelled) return;
        setAccess({ isAdmin: Boolean(remote.access?.isAdmin), permissions: Array.isArray(remote.access?.permissions) ? remote.access.permissions : [] });
        skipNextSnapshotSync.current = true;
        const remoteLeads = mergeLeadCollections([], (remote.leads || []).map((lead: Lead) => lead.stage === "Contato feito" ? { ...lead, stage: "Primeiro contato" } : lead));
        setLeads(remoteLeads);
        setTraffic(remote.traffic || []);
        setExpenses(remote.expenses || []);
        setCatalogProducts(remote.products?.length ? remote.products : [...products]);
        setCatalogSources(remote.sources?.length ? remote.sources : [...leadSources]);
        setPipelineStages(remote.stages?.length ? remote.stages : defaultStages);
        localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(remote.messages || []));
        localStorage.setItem(goalsStorageKey, JSON.stringify(remote.goals || {}));
        window.dispatchEvent(new Event("mensor-crm-database-loaded"));
        setDatabaseIssue("");
        setDatabaseStatus("connected");
        if (!cancelled) setDatabaseReady(true);
      } catch (error) { await registerDatabaseFailure(); console.error("Falha ao conectar CRM ao banco", error); }
    };
    connectDatabase();
    return () => { cancelled = true; };
  }, [loaded, catalogLoaded, databaseReady]);
  useEffect(() => {
    if (!databaseReady) return;
    if (skipNextSnapshotSync.current) {
      skipNextSnapshotSync.current = false;
      return;
    }
    setDatabaseStatus("saving");
    setDatabaseIssue("");
    const timeout = window.setTimeout(() => {
      const requestId = ++syncRequest.current;
      // Leads e campanhas possuem salvamentos granulares próprios. Reenviar a
      // coleção inteira aqui permitia que uma aba antiga sobrescrevesse etapa,
      // produto ou etiquetas recém-salvos por outra operação.
      const mayEditDetails = access.isAdmin || access.permissions.includes("mensagens");
      const mayEditPipeline = access.isAdmin || access.permissions.includes("pipeline");
      const mayEditGoals = access.isAdmin || access.permissions.some((permission) => ["geral", "comercial", "trafego"].includes(permission));
      const snapshot = JSON.stringify({
        products: mayEditDetails ? catalogProducts : [],
        sources: mayEditDetails ? catalogSources : [],
        stages: mayEditPipeline ? pipelineStages : [],
        messages: mayEditDetails ? JSON.parse(localStorage.getItem("mensor-crm-messages-v1") || "[]") : [],
        goals: mayEditGoals ? JSON.parse(localStorage.getItem(goalsStorageKey) || "{}") : {},
      });
      syncQueue.current = syncQueue.current.catch(() => undefined).then(async () => {
        const response = await fetch("/api/crm", { method: "PUT", headers: { "Content-Type": "application/json" }, body: snapshot });
        if (!response.ok) { if (requestId === syncRequest.current) await registerDatabaseFailure(response); throw new Error("Falha ao sincronizar CRM"); }
        if (requestId === syncRequest.current) { setDatabaseIssue(""); setDatabaseStatus("connected"); }
      }).catch((error) => { if (requestId !== syncRequest.current) return; void registerDatabaseFailure(); console.error("Falha ao sincronizar CRM", error); });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [databaseReady, catalogProducts, catalogSources, pipelineStages, syncRevision, access.isAdmin, access.permissions]);
  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (databaseStatus !== "saving") return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [databaseStatus]);
  useEffect(() => {
    if (!databaseReady) return;
    let refreshing = false;
    const refreshFromDatabase = async () => {
      // "offline" indica que a última gravação falhou (ou não foi confirmada) e
      // ainda não houve nova tentativa: buscar o remoto agora sobrescreveria a
      // alteração local com o dado antigo do banco. Só atualiza quando sabemos
      // que local e remoto estão sincronizados.
      if (refreshing || databaseStatus !== "connected") return;
      refreshing = true;
      const revisionAtStart = localDataRevision.current;
      try {
        const response = await fetch("/api/crm", { cache: "no-store" });
        if (!response.ok) { await registerDatabaseFailure(response); return; }
        const remote = await response.json();
        // Se houve uma edição enquanto a leitura estava em andamento, a
        // resposta já nasceu antiga e não pode substituir o estado local.
        if (revisionAtStart !== localDataRevision.current) return;
        const remoteLeads = mergeLeadCollections([], (remote.leads || []).map((lead: Lead) => lead.stage === "Contato feito" ? { ...lead, stage: "Primeiro contato" } : lead));
        const knownIds = new Set(leadsRef.current.map((lead) => lead.id));
        if (remoteLeads.some((lead) => !knownIds.has(lead.id))) playNewLeadNotification();
        leadsRef.current = remoteLeads;
        setAccess({ isAdmin: Boolean(remote.access?.isAdmin), permissions: Array.isArray(remote.access?.permissions) ? remote.access.permissions : [] });
        skipNextSnapshotSync.current = true;
        setLeads(remoteLeads);
        setTraffic(remote.traffic || []);
        setExpenses(remote.expenses || []);
        setCatalogProducts(remote.products?.length ? remote.products : [...products]);
        setCatalogSources(remote.sources?.length ? remote.sources : [...leadSources]);
        setPipelineStages(remote.stages?.length ? remote.stages : defaultStages);
        localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(remote.messages || []));
        localStorage.setItem(goalsStorageKey, JSON.stringify(remote.goals || {}));
        window.dispatchEvent(new Event("mensor-crm-database-loaded"));
        setDatabaseIssue("");
        setDatabaseStatus("connected");
      } catch (error) {
        await registerDatabaseFailure();
        console.error("Falha ao atualizar CRM pelo banco", error);
      } finally {
        refreshing = false;
      }
    };
    window.addEventListener("focus", refreshFromDatabase);
    document.addEventListener("visibilitychange", refreshFromDatabase);
    const interval = window.setInterval(refreshFromDatabase, 15_000);
    return () => {
      window.removeEventListener("focus", refreshFromDatabase);
      document.removeEventListener("visibilitychange", refreshFromDatabase);
      window.clearInterval(interval);
    };
  }, [databaseReady, databaseStatus]);

  const organicLeads = useMemo(() => leads.filter((lead) => !isTrafficLead(lead)), [leads]);
  const trafficLeads = useMemo(() => leads.filter(isTrafficLead), [leads]);
  const filteredOrganicLeads = useMemo(() => filterLeadsByProduct(organicLeads, dashboardProduct, catalogProducts), [organicLeads, dashboardProduct, catalogProducts]);
  const filteredCatalogProducts = useMemo(() => dashboardProduct === "Todos" ? catalogProducts : catalogProducts.filter((product) => product.name === dashboardProduct), [catalogProducts, dashboardProduct]);
  const stats = useMemo(() => channelStats(filteredOrganicLeads, "organic", dateRange.start, dateRange.end, catalogProducts), [filteredOrganicLeads, dateRange, catalogProducts]);
  const trafficDashboardLeads = useMemo(() => {
    const campaignFallbacks = traffic.flatMap((campaign) => {
      if (purchasesForCampaignAll(leads, campaign.id, catalogProducts).length) return [];
      const units = Math.max(campaign.sales, campaign.revenue ? 1 : 0);
      const closedAt = dateFromInput(campaign.date || `${campaign.month}-01`) || `${campaign.month}-01T12:00:00.000Z`;
      return Array.from({ length: units }, (_, index): Lead => {
        const gross = units ? campaign.revenue / units : 0;
        const net = units ? (campaign.netRevenue ?? netForValue(campaign.revenue, campaign.product, catalogProducts)) / units : 0;
        const purchase: Purchase = { id: `campaign-summary-${campaign.id}-${index}`, origin: "campaign", campaignId: campaign.id, source: "Tráfego", product: campaign.product, value: gross, netValue: net, closedAt, repurchase: false };
        return { id: `campaign-summary-lead-${campaign.id}-${index}`, name: campaign.campaign, company: "Campanha de tráfego", phone: "", email: "", source: "Tráfego", product: campaign.product, stage: "Fechado", value: gross, netValue: net, temperature: "Quente", nextAction: "", date: closedAt, closedAt, purchases: [purchase] };
      });
    });
    return [...trafficLeads, ...campaignFallbacks];
  }, [trafficLeads, traffic, leads, catalogProducts]);
  const filteredTrafficDashboardLeads = useMemo(() => filterLeadsByProduct(trafficDashboardLeads, dashboardProduct, catalogProducts), [trafficDashboardLeads, dashboardProduct, catalogProducts]);
  const filteredOverviewLeads = useMemo(() => filterLeadsByProduct(leads, dashboardProduct, catalogProducts), [leads, dashboardProduct, catalogProducts]);
  const filteredOverviewTraffic = useMemo(() => dashboardProduct === "Todos" ? traffic : traffic.filter((campaign) => campaign.product === dashboardProduct), [traffic, dashboardProduct]);
  const trafficStats = useMemo(() => channelStats(filteredTrafficDashboardLeads, "traffic", dateRange.start, dateRange.end, catalogProducts), [filteredTrafficDashboardLeads, dateRange, catalogProducts]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads.filter((lead) => !isDisqualifiedLead(lead));
    return leads.filter((lead) => `${lead.name} ${lead.company} ${lead.email} ${lead.phone}`.toLowerCase().includes(term));
  }, [leads, search]);
  const transitionLead = (lead: Lead, stage: Stage, now = new Date().toISOString()): Lead => {
    const catalogProduct = catalogProducts.find((item) => item.name === lead.product);
    const value = lead.value || catalogProduct?.price || productPrice(lead.product) || 0;
    const netValue = lead.netValue ?? catalogProduct?.netPrice ?? catalogProduct?.price ?? value;
    const normalizedStage = stage.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (normalizedStage === "desqualificado") return { ...lead, stage, tags: Array.from(new Set([...(lead.tags || []), "Desqualificado"])) };
    if (stage === "Proposta") return { ...lead, stage, value, netValue, proposalAt: lead.proposalAt || now };
    // A etapa Fechado organiza a pipeline. A receita só é criada pelo formulário
    // "+ Adicionar fechamento" no card do cliente.
    if (stage === "Fechado") return { ...lead, stage };
    return { ...lead, stage, value: 0, ...(stage === "Primeiro contato" || stage === "Em conversação" ? { conversationAt: lead.conversationAt || now } : {}), ...(stage === "Reunião agendada" ? { meetingAt: lead.meetingAt || now } : {}) };
  };
  const moveLead = (id: string, stage: Stage, now = new Date().toISOString()) => {
    const lead = leadsRef.current.find((item) => item.id === id);
    if (!lead) return;
    const pendingSave = leadSaveTimers.current.get(id);
    if (pendingSave) { window.clearTimeout(pendingSave); leadSaveTimers.current.delete(id); }
    const updated = transitionLead(lead, stage, now);
    const next = leadsRef.current.map((item) => item.id === id ? updated : item);
    leadsRef.current = next; localDataRevision.current += 1;
    setLeads(next);
    void saveLead(updated).catch((error) => console.error("Falha ao salvar movimentação do lead", error));
  };
  const addLead = async (lead: Lead) => {
    await saveLead(lead);
    setLeads((current) => mergeLeadCollections(current, [lead]));
    setAdding(false);
  };
  const importCampaignSales = async (campaign: TrafficRecord, sales: ImportedSale[]) => {
    const uniqueSales = Array.from(new Map(sales.map((sale) => [sale.code.trim(), sale])).values());
    const next = [...leads];
    const touchedCampaignIds = new Set([campaign.id]);
    for (const sale of uniqueSales) {
      const codedLeadIndex = next.findIndex((lead) => purchasesForLead(lead, catalogProducts).some((purchase) => purchase.externalSaleCode === sale.code));
      if (codedLeadIndex >= 0) {
        const codedHistory = purchasesForLead(next[codedLeadIndex], catalogProducts);
        const codedPurchaseIndex = codedHistory.findIndex((purchase) => purchase.externalSaleCode === sale.code);
        const codedPurchase = codedHistory[codedPurchaseIndex];
        if (codedPurchase.campaignId) touchedCampaignIds.add(codedPurchase.campaignId);
        const purchases = codedHistory.map((purchase, purchaseIndex) => purchaseIndex === codedPurchaseIndex
          ? { ...purchase, origin: "campaign" as const, source: "Tráfego", campaignId: campaign.id, product: campaign.product, value: sale.gross, netValue: sale.net, closedAt: sale.date, installments: [{ id: `gateway-${sale.code}-1`, number: 1, dueDate: brazilDateKey(sale.date), amount: sale.net, status: "Recebido" as const, receivedAt: brazilDateKey(sale.date) }] }
          : purchase);
        next[codedLeadIndex] = { ...next[codedLeadIndex], purchases };
        continue;
      }
      let index = next.findIndex((lead) => (sale.email && lead.email.trim().toLowerCase() === sale.email) || (sale.phone && phoneKey(lead.phone) === phoneKey(sale.phone)));
      const existing = index >= 0 ? next[index] : undefined;
      const history = existing ? purchasesForLead(existing, catalogProducts) : [];
      if (history.some((purchase) => purchase.externalSaleCode === sale.code)) continue;
      // Se o lead já possui um fechamento manual deste mesmo produto, a
      // planilha confirma e atualiza esse fechamento. Produto diferente gera
      // uma nova compra, preservando a esteira do cliente.
      const matchingPurchaseIndex = history.findLastIndex((purchase) => !isCampaignPurchase(purchase)
        && purchase.product === campaign.product);
      const paidInstallments: Installment[] = [{ id: `gateway-${sale.code}-1`, number: 1, dueDate: brazilDateKey(sale.date), amount: sale.net, status: "Recebido", receivedAt: brazilDateKey(sale.date) }];
      const purchase: Purchase = matchingPurchaseIndex >= 0
        ? { ...history[matchingPurchaseIndex], origin: "campaign", source: "Tráfego", externalSaleCode: sale.code, campaignId: campaign.id, product: campaign.product, value: sale.gross, netValue: sale.net, closedAt: sale.date, installments: paidInstallments }
        : { id: `gateway-${sale.code}`, origin: "campaign", source: "Tráfego", externalSaleCode: sale.code, campaignId: campaign.id, product: campaign.product, value: sale.gross, netValue: sale.net, closedAt: sale.date, repurchase: history.length > 0, installments: paidInstallments };
      const purchases = matchingPurchaseIndex >= 0
        ? history.map((item, purchaseIndex) => purchaseIndex === matchingPurchaseIndex ? purchase : item)
        : [...history, purchase];
      const base: Lead = existing || { id: `gateway-lead-${sale.code}`, name: sale.name, company: "", phone: sale.phone, email: sale.email, notes: "", tags: [], source: "Tráfego", product: campaign.product, stage: "Novo lead", value: sale.gross, netValue: sale.net, temperature: "Quente", nextAction: "", date: brazilDateKey(sale.date).split("-").reverse().join("/"), createdAt: sale.date };
      const updated: Lead = existing
        ? { ...base, name: base.name || sale.name, phone: base.phone || sale.phone, email: base.email || sale.email, purchases }
        : { ...base, product: campaign.product, stage: "Novo lead", value: sale.gross, netValue: sale.net, closedAt: sale.date, purchases };
      if (index >= 0) next[index] = updated; else { next.unshift(updated); index = 0; }
    }
    const campaignBase = traffic.some((item) => item.id === campaign.id) ? traffic : [campaign, ...traffic];
    const changedCampaigns = campaignBase.filter((item) => touchedCampaignIds.has(item.id)).map((item) => {
      const linked = next.flatMap((lead) => purchasesForLead(lead, catalogProducts)).filter((purchase) => purchase.campaignId === item.id);
      return { ...item, sales: linked.length, revenue: linked.reduce((sum,purchase) => sum + purchase.value,0), netRevenue: linked.reduce((sum,purchase) => sum + purchase.netValue,0) };
    });
    const changedCampaignById = new Map(changedCampaigns.map((item) => [item.id, item]));
    const nextTraffic = campaignBase.map((item) => changedCampaignById.get(item.id) || item);
    const previousLeadById = new Map(leads.map((lead) => [lead.id, lead]));
    const changedLeads = next
      .filter((lead) => JSON.stringify(previousLeadById.get(lead.id)) !== JSON.stringify(lead))
      .map((lead): LeadImportRecord => {
        const previous = previousLeadById.get(lead.id);
        if (!previous) return lead;
        const previousPurchases = new Map(purchasesForLead(previous, catalogProducts).map((purchase) => [purchase.id, JSON.stringify(purchase)]));
        const changedPurchases = purchasesForLead(lead, catalogProducts).filter((purchase) => previousPurchases.get(purchase.id) !== JSON.stringify(purchase));
        return { id: lead.id, purchases: changedPurchases, preserveLeadRecord: true };
      });
    await persistImportBatch(next, nextTraffic, changedLeads, changedCampaigns);
  };
  const startBulkAscension = async (leadIds: string[], product: string) => {
    const definition = catalogProducts.find((item) => item.name === product);
    const selectedIds = new Set(leadIds);
    const next = leads.map((lead) => selectedIds.has(lead.id) ? { ...lead, product, stage: "Novo lead", value: definition?.price || 0, netValue: definition?.netPrice ?? definition?.price ?? 0, nextAction: `Ofertar ${product}`, conversationAt: undefined, meetingAt: undefined, meetingScheduledFor: null, meetingOutcome: null, followUpAt: null, proposalAt: undefined, closedAt: undefined, tags: Array.from(new Set([...(lead.tags || []), `Ascensão: ${product}`])) } : lead);
    await persistImportBatch(next, traffic, next.filter((lead) => selectedIds.has(lead.id)));
  };
  const importAscensionSales = async (product: string, sales: ImportedSale[], newLeadSource: string, sourcesByCode: Record<string, string> = {}) => {
    const next = [...leads];
    for (const sale of sales) {
      if (next.some((lead) => purchasesForLead(lead, catalogProducts).some((purchase) => purchase.externalSaleCode === sale.code))) continue;
      const emailIndex = sale.email ? next.findIndex((lead) => lead.email.trim().toLowerCase() === sale.email) : -1;
      const phoneIndex = sale.phone ? next.findIndex((lead) => phoneKey(lead.phone) === phoneKey(sale.phone)) : -1;
      if (emailIndex >= 0 && phoneIndex >= 0 && emailIndex !== phoneIndex) continue;
      const index = emailIndex >= 0 ? emailIndex : phoneIndex;
      const existing = index >= 0 ? next[index] : undefined;
      const history = existing ? purchasesForLead(existing, catalogProducts) : [];
      const source = existing?.source || sourcesByCode[sale.code] || newLeadSource;
      const purchaseId = `ascension-${sale.code}`;
      const purchase: Purchase = { id: purchaseId, origin: "campaign", externalSaleCode: sale.code, product, source, value: sale.gross, netValue: sale.net, closedAt: sale.date, repurchase: history.length > 0, installments: [{ id: `${purchaseId}-1`, number: 1, dueDate: brazilDateKey(sale.date), amount: sale.net, status: "Recebido", receivedAt: brazilDateKey(sale.date) }] };
      const updated: Lead = existing
        ? { ...existing, product, stage: "Fechado", value: sale.gross, netValue: sale.net, closedAt: sale.date, purchases: [...history, purchase] }
        : { id: `ascension-lead-${sale.code}`, name: sale.name, company: "", phone: sale.phone, email: sale.email, notes: "", tags: ["Ascensão importada"], source, product, stage: "Fechado", value: sale.gross, netValue: sale.net, temperature: "Quente", nextAction: "", date: brazilDateKey(sale.date).split("-").reverse().join("/"), createdAt: sale.date, closedAt: sale.date, purchases: [purchase] };
      if (index >= 0) next[index] = updated; else next.unshift(updated);
    }
    const previousById = new Map(leads.map((lead) => [lead.id, JSON.stringify(lead)]));
    await persistImportBatch(next, traffic, next.filter((lead) => previousById.get(lead.id) !== JSON.stringify(lead)));
  };
  const applyLeadChanges = (lead: Lead, changes: Partial<Lead>) => {
    if ("purchases" in changes) return { ...lead, ...changes };
    const updatesPurchase = "closedAt" in changes || "value" in changes || "netValue" in changes || "product" in changes;
    if (!updatesPurchase || !lead.purchases?.length || lead.stage !== "Fechado") return { ...lead, ...changes };
    const purchases = [...lead.purchases];
    const index = purchases.findLastIndex((purchase) => !isCampaignPurchase(purchase));
    if (index < 0) return { ...lead, ...changes };
    purchases[index] = { ...purchases[index], closedAt: changes.closedAt || purchases[index].closedAt, value: changes.value ?? purchases[index].value, netValue: changes.netValue ?? purchases[index].netValue, product: changes.product ?? purchases[index].product };
    return { ...lead, ...changes, purchases };
  };
  const updateLead = (id: string, changes: Partial<Lead>) => {
    const lead = leadsRef.current.find((item) => item.id === id);
    if (!lead) return;
    const updated = applyLeadChanges(lead, changes);
    const next = leadsRef.current.map((item) => item.id === id ? updated : item);
    leadsRef.current = next; localDataRevision.current += 1;
    setLeads(next);
    setSelected((current) => current?.id === id ? updated : current);
    scheduleLeadSave(updated);
  };
  const persistTagChange = async (entity: "tag-rename" | "tag-delete", oldId: string, newId?: string) => {
    const persist = async () => {
      const response = await fetch("/api/crm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, oldId, newId }) });
      if (!response.ok) { await registerDatabaseFailure(response); throw new Error("Falha ao salvar etiqueta"); }
      const result = await response.json();
      if (result.remaining !== 0) { setDatabaseIssue("O banco não confirmou a alteração da etiqueta"); setDatabaseStatus("offline"); throw new Error("Confirmação da etiqueta divergente"); }
      setDatabaseIssue(""); setDatabaseStatus("connected"); setLastSavedAt(new Date());
    };
    syncQueue.current = syncQueue.current.catch(() => undefined).then(persist);
    await syncQueue.current;
  };
  const renameTag = async (oldTag: string, newTag: string) => {
    const previousLeads = leadsRef.current;
    const nextLeads = previousLeads.map((lead) => ({ ...lead, tags: (lead.tags || []).map((tag) => tag === oldTag ? newTag : tag) }));
    flushAllLeadSaves();
    leadsRef.current = nextLeads; localDataRevision.current += 1;
    try {
      await persistTagChange("tag-rename", oldTag, newTag);
      setLeads(nextLeads);
      setSelected((lead) => lead ? { ...lead, tags: (lead.tags || []).map((tag) => tag === oldTag ? newTag : tag) } : lead);
    } catch (error) {
      leadsRef.current = previousLeads;
      console.error("Falha ao renomear etiqueta", error);
      window.alert("Não foi possível salvar a etiqueta no banco. Tente novamente.");
    }
  };
  const deleteTag = async (tagToDelete: string) => {
    const previousLeads = leadsRef.current;
    const nextLeads = previousLeads.map((lead) => ({ ...lead, tags: (lead.tags || []).filter((tag) => tag !== tagToDelete) }));
    flushAllLeadSaves();
    leadsRef.current = nextLeads; localDataRevision.current += 1;
    try {
      await persistTagChange("tag-delete", tagToDelete);
      setLeads(nextLeads);
      setSelected((lead) => lead ? { ...lead, tags: (lead.tags || []).filter((tag) => tag !== tagToDelete) } : lead);
    } catch (error) {
      leadsRef.current = previousLeads;
      console.error("Falha ao excluir etiqueta", error);
      window.alert("Não foi possível excluir a etiqueta no banco. Tente novamente.");
    }
  };
  const startAscension = (id: string) => {
    const lead = leads.find((item) => item.id === id);
    if (!lead) return;
    const history = purchasesForLead(lead, catalogProducts);
    const lastProduct = history.at(-1)?.product || lead.product;
    const ladder = productLadder(catalogProducts);
    const currentIndex = ladder.findIndex((item) => item.name === lastProduct);
    const nextProduct = ladder[currentIndex + 1];
    if (!nextProduct) return;
    updateLead(id, { stage: "Novo lead", product: nextProduct.name, value: nextProduct.price, nextAction: `Ofertar ${nextProduct.name}`, conversationAt: undefined, meetingAt: undefined, meetingScheduledFor: null, meetingOutcome: null, followUpAt: null, proposalAt: undefined, closedAt: undefined });
  };

  const allNavigation: Array<[View, string, string]> = [
    ["geral", "Visão geral", "⌂"],
    ["comercial", "Orgânico", "◫"],
    ["trafego", "Tráfego", "↗"],
    ["campanhas", "Campanhas", "◎"],
    ["pipeline", "Pipeline", "▦"],
    ["contatos", "Leads", "◇"],
    ["financeiro", "Financeiro", "$"],
    ["mensagens", "Detalhes", "⚙"],
    ["admin", "ADM", "♙"],
  ];
  const navigation = allNavigation.filter(([id]) => id === "admin" ? access.isAdmin : access.isAdmin || access.permissions.includes(id as CrmModule));
  useEffect(() => {
    if (!navigation.length || navigation.some(([id]) => id === view)) return;
    setView(navigation[0][0]);
  }, [view, access.isAdmin, access.permissions]);
  return (
    <main className={styles.crm} data-theme={theme}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span>MT</span>
          <div>
            <b>Mensor</b>
            <small>CRM</small>
          </div>
        </div>
        <nav>
          {navigation.map(([id, label, icon]) => (
            <button
              key={id}
              className={view === id ? styles.active : ""}
              onClick={() => setView(id)}
            >
              <i>{icon}</i>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.pageHeading}>
            <small>Mensor Treinamentos / {navigation.find(([id]) => id === view)?.[1]}</small>
            <h1>{navigation.find(([id]) => id === view)?.[1]}</h1>
            {view === "geral" && <p>Orgânico × Tráfego</p>}
          </div>
          {["geral", "comercial", "trafego", "campanhas"].includes(view) && <PeriodFilter start={dateRange.start} end={dateRange.end} setRange={(start, end) => { setDateRange({ start, end }); setSelectedMonth(start.slice(0, 7)); }} />}
          <div className={styles.topActions}>
            <div className={`${styles.databaseStatus} ${styles[databaseStatus]}`} title={databaseIssue}><i>{databaseStatus === "connected" ? "●" : databaseStatus === "offline" ? "!" : "◌"}</i><span><b>{databaseStatus === "saving" ? "Salvando no banco…" : databaseStatus === "offline" ? "Não foi salvo" : databaseStatus === "connecting" ? "Conectando…" : "Salvo no banco"}</b><small>{databaseStatus === "offline" ? databaseIssue || "Revise a conexão" : lastSavedAt ? `Confirmado às ${lastSavedAt.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}` : "Banco conectado"}</small></span></div>
            <button className={styles.themeToggle} onClick={toggleTheme} aria-label={theme === "dark" ? "Ativar modo dia" : "Ativar modo noite"} title={theme === "dark" ? "Modo dia" : "Modo noite"}><span>{theme === "dark" ? "☀" : "☾"}</span><small>{theme === "dark" ? "Dia" : "Noite"}</small></button>
            {(view === "pipeline" || view === "contatos") && (
              <label>
                <span>⌕</span>
                <input
                  placeholder="Buscar contato..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            )}
            {["comercial", "pipeline", "contatos"].includes(view) && <button onClick={() => setAdding(true)}>+ Novo lead</button>}
            {(view === "pipeline" || view === "contatos") && <button className={styles.importButton} onClick={() => setImporting(true)}>↑ Importar</button>}
          </div>
        </header>
        {view === "geral" && <ExecutiveOverview leads={filteredOverviewLeads} products={filteredCatalogProducts} allProducts={catalogProducts} selectedProduct={dashboardProduct} setProduct={setDashboardProduct} start={dateRange.start} end={dateRange.end} traffic={filteredOverviewTraffic} />}
        {view === "comercial" && (
          <Dashboard channel="organic" leads={filteredOrganicLeads} allLeads={filteredOrganicLeads} stats={stats} selectedMonth={selectedMonth} start={dateRange.start} end={dateRange.end} products={filteredCatalogProducts} allProducts={catalogProducts} selectedProduct={dashboardProduct} setProduct={setDashboardProduct} sources={catalogSources.filter((source) => !isTrafficSource(source))} />
        )}
        {view === "trafego" && <Dashboard channel="traffic" leads={filteredTrafficDashboardLeads} allLeads={filteredTrafficDashboardLeads} stats={trafficStats} selectedMonth={selectedMonth} start={dateRange.start} end={dateRange.end} products={filteredCatalogProducts} allProducts={catalogProducts} selectedProduct={dashboardProduct} setProduct={setDashboardProduct} sources={["Tráfego"]} />}
        {view === "campanhas" && <TrafficDashboard records={traffic.filter((item) => inRange(item.date || `${item.month}-01`, dateRange.start, dateRange.end) || purchasesForCampaignAll(leads, item.id, catalogProducts).some((purchase) => inRange(purchase.closedAt, dateRange.start, dateRange.end)))} month={selectedMonth} start={dateRange.start} end={dateRange.end} products={catalogProducts} sources={catalogSources} leads={leads} save={saveCampaign} remove={(id) => { void removeCampaign(id); }} importSales={importCampaignSales} ascendLeads={startBulkAscension} importAscension={importAscensionSales} />}
        {view === "pipeline" && (
          <Pipeline leads={filtered} products={catalogProducts} stages={pipelineStages} setStages={setPipelineStages} moveLead={moveLead} toggleContactToday={toggleContactToday} select={setSelected} search={search} />
        )}
        {view === "contatos" && (
          <Contacts leads={filtered} sources={catalogSources} products={catalogProducts} select={setSelected} />
        )}
        {view === "financeiro" && <FinanceDashboard leads={leads} traffic={traffic} expenses={expenses} closers={closers} month={selectedMonth} setMonth={setSelectedMonth} saveExpense={saveExpense} removeExpense={removeExpense} updateLead={updateLead} saveCloserGoal={saveCloserGoal} />}
        {view === "mensagens" && <Details products={catalogProducts} sources={catalogSources} saveProducts={saveProducts} saveSources={saveSources} renameProduct={renameProduct} renameSource={renameSource} deleteRecord={deleteRecord} />}
        {view === "admin" && access.isAdmin && <CRMAdmin />}
      </section>
      {adding && <LeadModal existing={leads} products={catalogProducts} sources={catalogSources} close={() => setAdding(false)} duplicate={(lead) => { setAdding(false); setSelected(lead); }} save={addLead} />}
      {importing && <ImportLeadsModal existing={leads} stages={pipelineStages} products={catalogProducts} sources={catalogSources} close={() => setImporting(false)} save={async (imported) => {
        const nextLeads = mergeLeadCollections(leads, imported);
        const changedLeads = imported.map((incoming) => nextLeads.find((lead) => lead.id === incoming.id || leadIdentityMatch(lead, incoming))).filter((lead): lead is Lead => Boolean(lead));
        await persistImportBatch(nextLeads, traffic, Array.from(new Map(changedLeads.map((lead) => [lead.id, lead])).values()));
        setImporting(false);
      }} />}
      {selected && (
        <LeadDrawer
          lead={selected}
          products={catalogProducts}
          sources={catalogSources}
          closers={closers}
          availableTags={Array.from(new Set(["Desqualificado", ...leads.flatMap((lead) => lead.tags || [])]))}
          stages={pipelineStages}
          close={() => { flushLeadSave(selected.id); setSelected(null); }}
          update={(changes) => updateLead(selected.id, changes)}
          renameTag={renameTag}
          deleteTag={deleteTag}
          remove={async () => {
            if (!window.confirm(`Excluir o lead ${selected.name}? Essa ação não poderá ser desfeita.`)) return;
            if (!await deleteRecord("lead", selected.id)) return;
            setLeads((current) => current.filter((lead) => lead.id !== selected.id));
            setSelected(null);
          }}
          deletePurchase={(id) => deleteRecord("purchase", id)}
          move={(stage) => {
            const now = new Date().toISOString();
            moveLead(selected.id, stage, now);
            setSelected((current) => current ? transitionLead(current, stage, now) : current);
          }}
          startAscension={() => startAscension(selected.id)}
        />
      )}
    </main>
  );
}

function ExecutiveOverview({ leads, products, allProducts, selectedProduct, setProduct, start, end, traffic }: { leads: Lead[]; products: ProductDefinition[]; allProducts: ProductDefinition[]; selectedProduct: string; setProduct: (product: string) => void; start: string; end: string; traffic: TrafficRecord[] }) {
  const [goals, setGoals] = useState<Record<string, number>>({});
  useEffect(() => { const load = () => { try { const saved = localStorage.getItem(goalsStorageKey); if (saved) setGoals(JSON.parse(saved)); } catch {} }; load(); window.addEventListener("mensor-crm-database-loaded", load); return () => window.removeEventListener("mensor-crm-database-loaded", load); }, []);
  const goalMonth = start.slice(0, 7);
  const endGoalMonth = end.slice(0, 7);
  const goalMonths: string[] = [];
  const goalCursor = new Date(`${goalMonth}-01T12:00:00`);
  while (`${goalCursor.getFullYear()}-${String(goalCursor.getMonth() + 1).padStart(2, "0")}` <= endGoalMonth) {
    goalMonths.push(`${goalCursor.getFullYear()}-${String(goalCursor.getMonth() + 1).padStart(2, "0")}`);
    goalCursor.setMonth(goalCursor.getMonth() + 1);
  }
  const updateGoal = (month: string, value: number) => { const next = { ...goals, [month]: value }; setGoals(next); localStorage.setItem(goalsStorageKey, JSON.stringify(next)); window.dispatchEvent(new Event("mensor-crm-change")); };
  const periodTraffic = traffic.filter((item) => inRange(item.date || `${item.month}-01`, start, end));
  const pipelineClosings = leads.flatMap((lead) => purchasesForLead(lead, products).filter((purchase) => !isCampaignPurchase(purchase) && inRange(purchase.closedAt, start, end)).map((purchase) => ({ purchase, source: purchase.source || lead.source, traffic: (purchase.source || lead.source) === "Tráfego" || (!purchase.source && lead.tags?.some((tag) => ["tráfego", "trafego"].includes(tag.trim().toLowerCase()))) })));
  const organicClosings = pipelineClosings.filter((item) => !item.traffic).map((item) => item.purchase);
  const manualTrafficClosings = pipelineClosings.filter((item) => item.traffic).map((item) => item.purchase);
  const organicRevenue = organicClosings.reduce((sum, purchase) => sum + purchase.value, 0);
  const organicNet = organicClosings.reduce((sum, purchase) => sum + purchase.netValue, 0);
  const campaignValues = traffic.map((item) => {
    const allPurchases = purchasesForCampaignAll(leads, item.id, products);
    const purchases = allPurchases.filter((purchase) => inRange(purchase.closedAt, start, end));
    if (allPurchases.length) return { sales: purchases.length, gross: purchases.reduce((sum, purchase) => sum + purchase.value, 0), net: purchases.reduce((sum, purchase) => sum + purchase.netValue, 0) };
    if (!inRange(item.date || `${item.month}-01`, start, end)) return { sales: 0, gross: 0, net: 0 };
    return { sales: item.sales, gross: item.revenue, net: item.netRevenue ?? netForValue(item.revenue, item.product, products) };
  });
  const trafficRevenue = campaignValues.reduce((sum, item) => sum + item.gross, 0) + manualTrafficClosings.reduce((sum, purchase) => sum + purchase.value, 0);
  const trafficNet = campaignValues.reduce((sum, item) => sum + item.net, 0) + manualTrafficClosings.reduce((sum, purchase) => sum + purchase.netValue, 0);
  const trafficInvestment = periodTraffic.reduce((sum, item) => sum + item.investment, 0);
  const campaignSales = campaignValues.reduce((sum, item) => sum + item.sales, 0);
  const directSales = campaignSales + manualTrafficClosings.length;
  const organicSales = organicClosings.length;
  const totalRevenue = organicRevenue + trafficRevenue;
  const totalNet = organicNet + trafficNet;
  const repurchases = [...organicClosings, ...manualTrafficClosings].filter((purchase) => purchase.repurchase);
  const repurchaseRevenue = repurchases.reduce((sum, purchase) => sum + purchase.value, 0);
  const repurchaseShare = totalRevenue ? repurchaseRevenue / totalRevenue * 100 : 0;
  const periodBalance = totalNet - trafficInvestment;
  const totalSales = organicSales + directSales;
  const goal = goalMonths.reduce((sum, month) => sum + (goals[month] || 0), 0);
  const goalProgress = goal ? totalRevenue / goal * 100 : 0;
  const balanceProgress = goal ? periodBalance / goal * 100 : 0;
  const balanceRatio = Math.max(0, Math.min(1, balanceProgress / 100));
  const balanceHue = 354 + balanceRatio * 132;
  const balanceStyle = { "--balance-hue": balanceHue } as React.CSSProperties;
  return <div className={`${styles.content} ${styles.executiveOverview}`}>
    <DashboardProductFilter products={allProducts} value={selectedProduct} set={setProduct} />
    <div className={styles.overviewKpis}>
      <article className={styles.balanceCard} style={balanceStyle}><span>Saldo total do período</span><strong><Money value={periodBalance} /></strong><small>{goal ? `${Math.max(0, balanceProgress).toFixed(1)}% da meta após descontos` : "Defina a meta do mês"}</small></article>
      <Kpi label="Receita bruta" value={<Money value={totalRevenue} />} detail="Faturamento total do período" />
      <Kpi label="Receita líquida" value={<Money value={totalNet} />} detail={<><Money value={Math.max(0, totalRevenue - totalNet)} /> em taxas</>} />
      <Kpi label="Vendas totais" value={String(totalSales)} detail={`${organicSales} orgânicas + ${campaignSales} campanhas + ${manualTrafficClosings.length} novos fechamentos`} />
      <Kpi label="Investimento em tráfego" value={<Money value={trafficInvestment} />} detail="Descontado do saldo do período" />
      <Kpi label="Receita orgânica" value={<Money value={organicRevenue} />} detail={<>Líquido <Money value={organicNet} /></>} />
      <Kpi label="Receita do tráfego" value={<Money value={trafficRevenue} />} detail={<>Líquido <Money value={trafficNet} /></>} />
      <Kpi label="Receita de recompra" value={<Money value={repurchaseRevenue} />} detail={`${repurchaseShare.toFixed(1)}% da receita total`} />
      <Kpi label="Participação da base" value={`${repurchaseShare.toFixed(1)}%`} detail={`${repurchases.length} recompras no período`} />
      <article className={styles.overviewGoal}><label>{goalMonths.length === 1 ? "Meta do mês" : "Meta do período"}</label><div>{goalMonths.length === 1 ? <AccountingInput value={goal} set={(value) => updateGoal(goalMonth, Number(value) || 0)} /> : <strong><Money value={goal} /></strong>}</div><span>{goal ? `${goalProgress.toFixed(1)}% do bruto atingido${goalMonths.length > 1 ? ` · ${goalMonths.length} metas mensais` : ""}` : "Preencha as metas mensais"}</span><i><b style={{ width: `${Math.min(100, goalProgress)}%` }} /></i></article>
    </div>
    <section className={`${styles.panel} ${styles.channelComposition}`}><header><h3>Composição da receita</h3></header><div><article><span>Orgânico</span><strong><Money value={organicRevenue} /></strong><div><i style={{ width: `${totalRevenue ? organicRevenue / totalRevenue * 100 : 0}%` }} /></div><small>{totalRevenue ? (organicRevenue / totalRevenue * 100).toFixed(1) : "0.0"}% do total</small></article><article><span>Tráfego</span><strong><Money value={trafficRevenue} /></strong><div><i style={{ width: `${totalRevenue ? trafficRevenue / totalRevenue * 100 : 0}%` }} /></div><small>{totalRevenue ? (trafficRevenue / totalRevenue * 100).toFixed(1) : "0.0"}% do total</small></article></div></section>
    <UnifiedRevenueAnalysis leads={leads} traffic={traffic} products={products} start={start} end={end} goals={goals} setGoal={updateGoal} />
  </div>;
}

function UnifiedRevenueAnalysis({ leads, traffic, products, start, end, goals, setGoal }: { leads: Lead[]; traffic: TrafficRecord[]; products: ProductDefinition[]; start: string; end: string; goals: Record<string, number>; setGoal: (month: string, value: number) => void }) {
  const launchProduct = "Lançamento [Ingresso+Order]";
  const launchSummaryMonths = new Set(traffic.filter((item) => item.product === launchProduct && !purchasesForCampaignAll(leads, item.id, products).length).map((item) => brazilMonthKey(item.date || `${item.month}-01`)));
  const trafficLeads = traffic.flatMap((item) => {
    const linked = purchasesForCampaignAll(leads, item.id, products);
    // Compras conciliadas já estão nos leads reais. Só sintetizamos os totais
    // quando a campanha ainda não possui uma planilha vinculada.
    if (linked.length) return [];
    const units = Math.max(item.sales, item.revenue ? 1 : 0);
    const date = item.date || `${item.month}-01`;
    return Array.from({ length: units }, (_, index): Lead => ({ id: `traffic-${item.id}-${index}`, name: item.campaign, company: "Tráfego", phone: "", email: "", source: "Tráfego", product: item.product, stage: "Fechado", value: units ? item.revenue / units : 0, netValue: units ? (item.netRevenue ?? netForValue(item.revenue, item.product, products)) / units : 0, temperature: "Quente", nextAction: "Venda direta", date, closedAt: date }));
  });
  // Apenas para o lançamento legado: o resumo oficial de 40/49 vendas já
  // representa as linhas antigas ainda sem campaignId, evitando somá-las duas
  // vezes. Nenhum outro produto passa por esta substituição.
  const consolidatedLeads = leads.map((lead) => ({ ...lead, purchases: purchasesForLead(lead, products).filter((purchase) => !(purchase.product === launchProduct && !purchase.campaignId && purchase.externalSaleCode && launchSummaryMonths.has(brazilMonthKey(purchase.closedAt)))) }));
  const consolidated = [...consolidatedLeads, ...trafficLeads];
  const sources = Array.from(new Set([...leadSources, "Tráfego"]));
  return <div className={styles.unifiedOrganicLayout}><div className={styles.analysisColumn}><ProductValueChart channel="all" leads={consolidated} start={start} end={end} products={products} /></div><div className={styles.unifiedOriginColumn}><OriginValueChart channel="all" leads={consolidated} start={start} end={end} sources={sources} /></div><MonthlyMetricsChart channel="all" leads={consolidated} endMonth={end.slice(0,7)} goals={goals} setGoal={setGoal} /></div>;
}

function CampaignSalesImport({ campaign, leads, sources = [], mode = "campaign", product = campaign.product, close, edit, confirm }: { campaign: TrafficRecord; leads: Lead[]; sources?: string[]; mode?: "campaign" | "ascension"; product?: string; close: () => void; edit: () => void; confirm: (sales: ImportedSale[], newLeadSource?: string, sourcesByCode?: Record<string, string>) => Promise<void> }) {
  const [sales, setSales] = useState<ImportedSale[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [acceptSheetValues, setAcceptSheetValues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [newLeadSource, setNewLeadSource] = useState(sources.find((source) => source !== "Tráfego") || "Cadastro");
  const [sourcesByCode, setSourcesByCode] = useState<Record<string, string>>({});
  const repairEncoding = (value: string) => {
    if (!/[ÃÂ]/.test(value)) return value;
    try { return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from([...value].map((character) => character.charCodeAt(0)))); } catch { return value; }
  };
  const normalize = (value: string) => repairEncoding(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const parseMoney = (value: unknown) => Number(String(value ?? "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")) || 0;
  const parseDate = (value: unknown) => { if (typeof value === "number") { const serial = new Date(Date.UTC(1899,11,30) + value * 86400000); return new Date(`${serial.toISOString().slice(0,10)}T12:00:00-03:00`).toISOString(); } const text = String(value || "").trim(); const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/); const date = br ? new Date(`${br[3]}-${String(br[2]).padStart(2,"0")}-${String(br[1]).padStart(2,"0")}T${String(br[4]||12).padStart(2,"0")}:${br[5]||"00"}:${br[6]||"00"}-03:00`) : new Date(text); return Number.isNaN(date.getTime()) ? "" : date.toISOString(); };
  const saleIssue = (sale: ImportedSale) => !sale.code.trim() ? "Código da venda não informado" : !sale.name.trim() ? "Nome não informado" : !sale.date ? "Data inválida" : sale.gross <= 0 ? "Valor bruto inválido" : sale.net < 0 ? "Valor líquido inválido" : "";
  const read = async (file: File) => {
    setFileName(file.name); setError(""); setAcceptSheetValues(false);
    try {
      const XLSX = await import("xlsx");
      const bytes = await file.arrayBuffer();
      const isCsv = file.name.toLowerCase().endsWith(".csv") || /csv/i.test(file.type);
      let book;
      if (isCsv) {
        let csvText = new TextDecoder("utf-8").decode(bytes);
        if (csvText.includes("�")) csvText = new TextDecoder("windows-1252").decode(bytes);
        book = XLSX.read(csvText.replace(/^\uFEFF/, ""), { type: "string", cellDates: true, raw: true });
      } else {
        book = XLSX.read(bytes, { type: "array", cellDates: true });
      }
      const parsed: ImportedSale[] = [];
      let headerFound = false;
      let detectedHeaders: string[] = [];
      for (const sheetName of book.SheetNames) {
        const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, defval: "", raw: true });
        const matrix = rawMatrix.map((row) => row.length === 1 && typeof row[0] === "string" && /[;\t]/.test(row[0]) ? row[0].split(row[0].includes("\t") ? "\t" : ";") : row);
        const headerAliases = {
          code: ["codigodavenda", "codigovenda", "codigodatransacao", "codigotransacao", "codigodopedido", "codigopedido", "idvenda", "idtransacao", "idpedido", "transactionid", "saleid", "orderid", "transacao", "pedido", "codigo"],
          name: ["nomedocliente", "nomecliente", "nomedocomprador", "nomecomprador", "customername", "buyername", "cliente", "comprador", "nome"],
          email: ["emaildocliente", "emailcliente", "emaildocomprador", "emailcomprador", "customeremail", "buyeremail", "email"],
          phone: ["telefonedocliente", "telefonecliente", "telefonedocomprador", "telefonecomprador", "customerphone", "buyerphone", "telefone", "whatsapp", "celular", "phone"],
          date: ["datadepagamento", "datadopagamento", "datadavenda", "datadatransacao", "datadopedido", "paymentdate", "saledate", "transactiondate", "orderdate", "data", "date"],
          gross: ["valorbruto", "valordavenda", "valordatransacao", "valordopedido", "grossvalue", "grossamount", "salevalue", "amount", "valor"],
        };
        const hasAlias = (keys: string[], aliases: string[]) => keys.some((key) => aliases.includes(key) || aliases.some((alias) => key.includes(alias)));
        const headerIndex = matrix.findIndex((row) => {
          const keys = row.map((cell) => normalize(String(cell))).filter(Boolean);
          const identity = hasAlias(keys, headerAliases.name) || hasAlias(keys, headerAliases.email) || hasAlias(keys, headerAliases.phone);
          const score = [hasAlias(keys, headerAliases.code), identity, hasAlias(keys, headerAliases.date), hasAlias(keys, headerAliases.gross)].filter(Boolean).length;
          return score >= 3 && hasAlias(keys, headerAliases.code);
        });
        if (headerIndex < 0) { const candidate = matrix.find((row) => row.filter((cell) => String(cell).trim()).length >= 3); if (candidate && candidate.length > detectedHeaders.length) detectedHeaders = candidate.map(String).filter((cell) => cell.trim()).slice(0,8); continue; }
        headerFound = true;
        const headers = matrix[headerIndex].map((cell) => normalize(String(cell)));
        for (const [rowOffset, values] of matrix.slice(headerIndex + 1).entries()) {
          if (!values.some((value) => String(value ?? "").trim())) continue;
          const keyed = Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ""]));
          const get = (...keys:string[]) => {
            const aliases = keys.map(normalize);
            const exact = aliases.map((key) => keyed[key]).find((value) => String(value ?? "").trim());
            if (exact !== undefined) return exact;
            const fuzzyKey = Object.keys(keyed).find((header) => aliases.some((alias) => header.includes(alias) || alias.includes(header)));
            return fuzzyKey ? keyed[fuzzyKey] : "";
          };
          const email = repairEncoding(String(get("Email do cliente", "E-mail do cliente", "Email do comprador", "E-mail do comprador", "Customer email", "Buyer email", "Email", "E-mail"))).trim().toLowerCase();
          const phone = String(get("Telefone do cliente", "Telefone do comprador", "Customer phone", "Buyer phone", "Telefone", "WhatsApp", "Celular", "Phone")).replace(/\D/g,"");
          const sale: ImportedSale = { code: repairEncoding(String(get("Código da venda", "Código venda", "Código da transação", "Código transação", "Código do pedido", "Código pedido", "ID venda", "ID transação", "ID pedido", "Transaction ID", "Sale ID", "Order ID", "Transação", "Pedido", "Código"))).trim(), date: parseDate(get("Data de pagamento", "Data do pagamento", "Data da venda", "Data da transação", "Data do pedido", "Payment date", "Sale date", "Transaction date", "Order date", "Data", "Date")), name: repairEncoding(String(get("Nome do cliente", "Nome cliente", "Nome do comprador", "Nome comprador", "Customer name", "Buyer name", "Cliente", "Comprador", "Nome"))).trim() || email || phone, email, phone, gross: parseMoney(get("Valor Bruto", "Valor da venda", "Valor da transação", "Valor do pedido", "Gross value", "Gross amount", "Sale value", "Amount", "Valor")), net: parseMoney(get("Valor Líquido", "Valor Liquido", "Valor recebido", "Valor líquido da venda", "Net value", "Net amount")), rowNumber: headerIndex + rowOffset + 2 };
          sale.issue = saleIssue(sale);
          parsed.push(sale);
        }
      }
      if (!headerFound) throw new Error(`Não consegui identificar o cabeçalho.${detectedHeaders.length ? ` Encontrei: ${detectedHeaders.join(" | ")}.` : " O arquivo não apresentou títulos legíveis."}`);
      if (!parsed.length) throw new Error("Encontrei as colunas, mas a planilha não possui linhas preenchidas.");
      setSales(parsed); setPage(1); setEditingRow(null);
      const uniqueParsed = Array.from(new Map(parsed.filter((sale) => !sale.issue).map((sale) => [sale.code, sale])).values());
      const sheetGross = uniqueParsed.reduce((sum, sale) => sum + sale.gross, 0);
      const sheetNet = uniqueParsed.reduce((sum, sale) => sum + sale.net, 0);
      const campaignGross = Number(campaign.revenue) || 0;
      const campaignNet = Number(campaign.netRevenue) || 0;
      if (mode === "ascension") return;
      if (!campaignGross && !campaignNet) {
        setError(`Planilha: bruto ${currency.format(sheetGross)} · líquido ${currency.format(sheetNet)}. Não há valor calculado informado na campanha.`);
        if (window.confirm(`A campanha não possui valores calculados.\n\nPlanilha: bruto ${currency.format(sheetGross)} · líquido ${currency.format(sheetNet)}\n\nDeseja considerar o valor da planilha?`)) setAcceptSheetValues(true);
      }
      else if (Math.abs(sheetGross - campaignGross) >= .005 || Math.abs(sheetNet - campaignNet) >= .005) {
        setError(`Divergência — Planilha: bruto ${currency.format(sheetGross)}, líquido ${currency.format(sheetNet)} · Calculado: bruto ${currency.format(campaignGross)}, líquido ${currency.format(campaignNet)}.`);
        if (window.confirm(`Os valores não conferem.\n\nPlanilha: bruto ${currency.format(sheetGross)} · líquido ${currency.format(sheetNet)}\nCalculado: bruto ${currency.format(campaignGross)} · líquido ${currency.format(campaignNet)}\n\nDeseja considerar o valor da planilha?`)) setAcceptSheetValues(true);
      }
    } catch (reason) {
      setSales([]);
      setError(reason instanceof Error && reason.message ? reason.message : "Não foi possível abrir a planilha. Tente exportar novamente em XLSX ou CSV.");
    }
  };
  const codes = new Set<string>(); const duplicateCodes = sales.filter((sale) => codes.has(sale.code) || !codes.add(sale.code));
  const allPurchases = leads.flatMap((lead) => purchasesForLead(lead, []));
  const purchaseForSale = (sale: ImportedSale) => allPurchases.find((purchase) => purchase.externalSaleCode === sale.code);
  const alreadyImported = sales.filter((sale) => purchaseForSale(sale)?.campaignId === campaign.id);
  const conflicts = sales.filter((sale) => { if (purchaseForSale(sale)) return false; const emailLead = sale.email && leads.find((lead) => lead.email.toLowerCase() === sale.email); const phoneLead = sale.phone && leads.find((lead) => lead.phone.replace(/\D/g,"") === sale.phone); return emailLead && phoneLead && emailLead.id !== phoneLead.id; });
  // A planilha é a fonte oficial da venda. Códigos já importados continuam
  // válidos para que valor, líquido, data, produto e campanha sejam atualizados.
  const valid = sales.filter((sale) => !sale.issue && !duplicateCodes.includes(sale) && !conflicts.includes(sale));
  const gross = valid.reduce((sum,sale) => sum + sale.gross,0); const net = valid.reduce((sum,sale) => sum + sale.net,0);
  const fileTotals = Array.from(new Map(sales.filter((sale) => !sale.issue).map((sale) => [sale.code, sale])).values()).reduce((sum,sale) => ({ gross: sum.gross + sale.gross, net: sum.net + sale.net }), { gross: 0, net: 0 });
  const valuesMatch = (campaign.revenue > 0 || Number(campaign.netRevenue) > 0) && Math.abs(fileTotals.gross - campaign.revenue) < .005 && Math.abs(fileTotals.net - Number(campaign.netRevenue || 0)) < .005;
  const valuesApproved = valuesMatch || acceptSheetValues;
  void valuesApproved;
  const leadForSale = (sale: ImportedSale) => leads.find((lead) => (sale.email && lead.email.toLowerCase() === sale.email) || (sale.phone && phoneKey(lead.phone) === phoneKey(sale.phone)));
  const campaignLeadIds = new Set(leadsForCampaign(leads, campaign.id, []).map(({ lead }) => lead.id));
  const campaignAscensions = mode === "ascension" ? valid.filter((sale) => { const lead = leadForSale(sale); return Boolean(lead && campaignLeadIds.has(lead.id)); }).length : 0;
  const existingCount = valid.filter(leadForSale).length;
  const pageSize = 10; const pageCount = Math.max(1, Math.ceil(sales.length / pageSize)); const currentPage = Math.min(page, pageCount); const visibleSales = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const editingSale = sales.find((sale) => sale.rowNumber === editingRow);
  const repairSale = (rowNumber: number, changes: Partial<ImportedSale>) => setSales((current) => current.map((sale) => { if (sale.rowNumber !== rowNumber) return sale; const updated = { ...sale, ...changes }; return { ...updated, issue: saleIssue(updated) }; }));
  return <div className={styles.backdrop} onMouseDown={close}><section className={`${styles.modal} ${styles.reconcileModal}`} onMouseDown={(event) => event.stopPropagation()}><header><div><span>{mode === "ascension" ? "Validação da ascensão" : "Conciliação da campanha"}</span><h2>{mode === "ascension" ? "Importar resultados da ascensão" : "Importar vendas confirmadas"}</h2><p>{campaign.campaign} · {product}</p></div><button onClick={close}>×</button></header><div className={styles.reconcileBody}>{mode === "campaign" && <button className={styles.editCampaignLink} onClick={edit}>Editar dados da campanha</button>}{mode === "ascension" && <label className={styles.ascensionSource}><span>Origem padrão para pessoas novas</span><select value={newLeadSource} onChange={(event) => setNewLeadSource(event.target.value)}>{sources.map((source) => <option key={source}>{source}</option>)}</select><small>Você poderá ajustar individualmente cada pessoa nova na lista abaixo.</small></label>}<label className={styles.fileDrop}><input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && read(event.target.files[0])} /><span>{fileName || "Selecionar planilha de vendas"}</span><small>XLSX, XLS ou CSV</small></label>{error && <p className={styles.reconcileError}>{error}</p>}{saveError && <p className={styles.reconcileError}>{saveError}</p>}{sales.length > 0 && <><div className={styles.reconcileTotals}><article><span>Vendas válidas</span><b>{valid.length}</b>{mode === "ascension" && <small>{campaignAscensions} da campanha · {existingCount-campaignAscensions} outros existentes · {valid.length-existingCount} novos</small>}</article><article><span>Bruto conciliado</span><b>{currency.format(gross)}</b></article><article><span>Líquido conciliado</span><b>{currency.format(net)}</b></article><article><span>Ignoradas</span><b>{sales.length-valid.length}</b><small>Duplicadas, inválidas ou conflitantes</small></article></div><div className={styles.reconcilePreview}>{visibleSales.map((sale) => { const conflict = conflicts.includes(sale); const repeatedCode = duplicateCodes.includes(sale); const updating = alreadyImported.includes(sale); const issue = sale.issue || (conflict ? "E-mail e telefone pertencem a leads diferentes" : repeatedCode ? "Código repetido na planilha" : ""); return <article key={`${sale.rowNumber}-${sale.code}`} className={issue ? styles.invalidImportRow : undefined}><div><b>{sale.name || "Nome não informado"}</b><small>Linha {sale.rowNumber} · {sale.email || sale.phone || "Sem contato"}</small>{mode === "ascension" && !leadForSale(sale) && !repeatedCode && !conflict && !sale.issue && <label className={styles.saleSourceSelect}><span>Origem deste lead</span><select value={sourcesByCode[sale.code] || newLeadSource} onChange={(event) => setSourcesByCode((current) => ({ ...current, [sale.code]: event.target.value }))}>{sources.map((source) => <option key={source}>{source}</option>)}</select></label>}</div><span>{sale.date ? new Intl.DateTimeFormat("pt-BR").format(new Date(sale.date)) : "Data inválida"}</span><strong>{currency.format(sale.gross)}</strong><em className={conflict || sale.issue || repeatedCode ? styles.importInvalid : updating ? styles.importDuplicate : styles.importReady}>{conflict ? "Conflito" : repeatedCode ? "Duplicada" : sale.issue ? "Inválida" : updating ? "Atualizar" : "Pronta"}<small>{issue || (updating ? "A planilha substituirá os dados anteriores desta venda" : "")}</small>{issue && <button type="button" onClick={() => setEditingRow(sale.rowNumber || null)}>Corrigir linha</button>}</em></article>; })}</div>{sales.length > pageSize && <nav className={styles.importPagination}><button type="button" onClick={() => setPage((value) => Math.max(1,value-1))} disabled={currentPage === 1}>← Anterior</button><span>Página {currentPage} de {pageCount} · {sales.length} linhas</span><button type="button" onClick={() => setPage((value) => Math.min(pageCount,value+1))} disabled={currentPage === pageCount}>Próxima →</button></nav>}{editingSale && <section className={styles.importCorrection}><header><div><b>Corrigir linha {editingSale.rowNumber}</b><small>{editingSale.issue || "Revise a divergência desta venda"}</small></div><button type="button" onClick={() => setEditingRow(null)}>×</button></header><div><label><span>Código</span><input value={editingSale.code} onChange={(event) => repairSale(editingSale.rowNumber!, { code:event.target.value })} /></label><label><span>Nome</span><input value={editingSale.name} onChange={(event) => repairSale(editingSale.rowNumber!, { name:event.target.value })} /></label><label><span>E-mail</span><input value={editingSale.email} onChange={(event) => repairSale(editingSale.rowNumber!, { email:event.target.value.trim().toLowerCase() })} /></label><label><span>Telefone</span><input value={editingSale.phone} onChange={(event) => repairSale(editingSale.rowNumber!, { phone:event.target.value.replace(/\D/g,"") })} /></label><label><span>Data</span><input type="date" value={dateInputValue(editingSale.date)} onChange={(event) => repairSale(editingSale.rowNumber!, { date:dateFromInput(event.target.value) || "" })} /></label><label><span>Valor bruto</span><input type="number" step="0.01" value={editingSale.gross} onChange={(event) => repairSale(editingSale.rowNumber!, { gross:Number(event.target.value) })} /></label><label><span>Valor líquido</span><input type="number" step="0.01" value={editingSale.net} onChange={(event) => repairSale(editingSale.rowNumber!, { net:Number(event.target.value) })} /></label></div><footer><span className={editingSale.issue ? styles.importInvalid : styles.importReady}>{editingSale.issue || "Linha corrigida"}</span><button type="button" disabled={Boolean(editingSale.issue)} onClick={() => setEditingRow(null)}>Concluir correção</button></footer></section>}</>}</div><footer><button onClick={close} disabled={saving}>Cancelar</button><button disabled={!valid.length || Boolean(conflicts.length) || saving} onClick={async () => { setSaving(true); setSaveError(""); try { await confirm(valid, newLeadSource, sourcesByCode); } catch { setSaveError("Não foi possível salvar a importação no banco. Tente novamente."); } finally { setSaving(false); } }}>{saving ? "Salvando…" : `Confirmar ${valid.length} vendas`}</button></footer></section></div>;
}

const leadsForCampaign = (leads: Lead[], campaignId: string, products: ProductDefinition[]) => leads.flatMap((lead) => {
  const purchases = purchasesForCampaignAll([lead], campaignId, products);
  return purchases.length ? [{ lead, purchases }] : [];
});

function TrafficDashboard({ records, month, start, end, products, sources, leads, save, remove, importSales, ascendLeads, importAscension }: { records: TrafficRecord[]; month: string; start: string; end: string; products: ProductDefinition[]; sources: string[]; leads: Lead[]; save: (record: TrafficRecord) => Promise<void>; remove: (id: string) => void; importSales: (campaign: TrafficRecord, sales: ImportedSale[]) => Promise<void>; ascendLeads: (leadIds: string[], product: string) => Promise<void>; importAscension: (product: string, sales: ImportedSale[], newLeadSource: string, sourcesByCode?: Record<string, string>) => Promise<void> }) {
  const purchasesForCampaign = (campaignLeads: Lead[], campaignId: string, catalog: ProductDefinition[]) => purchasesForCampaignAll(campaignLeads, campaignId, catalog).filter((purchase) => inRange(purchase.closedAt, start, end));
  const leadsForCampaign = (campaignLeads: Lead[], campaignId: string, catalog: ProductDefinition[]) => campaignLeads.flatMap((lead) => { const purchases = purchasesForCampaign([lead], campaignId, catalog); return purchases.length ? [{ lead, purchases }] : []; });
  const today = brazilDateKey(new Date());
  const defaultDate = today.startsWith(month) ? today : `${month}-01`;
  const emptyDraft = { date: defaultDate, status: "Em andamento" as "Em andamento" | "Fechada", campaign: "", product: products[0]?.name || "", investment: "", sales: "", revenue: "", netRevenue: "" };
  const [editing, setEditing] = useState<TrafficRecord | null | "new">(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [importingCampaign, setImportingCampaign] = useState<TrafficRecord | null>(null);
  const [ascensionSetup, setAscensionSetup] = useState<{ campaign: TrafficRecord; action: "start" | "import" } | null>(null);
  const [ascensionProduct, setAscensionProduct] = useState(products[0]?.name || "");
  const [importingAscension, setImportingAscension] = useState<{ campaign: TrafficRecord; product: string } | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const originalRecordById = new Map(records.map((record) => [record.id, record]));
  const openNew = () => { setDraft({ ...emptyDraft, date: defaultDate, product: products[0]?.name || "" }); setEditing("new"); };
  const openEditData = (record: TrafficRecord) => { const original = originalRecordById.get(record.id) || record; setDraft({ date: original.date || `${original.month}-01`, status: original.status || "Em andamento", campaign: original.campaign, product: original.product, investment: String(original.investment), sales: String(original.sales), revenue: String(original.revenue), netRevenue: String(original.netRevenue ?? netForValue(original.revenue, original.product, products)) }); setEditing(original); };
  records.sort((a, b) => safeCampaignDate(b.date, b.month).localeCompare(safeCampaignDate(a.date, a.month)));
  const metricsForPeriod = (item: TrafficRecord) => {
    const campaignInPeriod = inRange(item.date || `${item.month}-01`, start, end);
    const allLinked = purchasesForCampaignAll(leads, item.id, products);
    const linked = allLinked.filter((purchase) => inRange(purchase.closedAt, start, end));
    const sales = allLinked.length ? linked.length : campaignInPeriod ? item.sales : 0;
    const revenue = allLinked.length ? linked.reduce((value, purchase) => value + purchase.value, 0) : campaignInPeriod ? item.revenue : 0;
    const net = allLinked.length ? linked.reduce((value, purchase) => value + purchase.netValue, 0) : campaignInPeriod ? item.netRevenue ?? netForValue(item.revenue,item.product,products) : 0;
    return { investment: campaignInPeriod ? item.investment : 0, sales, revenue, net };
  };
  const totals = records.reduce((sum,item) => {
    const metrics = metricsForPeriod(item);
    return { investment: sum.investment + metrics.investment, sales: sum.sales + metrics.sales, revenue: sum.revenue + metrics.revenue, net: sum.net + metrics.net };
  }, { investment:0,sales:0,revenue:0,net:0 });
  records = records.map((item) => {
    const metrics = metricsForPeriod(item);
    return { ...item, investment: metrics.investment, sales: metrics.sales, revenue: metrics.revenue, netRevenue: metrics.net };
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const investment = Number(draft.investment) || 0; const sales = Number(draft.sales) || 0; const revenue = Number(draft.revenue) || 0; const netRevenue = Number(draft.netRevenue) || 0;
    if (investment < 0 || sales < 0 || !Number.isInteger(sales) || revenue < 0 || netRevenue < 0 || netRevenue > revenue) { setSaveError("Revise os valores: vendas deve ser um número inteiro, não são aceitos negativos e o líquido não pode superar o bruto."); return; }
    const base = typeof editing === "object" && editing ? editing : null;
    const record = { id: base?.id || uniqueId(), month: draft.date.slice(0, 7), date: draft.date, status: draft.status, campaign: draft.campaign.trim(), product: draft.product, investment, sales, revenue, netRevenue, clicks: base?.clicks||0, pageViews: base?.pageViews||0, checkouts: base?.checkouts||0 };
    setSaving(true); setSaveError("");
    try { await save(record); setEditing(null); } catch { setSaveError("Não foi possível salvar no banco. Tente novamente."); } finally { setSaving(false); }
  };
  const cpa = totals.sales ? totals.investment/totals.sales : 0; const roas = totals.investment ? totals.revenue/totals.investment : 0;
  if (importingCampaign) return <CampaignSalesImport campaign={importingCampaign} leads={leads} close={() => setImportingCampaign(null)} edit={() => { const campaign = importingCampaign; setImportingCampaign(null); openEditData(campaign); }} confirm={async (sales) => { await importSales(importingCampaign, sales); setImportingCampaign(null); }} />;
  if (importingAscension) return <CampaignSalesImport mode="ascension" campaign={importingAscension.campaign} product={importingAscension.product} sources={sources} leads={leads} close={() => setImportingAscension(null)} edit={() => undefined} confirm={async (sales, newSource, individualSources) => { await importAscension(importingAscension.product, sales, newSource || "Cadastro", individualSources); setImportingAscension(null); }} />;
  return <div className={`${styles.content} ${styles.trafficDashboard}`}><header className={styles.trafficHeader}><div><span>Vendas diretas</span><h2>Campanhas do mês</h2><p>Atualize diariamente os totais acumulados de cada campanha.</p></div><button onClick={openNew}>+ Adicionar campanha</button></header><div className={styles.trafficKpis}><Kpi label="Investimento total" value={currency.format(totals.investment)} detail={`${records.length} campanhas`} /><Kpi label="Faturamento bruto" value={currency.format(totals.revenue)} detail={`${totals.sales} vendas`} /><Kpi label="Faturamento líquido" value={currency.format(totals.net)} detail={`${currency.format(Math.max(0,totals.revenue-totals.net))} em taxas`} /><Kpi label="ROAS" value={`${roas.toFixed(2)}x`} detail={`CPA ${currency.format(cpa)}`} /></div><section className={`${styles.panel} ${styles.trafficTable}`}><header><div><span>Detalhamento</span><h3>Dashboard por campanha</h3></div><b>{records.length} campanhas</b></header><div className={styles.trafficRows}>{records.map((item) => { const linked = purchasesForCampaign(leads, item.id, products); const itemSales = linked.length || item.sales; const itemRevenue = linked.length ? linked.reduce((sum, purchase) => sum + purchase.value, 0) : item.revenue; const net = linked.length ? linked.reduce((sum, purchase) => sum + purchase.netValue, 0) : item.netRevenue ?? netForValue(item.revenue,item.product,products); const campaignDate = item.date || `${item.month}-01`; const fees = Math.max(0,itemRevenue-net); const itemCpa = itemSales ? item.investment/itemSales : 0; const netPerSale = itemSales ? net/itemSales : 0; const itemRoas = item.investment ? itemRevenue/item.investment : 0; const campaignLeads = leadsForCampaign(leads, item.id, products); const expanded = expandedCampaignId === item.id; return <article className={styles.campaignDashboard} key={item.id}><header className={styles.campaignDashboardHeader}><div><span>Campanha</span><b>{item.campaign}</b><small>{item.product}</small><em className={item.status === "Fechada" ? styles.campaignClosed : styles.campaignRunning}>{item.status || "Em andamento"}</em></div><time dateTime={campaignDate}><small>Data da campanha</small><strong>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${campaignDate}T12:00:00`))}</strong></time><div className={styles.campaignActions}><button onClick={() => setImportingCampaign(item)}>Importar planilha</button><button disabled={!campaignLeads.length} onClick={() => { setAscensionProduct(products.find((product) => product.name !== item.product)?.name || products[0]?.name || ""); setAscensionSetup({ campaign: item, action: "start" }); }}>Iniciar ascensão</button><button onClick={() => { setAscensionProduct(products.find((product) => product.name !== item.product)?.name || products[0]?.name || ""); setAscensionSetup({ campaign: item, action: "import" }); }}>Validar ascensão</button><button onClick={() => setExpandedCampaignId(expanded ? null : item.id)}>{expanded ? "Ocultar leads" : `Leads (${campaignLeads.length})`}</button><button onClick={() => openEditData(item)}>Editar</button><button onClick={() => remove(item.id)} aria-label={`Excluir ${item.campaign}`}>×</button></div></header><div className={styles.campaignMetrics}><span><small>Investimento</small><strong>{currency.format(item.investment)}</strong></span><span><small>Vendas</small><strong>{itemSales}</strong></span><span><small>Faturamento bruto</small><strong>{currency.format(itemRevenue)}</strong></span><span><small>Faturamento líquido</small><strong>{currency.format(net)}</strong></span><span><small>Líquido por produto</small><strong>{currency.format(netPerSale)}</strong></span><span><small>Taxas</small><strong>{currency.format(fees)}</strong></span><span><small>CPA</small><strong>{currency.format(itemCpa)}</strong></span><span><small>ROAS</small><strong className={itemRoas < 1 ? styles.negativeMetric : undefined}>{itemRoas.toFixed(2)}x</strong></span></div>{expanded && <div className={styles.campaignLeadList}><header><b>Leads importados</b><span>{campaignLeads.length} vinculados a esta campanha</span></header>{campaignLeads.map(({ lead, purchases }) => { const latest = purchases.at(-1)!; const total = purchases.reduce((sum, purchase) => sum + purchase.value, 0); const ascensions = purchasesForLead(lead, products).filter((purchase) => !isCampaignPurchase(purchase) && purchase.repurchase); const latestAscension = ascensions.at(-1); return <div key={lead.id}><span><b>{lead.name}</b><small>{lead.email || lead.phone || "Sem contato"}</small>{latestAscension && <small className={styles.ascensionBadge}>↑ {ascensions.length > 1 ? `${ascensions.length} ascensões` : "Ascensão"}: {latestAscension.product} · {currency.format(latestAscension.value)}</small>}</span><span><small>{latestAscension ? "Última ascensão" : "Data da venda"}</small><b>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(latestAscension?.closedAt || latest.closedAt))}</b></span><span><small>Etapa atual</small><b>{lead.stage}</b></span><strong>{currency.format(total)}{purchases.length > 1 && <small>{purchases.length} compras</small>}</strong></div>})}{!campaignLeads.length && <p>Nenhum lead importado nesta campanha.</p>}</div>}</article>})}{!records.length && <div className={styles.emptyTraffic}>Nenhuma campanha cadastrada neste período.</div>}</div></section>{ascensionSetup && <div className={styles.backdrop} onMouseDown={() => setAscensionSetup(null)}><form className={`${styles.modal} ${styles.ascensionModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={async (event) => { event.preventDefault(); if (ascensionSetup.action === "import") { setImportingAscension({ campaign: ascensionSetup.campaign, product: ascensionProduct }); setAscensionSetup(null); return; } const ids = leadsForCampaign(leads, ascensionSetup.campaign.id, products).map(({ lead }) => lead.id); setSaving(true); try { await ascendLeads(ids, ascensionProduct); setAscensionSetup(null); } finally { setSaving(false); } }}><header><div><span>Ascensão em massa</span><h2>{ascensionSetup.action === "start" ? "Iniciar nova oportunidade" : "Validar vendas da ascensão"}</h2><p>{ascensionSetup.campaign.campaign}</p></div><button type="button" onClick={() => setAscensionSetup(null)}>×</button></header><div className={styles.formGrid}><label><span>Novo produto</span><select value={ascensionProduct} onChange={(event) => setAscensionProduct(event.target.value)}>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><p>{ascensionSetup.action === "start" ? `${leadsForCampaign(leads, ascensionSetup.campaign.id, products).length} leads serão movidos para Novo lead sem gerar venda.` : "A planilha será conferida por código, e-mail e telefone antes de criar as novas compras."}</p></div><footer><button type="button" onClick={() => setAscensionSetup(null)}>Cancelar</button><button type="submit" disabled={!ascensionProduct || saving}>{saving ? "Salvando…" : ascensionSetup.action === "start" ? "Iniciar ascensão" : "Selecionar planilha"}</button></footer></form></div>}{editing && <div className={styles.backdrop} onMouseDown={() => setEditing(null)}><form className={`${styles.modal} ${styles.trafficModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><header><div><span>Campanha mensal</span><h2>{editing === "new" ? "Adicionar campanha" : "Editar campanha"}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header><div className={styles.formGrid}><Input label="Campanha" value={draft.campaign} set={(campaign) => setDraft({...draft,campaign})} required /><Input label="Data da campanha" value={draft.date} set={(date) => setDraft({...draft,date})} type="date" required /><label><span>Status da campanha</span><select value={draft.status} onChange={(event) => setDraft({...draft,status:event.target.value as "Em andamento" | "Fechada"})}><option>Em andamento</option><option>Fechada</option></select></label><label><span>Produto</span><select value={draft.product} onChange={(event) => setDraft({...draft,product:event.target.value})}>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><Input label="Investimento total" value={draft.investment} set={(investment) => setDraft({...draft,investment})} type="number" /><Input label="Quantidade de vendas" value={draft.sales} set={(sales) => setDraft({...draft,sales})} type="number" /><Input label="Faturamento bruto" value={draft.revenue} set={(revenue) => setDraft({...draft,revenue})} type="number" /><Input label="Faturamento líquido" value={draft.netRevenue} set={(netRevenue) => setDraft({...draft,netRevenue})} type="number" /><div className={styles.autoMetrics}><span>CPA <b>{currency.format(Number(draft.sales) ? Number(draft.investment)/Number(draft.sales) : 0)}</b></span><span>Líquido por produto <b>{currency.format(Number(draft.sales) ? Number(draft.netRevenue)/Number(draft.sales) : 0)}</b></span><span>ROAS <b className={(Number(draft.investment) ? Number(draft.revenue)/Number(draft.investment) : 0) < 1 ? styles.negativeMetric : undefined}>{Number(draft.investment) ? (Number(draft.revenue)/Number(draft.investment)).toFixed(2) : "0.00"}x</b></span></div></div>{saveError && <p className={styles.reconcileError}>{saveError}</p>}<footer><button type="button" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar campanha"}</button></footer></form></div>}</div>;
}

function Dashboard({
  channel,
  leads,
  allLeads,
  stats,
  selectedMonth,
  start,
  end,
  products,
  allProducts,
  selectedProduct,
  setProduct,
  sources,
}: {
  channel: Channel;
  leads: Lead[];
  allLeads: Lead[];
  stats: {
    total: number;
    meetings: number;
    proposals: number;
    closed: number;
    sales: number;
    openValue: number;
    wonValue: number;
    netWonValue: number;
    conversion: number;
    proposalConversion: number;
    proposalValue: number;
    valueConversion: number;
    hot: number;
  };
  selectedMonth: string;
  start: string;
  end: string;
  products: ProductDefinition[];
  allProducts: ProductDefinition[];
  selectedProduct: string;
  setProduct: (product: string) => void;
  sources: string[];
}) {
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});
  const [journeyDetail, setJourneyDetail] = useState<{ title: string; leads: Lead[] } | null>(null);
  useEffect(() => { const load = () => { try { const saved = localStorage.getItem(goalsStorageKey); if (saved) setMonthlyGoals(JSON.parse(saved)); } catch {} }; load(); window.addEventListener("mensor-crm-database-loaded", load); return () => window.removeEventListener("mensor-crm-database-loaded", load); }, []);
  const updateMonthlyGoal = (month: string, value: number) => { const next = { ...monthlyGoals, [month]: value }; setMonthlyGoals(next); localStorage.setItem(goalsStorageKey, JSON.stringify(next)); window.dispatchEvent(new Event("mensor-crm-change")); };
  const generatedLeads = leads.filter((lead) => inRange(lead.createdAt, start, end));
  const periodPurchases = leads.flatMap((lead) => purchasesForLead(lead, products)
    .filter((purchase) => purchaseMatchesChannel(purchase, lead, channel) && inRange(purchase.closedAt, start, end))
    .map((purchase) => ({ lead, purchase })));
  const periodClosingLeads = new Set(periodPurchases.map(({ lead }) => lead.id)).size;
  const periodMeetingBookings = leads.filter((lead) => lead.meetingOutcome !== "Cancelada" && inRange(lead.meetingScheduledFor || undefined, start, end));
  const periodHeldMeetings = leads.filter((lead) => lead.meetingOutcome === "Realizada" && inRange(lead.meetingScheduledFor || undefined, start, end));
  const periodNoShows = leads.filter((lead) => lead.meetingOutcome === "No-show" && inRange(lead.meetingScheduledFor || undefined, start, end));
  const periodClosingIds = new Set(periodPurchases.map(({ lead }) => lead.id));
  const activeLeads = leads.filter((lead) => inRange(lead.createdAt, start, end) || inRange(lead.conversationAt, start, end) || inRange(lead.meetingAt, start, end) || inRange(lead.meetingScheduledFor || undefined, start, end) || inRange(lead.proposalAt, start, end) || periodClosingIds.has(lead.id));
  const priorActiveLeads = activeLeads.filter((lead) => brazilDateKey(lead.createdAt) < start);
  const happenedByEnd = (date?: string | null) => Boolean(date && brazilDateKey(date) <= end);
  const journeyHeldMeetings = activeLeads.filter((lead) => lead.meetingOutcome === "Realizada" && happenedByEnd(lead.meetingScheduledFor));
  const heldBefore = (lead: Lead, date?: string | null) => Boolean(lead.meetingOutcome === "Realizada" && lead.meetingScheduledFor && date && brazilDateKey(lead.meetingScheduledFor) <= brazilDateKey(date));
  const meetingProposals = activeLeads.filter((lead) => happenedByEnd(lead.proposalAt) && heldBefore(lead, lead.proposalAt));
  const directProposals = activeLeads.filter((lead) => happenedByEnd(lead.proposalAt) && !heldBefore(lead, lead.proposalAt));
  const meetingSales = activeLeads.filter((lead) => purchasesForLead(lead, products).some((purchase) => purchaseMatchesChannel(purchase, lead, channel) && happenedByEnd(purchase.closedAt) && heldBefore(lead, purchase.closedAt)));
  const directSales = activeLeads.filter((lead) => purchasesForLead(lead, products).some((purchase) => purchaseMatchesChannel(purchase, lead, channel) && happenedByEnd(purchase.closedAt) && !heldBefore(lead, purchase.closedAt)));
  const directConversations = activeLeads.filter((lead) => happenedByEnd(lead.conversationAt) && !heldBefore(lead, end));
  const meetingConversion = journeyHeldMeetings.length ? meetingSales.length / journeyHeldMeetings.length * 100 : 0;
  const directConversion = directConversations.length ? directSales.length / directConversations.length * 100 : 0;
  return (
    <div className={`${styles.content} ${styles.dashboardContent}`}>
      <DashboardProductFilter products={allProducts} value={selectedProduct} set={setProduct} />
      <div className={styles.kpis}>
        <Kpi label="Leads novos" value={String(generatedLeads.length)} detail="Entraram no período" />
        <Kpi label="Leads da base" value={String(priorActiveLeads.length)} detail="Antigos movimentados no período" />
        <Kpi label="Reuniões agendadas" value={String(periodMeetingBookings.length)} detail="Marcadas para o período" />
        <Kpi label="Reuniões realizadas" value={String(periodHeldMeetings.length)} detail="Compareceram" />
        <Kpi label="No-show" value={String(periodNoShows.length)} detail="Não compareceram" />
        <Kpi label="Clientes fechados" value={String(periodClosingLeads)} detail={`${periodPurchases.length} vendas · ${currency.format(periodPurchases.reduce((sum, { purchase }) => sum + purchase.value, 0))}`} />
      </div>
      <FinancialSummary stats={stats} />
      <div className={styles.analysisColumn}><ProductValueChart channel={channel} leads={leads} start={start} end={end} products={products} /></div>
      <section className={`${styles.funnelColumn} ${styles.journeyFunnelColumn}`}>
        <PanelTitle eyebrow="Conversão comercial" title="Funil do período" />
        <p className={styles.sourceIntro}>
          O período escolhe os leads ativos; cada venda pertence exclusivamente ao caminho com reunião ou ao caminho direto.
        </p>
        <div className={styles.journeyBase}><span>Leads totais</span><strong>{activeLeads.length}</strong><small>{generatedLeads.length} novos + {priorActiveLeads.length} da base movimentados</small></div>
        <div className={styles.journeyPaths}>
          <article className={styles.meetingJourney}><header><span>CAMINHO 1</span><h4>Venda com reunião</h4><p>Quando houve reunião realizada antes da proposta ou venda.</p></header><div><button onClick={() => setJourneyDetail({ title: "Reuniões realizadas", leads: journeyHeldMeetings })}><small>Reuniões realizadas</small><b>{journeyHeldMeetings.length}</b></button><i>→</i><button onClick={() => setJourneyDetail({ title: "Propostas após reunião", leads: meetingProposals })}><small>Propostas após reunião</small><b>{meetingProposals.length}</b></button><i>→</i><button onClick={() => setJourneyDetail({ title: "Vendas após reunião", leads: meetingSales })}><small>Vendas</small><b>{meetingSales.length}</b></button></div><footer><span>Conversão reunião → venda</span><b>{meetingConversion.toFixed(1)}%</b><small>{meetingProposals.length ? `${(meetingSales.length / meetingProposals.length * 100).toFixed(1)}% proposta → venda` : "Sem propostas após reunião"}</small></footer></article>
          <article className={styles.directJourney}><header><span>CAMINHO 2</span><h4>Venda direta no WhatsApp</h4><p>Quando a negociação avançou sem reunião realizada.</p></header><div><button onClick={() => setJourneyDetail({ title: "Conversas diretas", leads: directConversations })}><small>Conversas diretas</small><b>{directConversations.length}</b></button><i>→</i><button onClick={() => setJourneyDetail({ title: "Propostas diretas", leads: directProposals })}><small>Propostas diretas</small><b>{directProposals.length}</b></button><i>→</i><button onClick={() => setJourneyDetail({ title: "Vendas diretas", leads: directSales })}><small>Vendas</small><b>{directSales.length}</b></button></div><footer><span>Conversão conversa → venda</span><b>{directConversion.toFixed(1)}%</b><small>{directProposals.length ? `${(directSales.length / directProposals.length * 100).toFixed(1)}% proposta → venda` : "Sem propostas diretas"}</small></footer></article>
        </div>
        <OriginValueChart channel={channel} leads={leads} start={start} end={end} sources={sources} />
      </section>
      {journeyDetail && <div className={styles.backdrop} onMouseDown={() => setJourneyDetail(null)}><section className={`${styles.modal} ${styles.journeyDetailModal}`} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Detalhamento da jornada</span><h2>{journeyDetail.title}</h2><p>{journeyDetail.leads.length} lead{journeyDetail.leads.length === 1 ? "" : "s"}</p></div><button onClick={() => setJourneyDetail(null)}>×</button></header><div>{journeyDetail.leads.map((lead) => <article key={lead.id}><span><b>{lead.name}</b><small>{lead.product || "Produto não informado"} · {inRange(lead.createdAt, start, end) ? "Lead novo" : "Base anterior"}</small></span><strong>{lead.source}</strong></article>)}{!journeyDetail.leads.length && <p>Nenhum lead nesta etapa.</p>}</div></section></div>}
      <MonthlyMetricsChart channel={channel} leads={allLeads} endMonth={selectedMonth} goals={monthlyGoals} setGoal={updateMonthlyGoal} />
    </div>
  );
}

function Pipeline({
  leads,
  products,
  stages,
  setStages,
  moveLead,
  toggleContactToday,
  select,
  search,
}: {
  leads: Lead[];
  products: ProductDefinition[];
  stages: Stage[];
  setStages: (stages: Stage[]) => void;
  moveLead: (id: string, stage: Stage) => void;
  toggleContactToday: (id: string) => void;
  select: (lead: Lead) => void;
  search: string;
}) {
  const [range, setRange] = useState({ start: "", end: "" });
  const [productFilter, setProductFilter] = useState("Todos");
  const [newStage, setNewStage] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const archived = isDisqualifiedLead;
  const visibleStage = (lead: Lead) => stages.includes(lead.stage) ? lead.stage : stages[0] || "Novo lead";
  const stageItems = useMemo(() => {
    const grouped = new Map<Stage, Lead[]>(stages.map((stage) => [stage, []]));
    for (const lead of leads) {
      const purchases = purchasesForLead(lead, products);
      const matchesRange = !range.start && !range.end
        ? true
        : purchases.length
          ? purchases.some((purchase) => (!range.start || brazilDateKey(purchase.closedAt) >= range.start) && (!range.end || brazilDateKey(purchase.closedAt) <= range.end))
          : (!range.start || brazilDateKey(lead.createdAt) >= range.start) && (!range.end || brazilDateKey(lead.createdAt) <= range.end);
      if (!matchesRange) continue;
      if (productFilter !== "Todos" && lead.product !== productFilter && !purchases.some((purchase) => purchase.product === productFilter)) continue;
      if (!search && archived(lead)) continue;
      const stage = visibleStage(lead);
      grouped.get(stage)?.push(lead);
    }
    const closedStage = stages.find((stage) => stage.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === "fechado");
    if (closedStage) grouped.get(closedStage)?.sort((left, right) => {
      const latestClosing = (lead: Lead) => purchasesForLead(lead, products).reduce((latest, purchase) => Math.max(latest, new Date(purchase.closedAt).getTime() || 0), 0);
      return latestClosing(right) - latestClosing(left);
    });
    return grouped;
  }, [leads, products, stages, range.start, range.end, productFilter, search]);
  const moveStage = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= stages.length) return; const next = [...stages]; [next[index], next[target]] = [next[target], next[index]]; setStages(next); };
  const addStage = (event: React.FormEvent) => { event.preventDefault(); const name = newStage.trim(); if (!name || stages.some((stage) => stage.toLowerCase() === name.toLowerCase())) return; setStages([...stages, name]); setNewStage(""); };
  const toggleLeadSelection = (id: string) => setSelectedLeadIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const startLeadDrag = (event: React.DragEvent<HTMLElement>, id: string) => {
    const ids = selectedLeadIds.has(id) ? [...selectedLeadIds] : [id];
    if (!selectedLeadIds.has(id)) setSelectedLeadIds(new Set(ids));
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("leadIds", JSON.stringify(ids));
    event.dataTransfer.setData("leadId", id);
  };
  const dropLeads = (event: React.DragEvent<HTMLElement>, stage: Stage) => {
    event.preventDefault();
    let ids: string[] = [];
    try {
      const transferred = JSON.parse(event.dataTransfer.getData("leadIds"));
      if (Array.isArray(transferred)) ids = transferred.filter((id): id is string => typeof id === "string");
    } catch {
      // Compatibilidade com cards arrastados antes da selecao multipla.
    }
    if (!ids.length) {
      const id = event.dataTransfer.getData("leadId");
      if (id) ids = [id];
    }
    const validIds = [...new Set(ids)].filter((id) => leads.some((lead) => lead.id === id && visibleStage(lead) !== stage));
    validIds.forEach((id) => moveLead(id, stage));
    setSelectedLeadIds(new Set());
  };
  return (
    <div className={styles.pipelineWrap}>
      <div className={styles.pipelineTools}><div className={styles.pipelineFilters}><span>Filtrar pipeline</span><QuickPeriodButtons start={range.start} end={range.end} setRange={(start, end) => setRange({ start, end })} /><label><small>Data inicial</small><input type="date" value={range.start} max={range.end || undefined} onChange={(event) => setRange({ ...range, start: event.target.value })} /></label><label><small>Data final</small><input type="date" value={range.end} min={range.start || undefined} onChange={(event) => setRange({ ...range, end: event.target.value })} /></label><label><small>Produto</small><select value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option>Todos</option>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label></div>{selectedLeadIds.size > 0 && <div className={styles.multiSelection}><b>{selectedLeadIds.size} selecionado{selectedLeadIds.size === 1 ? "" : "s"}</b><span>Arraste um deles para mover todos</span><button type="button" onClick={() => setSelectedLeadIds(new Set())}>Limpar</button></div>}<form onSubmit={addStage}><span>Nova etapa</span><input value={newStage} onChange={(event) => setNewStage(event.target.value)} placeholder="Ex.: Follow-up" /><button aria-label="Adicionar etapa">+</button></form></div>
      <div className={styles.pipelineScroller}><div className={styles.pipeline} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(245px, 1fr))`, minWidth: `${stages.length * 255}px` }}>
        {stages.map((stage) => {
          const items = stageItems.get(stage) || [];
          const stageIndex = stages.indexOf(stage);
          const allStageLeadsSelected = items.length > 0 && items.every((lead) => selectedLeadIds.has(lead.id));
          const toggleStageSelection = () => setSelectedLeadIds((current) => {
            const next = new Set(current);
            if (allStageLeadsSelected) items.forEach((lead) => next.delete(lead.id));
            else items.forEach((lead) => next.add(lead.id));
            return next;
          });
          return (
            <section
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => dropLeads(event, stage)}
            >
              <header>
                <div>
                  <i style={{ background: stageColor(stage), boxShadow: `0 0 9px ${stageColor(stage)}88` }} />
                  <b>{stage}</b>
                  <span>{items.length}</span>
                </div>
                <div className={styles.stageActions}><button type="button" className={styles.stageSelectAll} aria-pressed={allStageLeadsSelected} onClick={toggleStageSelection} disabled={!items.length}>{allStageLeadsSelected ? "✓ Todos" : "Selecionar todos"}</button><button type="button" aria-label={`Mover etapa ${stage} para a esquerda`} onClick={() => moveStage(stageIndex,-1)} disabled={!stageIndex}>←</button><button type="button" aria-label={`Mover etapa ${stage} para a direita`} onClick={() => moveStage(stageIndex,1)} disabled={stageIndex === stages.length - 1}>→</button></div>
              </header>
              <div className={styles.cards}>
                {items.map((lead) => {
                  const followUpKey = brazilDateKey(lead.followUpAt || undefined);
                  const todayKey = brazilDateKey(new Date());
                  const followUpState = followUpKey < todayKey ? "late" : followUpKey === todayKey ? "today" : "future";
                  return (
                  <article
                    key={lead.id}
                    draggable
                    className={selectedLeadIds.has(lead.id) ? styles.cardSelected : undefined}
                    style={{ borderLeft: `3px solid ${stageColor(stage)}` }}
                    onDragStart={(event) => startLeadDrag(event, lead.id)}
                    onClick={() => select(lead)}
                  >
                    <div className={styles.cleanCard}>
                      <div>
                        <div className={styles.cardTitle}><button type="button" aria-label={`${selectedLeadIds.has(lead.id) ? "Desmarcar" : "Selecionar"} ${lead.name}`} aria-pressed={selectedLeadIds.has(lead.id)} onClick={(event) => { event.stopPropagation(); toggleLeadSelection(lead.id); }}>{selectedLeadIds.has(lead.id) ? "✓" : ""}</button><h3>{lead.name}</h3></div>
                        <p><span>Origem</span>{lead.source}</p>
                        {lead.product && lead.product !== "Não informado" && <em className={styles.productTag} style={{ color: productColor(lead.product), borderColor: `${productColor(lead.product)}66`, background: `${productColor(lead.product)}18` }}>{lead.product}</em>}
                        {lead.tags?.length ? <div className={styles.cardTags}>{lead.tags.slice(0,3).map((tag) => <span key={tag} style={{ color: tagColor(tag), borderColor: `${tagColor(tag)}55`, background: `${tagColor(tag)}16` }}>{tag}</span>)}</div> : null}
                        {followUpKey && <div className={`${styles.followUpAlert} ${styles[`followUp_${followUpState}`]}`}><i>↗</i><span>{followUpState === "late" ? "Retorno atrasado" : followUpState === "today" ? "Retornar hoje" : "Retornar"}</span><b>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(lead.followUpAt!))}</b></div>}
                      </div>
                      {lead.phone && (
                        <a href={whatsappLink(lead)} target="_blank" rel="noopener noreferrer" style={{ color: `color-mix(in srgb, ${stageColor(stage)} 82%, white)`, background: `${stageColor(stage)}20`, borderColor: `${stageColor(stage)}66` }} aria-label={`Chamar ${lead.name} no WhatsApp`} onClick={(event) => event.stopPropagation()}>
                          <WhatsAppIcon />
                        </a>
                      )}
                    </div>
                    {!['fechado', 'nao fechou', 'desqualificado'].includes(stage.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()) && <ContactCheckpoint lead={lead} toggle={() => toggleContactToday(lead.id)} />}
                  </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div></div>
    </div>
  );
}

function ContactCheckpoint({ lead, toggle }: { lead: Lead; toggle: () => void }) {
  const checkpoints = lead.contactCheckpoints || [];
  const doneToday = checkpoints.some((checkpoint) => brazilDateKey(checkpoint) === brazilDateKey(new Date()));
  const last = [...checkpoints].sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
  return (
    <button
      type="button"
      className={`${styles.contactCheckpoint} ${doneToday ? styles.contactCheckpointDone : ""}`}
      onClick={(event) => { event.stopPropagation(); toggle(); }}
      title={doneToday ? "Desmarcar contato de hoje" : "Registrar contato feito hoje"}
    >
      <i>{doneToday ? "✓" : ""}</i>
      <span>
        <b>{doneToday ? "Contato hoje" : "Marcar contato"}</b>
        {last && <small>Últ. {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(last))}</small>}
      </span>
      {checkpoints.length > 0 && <em>{checkpoints.length}</em>}
    </button>
  );
}

function Contacts({
  leads,
  sources,
  products,
  select,
}: {
  leads: Lead[];
  sources: string[];
  products: ProductDefinition[];
  select: (lead: Lead) => void;
}) {
  const [sourceFilter, setSourceFilter] = useState("Todos");
  const [productFilter, setProductFilter] = useState("Todos");
  const [ascensionFilter, setAscensionFilter] = useState("Todos");
  const [contactRange, setContactRange] = useState({ start: "", end: "" });
  const sourceTags = sources;
  const canAscend = (lead: Lead) => { const history = purchasesForLead(lead, products); if (!history.length) return false; const ladder = productLadder(products); const index = ladder.findIndex((product) => product.name === history.at(-1)?.product); return index >= 0 && index < ladder.length - 1; };
  const hasRepurchase = (lead: Lead) => purchasesForLead(lead, products).some((purchase) => purchase.repurchase);
  const inContactRange = (lead: Lead) => (!contactRange.start || brazilDateKey(lead.createdAt) >= contactRange.start) && (!contactRange.end || brazilDateKey(lead.createdAt) <= contactRange.end);
  const visibleLeads = leads.filter((lead) => inContactRange(lead) && (sourceFilter === "Todos" || lead.source.trim() === sourceFilter) && (productFilter === "Todos" || lead.product === productFilter || purchasesForLead(lead, products).some((purchase) => purchase.product === productFilter)) && (ascensionFilter === "Todos" || (ascensionFilter === "Possível ascensão" ? canAscend(lead) : hasRepurchase(lead))));
  const exportExcel = () => { const rows = [["Nome", "Empresa", "WhatsApp", "E-mail", "Origem", "Produto", "Etapa", "Valor", "Data do lead", "Data do fechamento"], ...visibleLeads.map((lead) => [lead.name, lead.company, lead.phone, lead.email, lead.source, lead.product || "", lead.stage, String(lead.value), lead.createdAt || "", lead.closedAt || ""])]; const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n")}`; const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = contactRange.start || contactRange.end ? `leads-${contactRange.start || "inicio"}-${contactRange.end || "hoje"}.csv` : "todos-os-leads.csv"; link.click(); URL.revokeObjectURL(url); };
  return (
    <div className={styles.content}>
      <section className={styles.panel}>
        <PanelTitle
          eyebrow="Base comercial"
          title={`${visibleLeads.length} leads`}
        />
        <div className={styles.contactFilters}>
          <div><span>Filtrar leads</span><small>Todos os leads aparecem por padrão. Use período e etiquetas somente quando quiser refinar a visualização ou exportação.</small></div>
          <div className={styles.contactFilterFields}><QuickPeriodButtons start={contactRange.start} end={contactRange.end} setRange={(start, end) => setContactRange({ start, end })} /><label><span>Data inicial</span><input type="date" value={contactRange.start} max={contactRange.end || undefined} onChange={(event) => setContactRange({ ...contactRange, start: event.target.value })} /></label><label><span>Data final</span><input type="date" value={contactRange.end} min={contactRange.start || undefined} onChange={(event) => setContactRange({ ...contactRange, end: event.target.value })} /></label><label><span>Origem</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option>Todos</option>{sourceTags.map((source) => <option key={source}>{source}</option>)}</select></label><label><span>Produto</span><select value={productFilter} onChange={(event) => setProductFilter(event.target.value)}><option>Todos</option>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><label><span>Esteira</span><select value={ascensionFilter} onChange={(event) => setAscensionFilter(event.target.value)}><option>Todos</option><option>Possível ascensão</option><option>Clientes com recompra</option></select></label><button onClick={exportExcel}>↓ Baixar Excel</button></div>
        </div>
        <div className={styles.sourceChips}>
          <button className={sourceFilter === "Todos" ? styles.selectedChip : ""} onClick={() => setSourceFilter("Todos")}>Todos <b>{leads.filter(inContactRange).length}</b></button>
          {sourceTags.map((source) => { const count = leads.filter((lead) => lead.source.trim() === source && inContactRange(lead)).length; return <button key={source} className={sourceFilter === source ? styles.selectedChip : ""} onClick={() => setSourceFilter(source)}>{source}<b>{count}</b></button>; })}
        </div>
        <div className={styles.contactTable}>
          <header>
            <b>Contato</b>
            <b>Origem</b>
            <b>Etapa</b>
            <b>Esteira</b>
            <b>Etiquetas</b>
          </header>
          {visibleLeads.map((lead) => (
            <button key={lead.id} onClick={() => select(lead)}>
              <span>
                <i>{lead.name.slice(0, 2).toUpperCase()}</i>
                <span>
                  <b>{lead.name}</b>
                  <small>
                    {lead.company} · {lead.phone}
                  </small>
                </span>
              </span>
              <span><i className={styles.sourceTag}>{lead.source}</i></span>
              <span><i className={styles.stageTag} style={{ color: stageColor(lead.stage), borderColor: `${stageColor(lead.stage)}55`, background: `${stageColor(lead.stage)}16` }}>{lead.stage}</i></span>
              <strong>{canAscend(lead) ? "Possível ascensão" : hasRepurchase(lead) ? "Recompra" : purchasesForLead(lead, products).length ? "Cliente" : "Novo lead"}</strong>
              <span>{lead.tags?.slice(0, 2).join(" · ") || "—"}</span>
            </button>
          ))}
          {!visibleLeads.length && <div className={styles.emptyContacts}>Nenhum contato encontrado com essa etiqueta de origem.</div>}
        </div>
      </section>
    </div>
  );
}
function Details({ products, sources, saveProducts, saveSources, renameProduct, renameSource, deleteRecord }: { products: ProductDefinition[]; sources: string[]; saveProducts: (items: ProductDefinition[]) => void; saveSources: (items: string[]) => void; renameProduct: (oldName: string, product: ProductDefinition) => Promise<void>; renameSource: (oldName: string, name: string) => Promise<void>; deleteRecord: (entity: "product" | "source" | "message", id: string) => Promise<boolean> }) {
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; text: string }>>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [addingMessage, setAddingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductDefinition | "new" | null>(null);
  const [productDraft, setProductDraft] = useState({ name: "", gross: "", net: "" });
  const [editingSource, setEditingSource] = useState<string | "new" | null>(null);
  const [sourceDraft, setSourceDraft] = useState("");
  useEffect(() => { const load = () => { try { const saved = localStorage.getItem("mensor-crm-messages-v1"); if (saved) setTemplates(JSON.parse(saved)); } catch {} }; load(); window.addEventListener("mensor-crm-database-loaded", load); return () => window.removeEventListener("mensor-crm-database-loaded", load); }, []);
  const saveTemplates = (next: Array<{ id: string; title: string; text: string }>) => { setTemplates(next); localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(next)); window.dispatchEvent(new Event("mensor-crm-change")); };
  const addTemplate = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !message.trim()) return; saveTemplates(editingMessage ? templates.map((item) => item.id === editingMessage ? { ...item, title: title.trim(), text: message.trim() } : item) : [{ id: uniqueId(), title: title.trim(), text: message.trim() }, ...templates]); setTitle(""); setMessage(""); setEditingMessage(null); setAddingMessage(false); };
  const copyTemplate = async (id: string, text: string) => { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); };
  const addProduct = () => { setProductDraft({ name: "", gross: "", net: "" }); setEditingProduct("new"); };
  const addSource = () => { setSourceDraft(""); setEditingSource("new"); };
  const editProduct = (product: ProductDefinition) => { setProductDraft({ name: product.name, gross: String(product.price), net: String(product.netPrice ?? product.price) }); setEditingProduct(product); };
  const editSource = (source: string) => { setSourceDraft(source); setEditingSource(source); };
  const moveProduct = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= products.length) return; const next = [...products]; [next[index], next[target]] = [next[target], next[index]]; saveProducts(next.map((product, position) => ({ ...product, position }))); };
  const submitProduct = async (event: React.FormEvent) => { event.preventDefault(); const name = productDraft.name.trim(); if (!name) return; const price = Number(productDraft.gross)||0; const netPrice = Number(productDraft.net)||0; if (price < 0 || netPrice < 0 || netPrice > price) { window.alert("O valor líquido do produto deve estar entre zero e o valor bruto."); return; } if (editingProduct === "new") saveProducts([...products,{ name, price, netPrice, priceHistory: [] }]); else if (editingProduct) { const changed = editingProduct.price !== price || (editingProduct.netPrice ?? editingProduct.price) !== netPrice; const priceHistory = changed ? [...(editingProduct.priceHistory || []), { id: uniqueId(), changedAt: new Date().toISOString(), previousPrice: editingProduct.price, previousNetPrice: editingProduct.netPrice ?? editingProduct.price, price, netPrice }] : editingProduct.priceHistory || []; await renameProduct(editingProduct.name,{ name, price, netPrice, priceHistory }); } setEditingProduct(null); };
  const submitSource = async (event: React.FormEvent) => { event.preventDefault(); const name = sourceDraft.trim(); if (!name) return; if (editingSource === "new") saveSources([...sources,name]); else if (editingSource) await renameSource(editingSource,name); setEditingSource(null); };
  const editTemplate = (template: { id: string; title: string; text: string }) => { setTitle(template.title); setMessage(template.text); setEditingMessage(template.id); setAddingMessage(true); };
  return (
    <div className={`${styles.content} ${styles.detailsPage}`}>
      <header className={styles.detailsIntro}><span>Configurações do CRM</span><h2>Cadastros e recursos da operação</h2><p>Gerencie os registros utilizados na pipeline, nos filtros e nas métricas.</p></header>
      <div className={styles.detailCatalogs}>
        <section className={styles.detailCatalog}><header><div><span>Esteira de ascensão</span><h3>Produtos</h3><small>A ordem abaixo define a próxima oferta de cada cliente.</small></div><button onClick={addProduct}>+ Produto</button></header><div>{products.map((product,index) => <article key={product.name}><div className={styles.productIdentity}><span>{index + 1}</span><div><b>{product.name}</b><small>Taxas: {currency.format(Math.max(0, product.price - (product.netPrice ?? product.price)))}</small></div></div><div className={styles.productValues}><span>Bruto <b>{currency.format(product.price)}</b></span><span>Líquido <b>{currency.format(product.netPrice ?? product.price)}</b></span></div>{product.priceHistory?.length ? <details className={styles.priceHistory}><summary>Histórico de alterações <b>{product.priceHistory.length}</b></summary><div>{[...product.priceHistory].reverse().map((change) => <article key={change.id}><time>{formatEventDate(change.changedAt)}</time><span>Bruto: {currency.format(change.previousPrice)} → {currency.format(change.price)}</span><span>Líquido: {currency.format(change.previousNetPrice)} → {currency.format(change.netPrice)}</span></article>)}</div></details> : <small className={styles.noPriceHistory}>Nenhuma alteração de valor</small>}<div className={styles.catalogActions}><button className={styles.orderButton} onClick={() => moveProduct(index,-1)} disabled={!index} aria-label={`Subir ${product.name}`}>↑</button><button className={styles.orderButton} onClick={() => moveProduct(index,1)} disabled={index === products.length - 1} aria-label={`Descer ${product.name}`}>↓</button><button onClick={() => editProduct(product)}>Editar</button><button onClick={async () => { if (await deleteRecord("product", product.name)) saveProducts(products.filter((item) => item.name !== product.name)); }} aria-label={`Excluir ${product.name}`}>×</button></div></article>)}</div></section>
        <section className={styles.detailCatalog}><header><div><span>Etiquetas</span><h3>Origens de lead</h3></div><button onClick={addSource}>+ Origem</button></header><div>{sources.map((source) => <article key={source}><div><b>{source}</b><small>Origem disponível no CRM</small></div><i className={styles.sourceTag}>{source}</i><div className={styles.catalogActions}><button onClick={() => editSource(source)}>Editar</button><button onClick={async () => { if (await deleteRecord("source", source)) saveSources(sources.filter((item) => item !== source)); }} aria-label={`Excluir ${source}`}>×</button></div></article>)}</div></section>
      </div>
      <section className={styles.messageWorkspace}>
        <section className={styles.messageLibrary}><header><div><span>Pipeline</span><h2>Mensagens salvas</h2></div><div className={styles.messageHeaderActions}><b>{templates.length}</b><button onClick={() => { setTitle(""); setMessage(""); setEditingMessage(null); setAddingMessage(true); }}>+ Adicionar mensagem</button></div></header>{templates.length ? <div>{templates.map((template) => <article key={template.id}><header><h3>{template.title}</h3><div className={styles.templateActions}><button onClick={() => editTemplate(template)}>Editar</button><button onClick={async () => { if (await deleteRecord("message", template.id)) saveTemplates(templates.filter((item) => item.id !== template.id)); }} aria-label="Excluir mensagem">×</button></div></header><p>{template.text}</p><button onClick={() => copyTemplate(template.id, template.text)}>{copied === template.id ? "Copiada!" : "Copiar mensagem"}</button></article>)}</div> : <div className={styles.emptyMessages}><i>✉</i><b>Nenhuma mensagem cadastrada</b><span>Use o botão “Adicionar mensagem” para criar seu primeiro modelo.</span></div>}</section>
      </section>
      {addingMessage && <div className={styles.backdrop} onMouseDown={() => setAddingMessage(false)}><form className={`${styles.messageForm} ${styles.messageModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={addTemplate}><header><button type="button" onClick={() => setAddingMessage(false)}>×</button><span>Mensagem da pipeline</span><h2>{editingMessage ? "Editar mensagem" : "Cadastrar mensagem padrão"}</h2><p>Crie um texto pronto para agilizar seus contatos comerciais.</p></header><label><span>Nome da mensagem</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Primeiro contato" autoFocus required /></label><label><span>Texto da mensagem</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva a mensagem que deseja reutilizar..." rows={7} required /></label><button type="submit">Salvar mensagem</button></form></div>}
      {editingProduct && <div className={styles.backdrop} onMouseDown={() => setEditingProduct(null)}><form className={`${styles.modal} ${styles.detailModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submitProduct}><header><div><span>Produto</span><h2>{editingProduct === "new" ? "Cadastrar produto" : "Editar produto"}</h2></div><button type="button" onClick={() => setEditingProduct(null)}>×</button></header><div className={styles.formGrid}><Input label="Nome do produto" value={productDraft.name} set={(name) => setProductDraft({...productDraft,name})} required /><Input label="Valor bruto" value={productDraft.gross} set={(gross) => setProductDraft({...productDraft,gross})} type="number" /><Input label="Valor líquido" value={productDraft.net} set={(net) => setProductDraft({...productDraft,net})} type="number" /></div><footer><button type="button" onClick={() => setEditingProduct(null)}>Cancelar</button><button type="submit">Salvar produto</button></footer></form></div>}
      {editingSource && <div className={styles.backdrop} onMouseDown={() => setEditingSource(null)}><form className={`${styles.modal} ${styles.detailModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submitSource}><header><div><span>Origem</span><h2>{editingSource === "new" ? "Cadastrar origem" : "Editar origem"}</h2></div><button type="button" onClick={() => setEditingSource(null)}>×</button></header><div className={styles.formGrid}><Input label="Nome da origem" value={sourceDraft} set={setSourceDraft} required /></div><footer><button type="button" onClick={() => setEditingSource(null)}>Cancelar</button><button type="submit">Salvar origem</button></footer></form></div>}
    </div>
  );
}

function ImportLeadsModal({ existing, stages, products, sources, close, save }: { existing: Lead[]; stages: Stage[]; products: ProductDefinition[]; sources: string[]; close: () => void; save: (leads: Lead[]) => Promise<void> }) {
  type PreviewRow = { rowNumber: number; name: string; company: string; source: string; product: string; stage: string; lead?: Lead; duplicate?: boolean; status: "Pronto" | "Atualizar" | "Inválido"; issue?: string };
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [page, setPage] = useState(1);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const parseDate = (value: unknown) => {
    if (typeof value === "number") { const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000); return new Date(`${date.toISOString().slice(0,10)}T12:00:00-03:00`).toISOString(); }
    const text = String(value || "").trim();
    if (!text) return undefined;
    const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    const date = brazilian ? new Date(`${brazilian[3]}-${String(brazilian[2]).padStart(2,"0")}-${String(brazilian[1]).padStart(2,"0")}T${String(brazilian[4] || 12).padStart(2,"0")}:${brazilian[5] || "00"}:${brazilian[6] || "00"}-03:00`) : new Date(text.length === 10 ? `${text}T12:00:00-03:00` : text);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };
  const numberValue = (value: unknown) => Number(String(value ?? "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")) || 0;
  const downloadTemplate = async () => { const XLSX = await import("xlsx"); const headers = [["Nome", "Empresa", "WhatsApp", "E-mail", "Origem", "Produto", "Etapa", "Temperatura", "Data do lead", "Data da conversa", "Data da reunião", "Data da proposta", "Data do fechamento", "Valor bruto personalizado", "Valor líquido personalizado"]]; const sheet = XLSX.utils.aoa_to_sheet(headers); sheet["!cols"] = headers[0].map((header) => ({ wch: Math.max(18, header.length + 3) })); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Leads"); XLSX.writeFile(workbook, "modelo-importacao-leads.xlsx"); };
  const readFile = async (file: File) => {
    setReading(true); setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      const existingKeys = new Set(existing.flatMap((lead) => [lead.email ? `e:${lead.email.trim().toLowerCase()}` : "", lead.phone ? `p:${phoneKey(lead.phone)}` : ""]).filter(Boolean));
      const importedKeys = new Set<string>();
      const parsed = rawRows.map((raw, index): PreviewRow => {
        const keyed = Object.fromEntries(Object.entries(raw).map(([key, value]) => [normalize(key), value]));
        const get = (...keys: string[]) => keys.map((key) => keyed[normalize(key)]).find((value) => String(value ?? "").trim()) ?? "";
        const importedName = String(get("Nome")).trim(); const company = String(get("Empresa", "Oficina")).trim(); const phone = String(get("WhatsApp", "Telefone")).trim(); const email = String(get("E-mail", "Email")).trim().toLowerCase();
        const existingLead = existing.find((lead) => (email && lead.email.trim().toLowerCase() === email) || (phone && phoneKey(lead.phone) === phoneKey(phone)));
        const name = importedName || existingLead?.name || "";
        const sourceInput = String(get("Origem")).trim(); const source = sources.find((item) => normalize(item) === normalize(sourceInput)) || sourceInput || existingLead?.source || "";
        const productInput = String(get("Produto")).trim(); const catalogProduct = products.find((item) => normalize(item.name) === normalize(productInput)); const product = catalogProduct?.name || productInput || "Não informado";
        const stageInput = String(get("Etapa")).trim(); const matchedStage = stages.find((item) => normalize(item) === normalize(stageInput)); const closedStage = stages.find((item) => normalize(item) === "fechado") || "Fechado"; const closedAlias = ["fechado", "fechamento", "venda", "vendido", "cliente"].includes(normalize(stageInput));
        const temperatureInput = String(get("Temperatura")).trim(); const temperature: Lead["temperature"] = ["Quente","Morno","Frio"].find((item) => normalize(item) === normalize(temperatureInput)) as Lead["temperature"] || "Morno";
        const createdAt = parseDate(get("Data do lead", "Data lead", "Data")) || existingLead?.createdAt; const conversationAt = parseDate(get("Data da conversa")); const meetingAt = parseDate(get("Data da reunião", "Data da reuniao")); const proposalAt = parseDate(get("Data da proposta")); const closedAt = parseDate(get("Data do fechamento", "Data fechamento", "Data da venda", "Data da compra"));
        const customGross = numberValue(get("Valor bruto personalizado", "Valor bruto", "Valor de fechamento", "Valor do fechamento", "Valor da venda", "Valor da compra")); const customNet = numberValue(get("Valor líquido personalizado", "Valor liquido personalizado", "Valor líquido", "Valor liquido", "Valor líquido do fechamento", "Valor liquido do fechamento")); const value = customGross || catalogProduct?.price || 0; const netValue = customNet || (catalogProduct?.netPrice ?? catalogProduct?.price ?? 0);
        // Uma data de fechamento preenchida comprova a venda mesmo quando a
        // coluna Etapa vier vazia. Nesse caso a compra deve entrar no card.
        const stage = matchedStage || (closedAlias || (!stageInput && Boolean(closedAt)) ? closedStage : "Novo lead");
        const keys = [email ? `e:${email}` : "", phone ? `p:${phoneKey(phone)}` : ""].filter(Boolean); const duplicate = keys.some((key) => existingKeys.has(key) || importedKeys.has(key)); keys.forEach((key) => importedKeys.add(key));
        let issue = !name ? "Nome não informado" : !createdAt ? "Data do lead inválida" : "";
        if (!issue && !existingLead && (!sourceInput || isGenericFormSource(source))) issue = "Informe uma origem específica cadastrada no CRM";
        if (!issue && sourceInput && !sources.some((item) => normalize(item) === normalize(sourceInput))) issue = "Origem não cadastrada";
        if (!issue && productInput && product === productInput && !catalogProduct) issue = "Produto não cadastrado";
        if (!issue && stageInput && !matchedStage && !closedAlias) issue = "Etapa não cadastrada";
        if (!issue && stage === closedStage && !closedAt) issue = "Fechamento sem data";
        if (!issue && stage === closedStage && value <= 0) issue = "Fechamento sem valor bruto";
        const leadId = uniqueId();
        const purchases: Purchase[] | undefined = stage === closedStage && closedAt ? [{ id: `pipeline-${uniqueId()}`, origin: "pipeline", product, source, value, netValue, closedAt, repurchase: false }] : undefined;
        const lead: Lead = { id: leadId, name, company, phone, email, source, product, stage, value, netValue, temperature, nextAction: "", date: createdAt ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(createdAt)) : "", createdAt, conversationAt, meetingAt, proposalAt, closedAt, purchases };
        return { rowNumber: index + 2, name: name || `Linha ${index + 2}`, company, source, product, stage, lead, duplicate, status: issue ? "Inválido" : duplicate ? "Atualizar" : "Pronto", issue: issue || (duplicate ? "Será acrescentado ao cadastro existente" : undefined) };
      });
      setRows(parsed); setPage(1);
    } catch { setRows([{ rowNumber: 0, name: "Arquivo não reconhecido", company: "", source: "", product: "", stage: "", status: "Inválido", issue: "Use o modelo em XLSX ou CSV" }]); setPage(1); }
    finally { setReading(false); }
  };
  const repairRow = (rowNumber: number, changes: Partial<Lead>) => setRows((current) => current.map((row) => {
    if (row.rowNumber !== rowNumber || !row.lead) return row;
    const lead = { ...row.lead, ...changes };
    const catalogProduct = products.find((item) => item.name === lead.product);
    if ("product" in changes && catalogProduct) { lead.value = catalogProduct.price; lead.netValue = catalogProduct.netPrice ?? catalogProduct.price; }
    let issue = !lead.name.trim() ? "Nome não informado" : !lead.createdAt ? "Data do lead inválida" : "";
    if (!issue && !sources.includes(lead.source)) issue = "Origem não cadastrada";
    if (!issue && lead.product !== "Não informado" && !catalogProduct) issue = "Produto não cadastrado";
    if (!issue && lead.stage === "Fechado" && !lead.closedAt) issue = "Fechamento sem data";
    lead.date = lead.createdAt ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(lead.createdAt)) : "";
    lead.purchases = lead.stage === "Fechado" && lead.closedAt ? [{ id: row.lead.purchases?.[0]?.id || `pipeline-${uniqueId()}`, origin: "pipeline", product: lead.product || "Não informado", source: lead.source, value: lead.value, netValue: lead.netValue ?? lead.value, closedAt: lead.closedAt, repurchase: false }] : undefined;
    return { ...row, name: lead.name || `Linha ${row.rowNumber}`, company: lead.company, source: lead.source, product: lead.product || "Não informado", stage: lead.stage, lead, status: issue ? "Inválido" : row.duplicate ? "Atualizar" : "Pronto", issue: issue || (row.duplicate ? "Será acrescentado ao cadastro existente" : undefined) };
  }));
  const ready = rows.filter((row) => row.status !== "Inválido" && row.lead).map((row) => row.lead as Lead);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rowBeingEdited = rows.find((row) => row.rowNumber === editingRow);
  return <div className={styles.backdrop} onMouseDown={close}><section className={`${styles.modal} ${styles.importModal}`} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Importação de contatos</span><h2>Subir leads por planilha</h2></div><button onClick={close}>×</button></header><div className={styles.importIntro}><p>Use o modelo para manter produtos, etapas e datas coerentes com as dashboards.</p><button onClick={downloadTemplate}>↓ Baixar planilha-modelo</button></div><label className={styles.fileDrop}><input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} /><span>{reading ? "Lendo planilha..." : fileName || "Selecionar arquivo XLSX ou CSV"}</span><small>Clique para escolher a planilha</small></label>{rows.length > 0 && <><div className={styles.importSummary}><span><b>{rows.filter((row) => row.status === "Pronto").length}</b> novos</span><span><b>{rows.filter((row) => row.status === "Atualizar").length}</b> atualizações</span><span><b>{rows.filter((row) => row.status === "Inválido").length}</b> inválidos</span></div><div className={styles.importPreview}><header><b>Lead</b><b>Origem / produto</b><b>Etapa</b><b>Status</b></header>{visibleRows.map((row) => <article key={`${row.rowNumber}-${row.name}`} className={row.status === "Inválido" ? styles.invalidImportRow : undefined}><span><b>{row.name}</b><small>Linha {row.rowNumber}{row.company ? ` · ${row.company}` : ""}</small></span><span><b>{row.source}</b><small>{row.product}</small></span><span>{row.stage}</span><em className={row.status === "Pronto" ? styles.importReady : row.status === "Atualizar" ? styles.importDuplicate : styles.importInvalid}>{row.status}<small>{row.issue}</small>{row.status === "Inválido" && <button type="button" onClick={() => setEditingRow(row.rowNumber)}>Corrigir linha</button>}</em></article>)}</div>{rows.length > pageSize && <nav className={styles.importPagination} aria-label="Páginas da planilha"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1}>← Anterior</button><span>Página {currentPage} de {pageCount} · {rows.length} linhas</span><button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount}>Próxima →</button></nav>}{rowBeingEdited?.lead && <section className={styles.importCorrection}><header><div><b>Corrigir linha {rowBeingEdited.rowNumber}</b><small>{rowBeingEdited.issue}</small></div><button type="button" onClick={() => setEditingRow(null)}>×</button></header><div><label><span>Nome</span><input value={rowBeingEdited.lead.name} onChange={(event) => repairRow(rowBeingEdited.rowNumber, { name: event.target.value })} /></label><label><span>Origem</span><select value={rowBeingEdited.lead.source} onChange={(event) => repairRow(rowBeingEdited.rowNumber, { source: event.target.value })}>{sources.map((source) => <option key={source}>{source}</option>)}</select></label><label><span>Produto</span><select value={rowBeingEdited.lead.product || "Não informado"} onChange={(event) => repairRow(rowBeingEdited.rowNumber, { product: event.target.value })}><option>Não informado</option>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><label><span>Etapa</span><select value={rowBeingEdited.lead.stage} onChange={(event) => repairRow(rowBeingEdited.rowNumber, { stage: event.target.value })}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label><span>Data do lead</span><input type="date" value={dateInputValue(rowBeingEdited.lead.createdAt)} onChange={(event) => repairRow(rowBeingEdited.rowNumber, { createdAt: dateFromInput(event.target.value) })} /></label>{rowBeingEdited.lead.stage === "Fechado" && <label><span>Data do fechamento</span><input type="date" value={dateInputValue(rowBeingEdited.lead.closedAt)} onChange={(event) => repairRow(rowBeingEdited.rowNumber, { closedAt: dateFromInput(event.target.value) })} /></label>}</div><footer><span className={rowBeingEdited.status === "Inválido" ? styles.importInvalid : styles.importReady}>{rowBeingEdited.status === "Inválido" ? rowBeingEdited.issue : "Linha corrigida e pronta"}</span><button type="button" onClick={() => setEditingRow(null)} disabled={rowBeingEdited.status === "Inválido"}>Concluir correção</button></footer></section>}</>}{saveError && <p className={styles.reconcileError}>{saveError}</p>}<footer><button onClick={close} disabled={saving}>Cancelar</button><button disabled={!ready.length || saving} onClick={async () => { setSaving(true); setSaveError(""); try { await save(ready); } catch { setSaveError("Não foi possível salvar a importação no banco. Tente novamente."); } finally { setSaving(false); } }}>{saving ? "Salvando…" : `Processar ${ready.length} registros`}</button></footer></section></div>;
}

function LeadModal({
  existing,
  products,
  sources,
  close,
  save,
  duplicate,
}: {
  existing: Lead[];
  products: ProductDefinition[];
  sources: string[];
  close: () => void;
  save: (lead: Lead) => Promise<void>;
  duplicate: (lead: Lead) => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: sources.find((source) => !isGenericFormSource(source)) || "",
    product: products[0]?.name || "",
    customGross: "",
    customNet: "",
    customDeal: false,
    temperature: "Morno" as Lead["temperature"],
    nextAction: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  return (
    <div className={styles.backdrop} onMouseDown={close}>
      <form
        className={`${styles.modal} ${styles.leadModal}`}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.source || isGenericFormSource(draft.source)) {
            setSaveError("Selecione uma origem específica cadastrada no CRM.");
            return;
          }
          const email = draft.email.trim().toLowerCase(); const phone = phoneKey(draft.phone);
          const match = existing.find((lead) => (email && lead.email.trim().toLowerCase() === email) || (phone && phoneKey(lead.phone) === phone));
          if (match) {
            if (isDisqualifiedLead(match)) {
              window.alert("Este contato já está cadastrado e arquivado como Desqualificado. O cadastro existente será aberto sem alterar nenhuma informação.");
              duplicate(match);
              return;
            }
            const updated = mergeLeadData(match, { ...match, name: match.name || draft.name.trim(), company: match.company || draft.company.trim(), phone: match.phone || draft.phone.trim(), email: match.email || email });
            setSaving(true); setSaveError("");
            try { await save(updated); window.alert("Contato já cadastrado. As novas informações foram acrescentadas ao lead existente."); duplicate(updated); }
            catch { setSaveError("Não foi possível atualizar o contato existente. Tente novamente."); }
            finally { setSaving(false); }
            return;
          }
          setSaving(true); setSaveError("");
          try {
            await save({
              ...draft,
              id: uniqueId(),
              stage: "Novo lead",
              value: draft.customDeal ? Number(draft.customGross) || 0 : products.find((product) => product.name === draft.product)?.price || 0,
              netValue: draft.customDeal ? Number(draft.customNet) || 0 : products.find((product) => product.name === draft.product)?.netPrice ?? products.find((product) => product.name === draft.product)?.price ?? 0,
              date: "Hoje",
              createdAt: new Date().toISOString(),
            });
          } catch {
            setSaveError("Não foi possível salvar o contato no banco. Tente novamente.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <header>
          <div>
            <span>Nova oportunidade</span>
            <h2>Cadastrar contato</h2>
          </div>
          <button type="button" onClick={close}>
            ×
          </button>
        </header>
        <div className={styles.formGrid}>
          <Input
            label="Nome"
            value={draft.name}
            set={(name) => setDraft({ ...draft, name })}
            required
          />
          <Input
            label="Oficina / empresa"
            value={draft.company}
            set={(company) => setDraft({ ...draft, company })}
            required
          />
          <Input
            label="WhatsApp"
            value={draft.phone}
            set={(phone) => setDraft({ ...draft, phone })}
          />
          <Input
            label="E-mail"
            value={draft.email}
            set={(email) => setDraft({ ...draft, email })}
            type="email"
          />
          <label>
            <span>Origem</span>
            <select required value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })}>
              {!draft.source && <option value="">Selecione a origem</option>}
              {sources.filter((source) => !isGenericFormSource(source)).map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label>
            <span>Produto</span>
            <select value={draft.product} onChange={(event) => setDraft({ ...draft, product: event.target.value })}>
              {products.map((product) => <option key={product.name} value={product.name}>{product.name}</option>)}
            </select>
          </label>
          <label className={styles.customDealToggle}><input type="checkbox" checked={draft.customDeal} onChange={(event) => setDraft({ ...draft, customDeal: event.target.checked })} /><span>Negociação com valores personalizados</span></label>
          {draft.customDeal && <><Input label="Valor bruto negociado" value={draft.customGross} set={(customGross) => setDraft({ ...draft, customGross })} type="number" required /><Input label="Valor líquido negociado" value={draft.customNet} set={(customNet) => setDraft({ ...draft, customNet })} type="number" required /></>}
          <label>
            <span>Temperatura</span>
            <select
              value={draft.temperature}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  temperature: event.target.value as Lead["temperature"],
                })
              }
            >
              <option>Quente</option>
              <option>Morno</option>
              <option>Frio</option>
            </select>
          </label>
        </div>
        {saveError && <p className={styles.reconcileError}>{saveError}</p>}
        <footer>
          <button type="button" onClick={close} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar oportunidade"}</button>
        </footer>
      </form>
    </div>
  );
}
function LeadDrawer({
  lead,
  products,
  sources,
  closers,
  availableTags,
  stages,
  close,
  move,
  update,
  renameTag,
  deleteTag,
  remove,
  deletePurchase,
  startAscension,
}: {
  lead: Lead;
  products: ProductDefinition[];
  sources: string[];
  closers: Closer[];
  availableTags: string[];
  stages: Stage[];
  close: () => void;
  move: (stage: Stage) => void;
  update: (changes: Partial<Lead>) => void;
  renameTag: (oldTag: string, newTag: string) => void;
  deleteTag: (tag: string) => void;
  remove: () => void | Promise<void>;
  deletePurchase: (id: string) => Promise<boolean>;
  startAscension: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: lead.name, company: lead.company, phone: lead.phone, email: lead.email, temperature: lead.temperature });
  const [newTag, setNewTag] = useState("");
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const [addingClosing, setAddingClosing] = useState(false);
  const closingProduct = products.find((item) => item.name === lead.product) || products[0];
  const [closingDraft, setClosingDraft] = useState({ product: closingProduct?.name || "", date: brazilDateKey(new Date()), gross: String(lead.value || closingProduct?.price || ""), net: String(lead.netValue ?? closingProduct?.netPrice ?? closingProduct?.price ?? ""), paymentMethod: "Pix" as PaymentMethod, provider: "", installments: "1", entry: "", firstDueDate: brazilDateKey(new Date()), paymentNotes: "", closerUserId: "" });
  const tags = lead.tags || [];
  const applicationAnswers = answersForLead(lead);
  const filledApplicationAnswers = applicationAnswers.filter((answer) => answer.resposta !== "Não preenchido").length;
  const applicationRevenue = applicationAnswers.find((answer) => normalizeQuestion(answer.pergunta) === normalizeQuestion("Qual a faixa de faturamento mensal da sua operação?"))?.resposta;
  const contactCheckpoints = [...(lead.contactCheckpoints || [])].sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  const today = brazilDateKey(new Date());
  const contactedToday = contactCheckpoints.some((checkpoint) => brazilDateKey(checkpoint) === today);
  const toggleTodayContact = () => update({ contactCheckpoints: contactedToday ? contactCheckpoints.filter((checkpoint) => brazilDateKey(checkpoint) !== today) : [...contactCheckpoints, new Date().toISOString()] });
  const removeContactCheckpoint = (checkpoint: string) => update({ contactCheckpoints: contactCheckpoints.filter((item) => item !== checkpoint) });
  const addTag = () => { const typed = newTag.trim(); if (!typed) return; const existing = availableTags.find((item) => item.toLowerCase() === typed.toLowerCase()); const tag = existing || typed; if (!tags.includes(tag)) update({ tags: [...tags, tag] }); setNewTag(""); };
  const saveTag = (index: number) => { const tag = tagDraft.trim(); if (!tag) return; renameTag(tags[index], tag); setEditingTag(null); setTagDraft(""); };
  const purchaseHistory = purchasesForLead(lead, products);
  const lastProduct = purchaseHistory.at(-1)?.product;
  const ladder = productLadder(products);
  const lastProductIndex = ladder.findIndex((product) => product.name === lastProduct);
  const nextProduct = ladder[lastProductIndex + 1];
  const editPurchaseDate = (purchaseId: string, date: string) => {
    const closedAt = dateFromInput(date);
    if (!closedAt) return;
    const purchases = purchaseHistory.map((purchase) => purchase.id === purchaseId ? { ...purchase, closedAt } : purchase);
    const isLatest = purchaseHistory.at(-1)?.id === purchaseId;
    update({ purchases, ...(isLatest ? { closedAt } : {}) });
  };
  const editPurchasePayment = (purchaseId: string, changes: Partial<Purchase>) => {
    const purchases = purchaseHistory.map((purchase) => purchase.id === purchaseId ? { ...purchase, ...changes, installments: changes.paymentMethod && !purchase.installments?.length ? buildInstallments(purchase.id, purchase.netValue, 1, brazilDateKey(purchase.closedAt)) : purchase.installments } : purchase);
    update({ purchases });
  };
  const removePurchase = async (purchaseId: string) => {
    if (!window.confirm("Excluir esta compra do histórico? Os valores também deixarão de aparecer nos dashboards.")) return;
    if (!await deletePurchase(purchaseId)) return;
    const purchases = purchaseHistory.filter((purchase) => purchase.id !== purchaseId);
    const latest = purchases.at(-1);
    update({ purchases, ...(purchaseHistory.at(-1)?.id === purchaseId ? { closedAt: latest?.closedAt } : {}) });
  };
  const addClosing = (event: React.FormEvent) => {
    event.preventDefault();
    const closedAt = dateFromInput(closingDraft.date);
    if (!closedAt || !closingDraft.product) return;
    const value = Number(closingDraft.gross) || 0; const netValue = Number(closingDraft.net) || 0;
    if (value < 0 || netValue < 0 || netValue > value) { window.alert("O valor líquido deve estar entre zero e o valor bruto."); return; }
    const purchaseId = `pipeline-${uniqueId()}`;
    const count = Math.max(1, Math.floor(Number(closingDraft.installments) || 1));
    const entry = Math.min(netValue, Math.max(0, Number(closingDraft.entry) || 0));
    if (entry > 0 && entry < netValue && count < 2) { window.alert("Para registrar entrada parcial, informe ao menos 2 parcelas no total."); return; }
    let installments = buildInstallments(purchaseId, netValue, count, closingDraft.firstDueDate || closingDraft.date);
    if (entry > 0 && count > 1) installments = [{ id: `${purchaseId}-1`, number: 1, dueDate: closingDraft.date, amount: entry, status: "Recebido", receivedAt: closingDraft.date }, ...buildInstallments(purchaseId, netValue - entry, count - 1, closingDraft.firstDueDate || closingDraft.date).map((item, index) => ({ ...item, id: `${purchaseId}-${index + 2}`, number: index + 2 }))];
    if (entry === netValue && netValue > 0) installments = [{ id: `${purchaseId}-1`, number: 1, dueDate: closingDraft.date, amount: netValue, status: "Recebido", receivedAt: closingDraft.date }];
    const closer = closers.find((item) => item.id === closingDraft.closerUserId);
    const purchase: Purchase = { id: purchaseId, origin: "pipeline", product: closingDraft.product, source: lead.source, value, netValue, closedAt, repurchase: purchaseHistory.length > 0, paymentMethod: closingDraft.paymentMethod, paymentProvider: closingDraft.provider.trim(), paymentNotes: closingDraft.paymentNotes.trim(), installments, closerUserId: closer?.id, closerName: closer?.name, commissionRate: closer?.commissionRate || 0, commissionBasis: "received" };
    update({ stage: "Fechado", product: purchase.product, value: purchase.value, netValue: purchase.netValue, closedAt, purchases: [...purchaseHistory, purchase] });
    setAddingClosing(false);
  };
  return (
    <div className={styles.backdrop} onMouseDown={close}>
      <aside
        className={styles.drawer}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <button onClick={close}>×</button>
          <span className={styles[lead.temperature.toLowerCase()]}>
            {lead.temperature}
          </span>
          <h2>{lead.name}</h2>
          <p>{lead.company}</p>
          <div className={styles.leadActions}>
            <button type="button" onClick={() => setEditing((current) => !current)}>{editing ? "Cancelar edição" : "Editar dados"}</button>
            <button type="button" onClick={remove}>Excluir lead</button>
          </div>
        </header>
        {editing && <section className={styles.leadEditSection}>
          <small>Editar dados do lead</small>
          <div className={styles.leadEditGrid}>
            <Input label="Nome" value={draft.name} set={(name) => setDraft({ ...draft, name })} required />
            <Input label="Oficina / empresa" value={draft.company} set={(company) => setDraft({ ...draft, company })} />
            <Input label="WhatsApp" value={draft.phone} set={(phone) => setDraft({ ...draft, phone })} />
            <Input label="E-mail" value={draft.email} set={(email) => setDraft({ ...draft, email })} type="email" />
            <label><span>Temperatura</span><select value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: event.target.value as Lead["temperature"] })}><option>Quente</option><option>Morno</option><option>Frio</option></select></label>
          </div>
          <button className={styles.saveLeadEdit} type="button" onClick={() => { update({ ...draft, phone: draft.phone.trim(), email: draft.email.trim().toLowerCase() }); setEditing(false); }}>Salvar alterações</button>
        </section>}
        <section className={styles.leadContactSection}>
          <small>Dados de contato</small>
          <p>
            <span>WhatsApp</span>
            <b>{lead.phone || "Não informado"}</b>
          </p>
          <p>
            <span>E-mail</span>
            <b>{lead.email || "Não informado"}</b>
          </p>
          <p>
            <span>Origem</span>
            <b>{lead.source}</b>
          </p>
          <label>
            <span>Alterar origem</span>
            <select value={lead.source} onChange={(event) => update({ source: event.target.value })}>
              {sources.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
        </section>
        <section className={styles.contactHistorySection}>
          <div className={styles.contactHistoryHeader}>
            <span><small>Histórico de contatos</small><b>{contactCheckpoints.length} {contactCheckpoints.length === 1 ? "contato" : "contatos"}</b></span>
            <button type="button" className={contactedToday ? styles.contactTodayDone : ""} onClick={toggleTodayContact}>{contactedToday ? "✓ Desmarcar hoje" : "+ Contato hoje"}</button>
          </div>
          {contactCheckpoints.length > 0 ? <div className={styles.contactHistoryList}>{contactCheckpoints.map((checkpoint) => <article key={checkpoint}><i>✓</i><span><b>{brazilDateKey(checkpoint) === today ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(new Date(checkpoint))}</b><small>{new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(checkpoint))}</small></span><button type="button" aria-label="Remover contato do histórico" title="Remover contato" onClick={() => removeContactCheckpoint(checkpoint)}>×</button></article>)}</div> : <p className={styles.emptyContactHistory}>Nenhum contato registrado.</p>}
        </section>
        <section className={styles.applicationSection}>
          <small>Aplicação da mentoria</small>
          <div className={styles.applicationSummary}>
            <span><small>Origem</small><b>{lead.application?.attribution?.utmSource || "Não preenchido"}</b></span>
            <span><small>Canal</small><b>{lead.application?.attribution?.utmMedium || "Não preenchido"}</b></span>
            <span><small>Faturamento</small><b>{applicationRevenue || "Não preenchido"}</b></span>
            <span><small>Aplicação</small><b>{lead.application?.submittedAt ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date(lead.application.submittedAt)) : "Sem data"}</b></span>
          </div>
          <details className={styles.applicationDetails}>
            <summary>Ver respostas <b>{filledApplicationAnswers}/{applicationAnswers.length}</b></summary>
            <div>{applicationAnswers.map((answer) => <article key={answer.numero}><span>{String(answer.numero).padStart(2, "0")}</span><p><small>{answer.pergunta}</small><b className={answer.resposta === "Não preenchido" ? styles.unfilledAnswer : undefined}>{answer.resposta}</b></p></article>)}</div>
            {(lead.application?.attribution?.utmCampaign || lead.application?.attribution?.utmContent) && <footer><span>Campanha</span><b>{[lead.application?.attribution?.utmCampaign, lead.application?.attribution?.utmContent].filter(Boolean).join(" · ")}</b></footer>}
          </details>
        </section>
        <section className={styles.leadOpportunitySection}>
          <small>Oportunidade atual</small>
          <label>
            <span>Produto vigente</span>
            <select value={lead.product || "Não informado"} onChange={(event) => update({ product: event.target.value })}>
              <option value="Não informado">Não informado</option>
              {products.map((product) => <option key={product.name} value={product.name}>{product.name}</option>)}
            </select>
          </label>
          <label>
            <span>Etapa atual</span>
            <select
              value={lead.stage}
              onChange={(event) => move(event.target.value as Stage)}
            >
              {stages.map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </label>
        </section>
        <section className={styles.leadNotesSection}>
          <small>Acompanhamento</small>
          <div className={styles.leadFollowupGrid}>
          <label><span>Observações</span><textarea value={lead.notes || ""} onChange={(event) => update({ notes: event.target.value })} placeholder="Registre contexto, objeções e próximos detalhes importantes..." rows={4} /></label>
          <div className={styles.leadTags}>
            <span>Etiquetas</span>
            <div>{tags.map((tag, index) => tag === "Desqualificado" ? <span key={tag} style={{ borderColor: "#d05f76", background: "#d05f7622" }}><button type="button" style={{ color: "#d05f76", cursor: "default" }}>Desqualificado</button><button type="button" aria-label="Remover Desqualificado deste lead" onClick={() => update({ tags: tags.filter((item) => item !== tag) })}>×</button></span> : editingTag === index ? <form key={`${tag}-${index}`} style={{ borderColor: tagColor(tag) }} onSubmit={(event) => { event.preventDefault(); saveTag(index); }}><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onBlur={() => saveTag(index)} autoFocus /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => deleteTag(tag)}>×</button></form> : <span key={`${tag}-${index}`} style={{ borderColor: tagColor(tag), background: `${tagColor(tag)}22` }}><button type="button" style={{ color: tagColor(tag) }} onClick={() => { setEditingTag(index); setTagDraft(tag); }}>{tag}</button><button type="button" aria-label={`Excluir etiqueta ${tag} de todos os cadastros`} onClick={() => deleteTag(tag)}>×</button></span>)}</div>
            <form onSubmit={(event) => { event.preventDefault(); addTag(); }}><input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Nova etiqueta" /><button type="submit">+ Adicionar</button></form>
            {availableTags.filter((tag) => !tags.includes(tag)).length > 0 && <div className={styles.availableTags}>{availableTags.filter((tag) => !tags.includes(tag)).map((tag) => <button type="button" key={tag} style={{ borderColor: tagColor(tag), color: tagColor(tag) }} onClick={() => update({ tags: [...tags, tag] })}>+ {tag}</button>)}</div>}
          </div>
          </div>
        </section>
        <section className={styles.leadDatesSection}>
          <small>Jornada comercial</small>
          <div className={styles.leadTimeline}>
            <label><span>Lead gerado</span><input type="date" value={dateInputValue(lead.createdAt)} onChange={(event) => update({ createdAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Conversa iniciada</span><input type="date" value={dateInputValue(lead.conversationAt)} onChange={(event) => update({ conversationAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Data do agendamento</span><input type="date" value={dateInputValue(lead.meetingAt)} onChange={(event) => update({ meetingAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Data da reunião</span><input type="date" value={dateInputValue(lead.meetingScheduledFor || undefined)} onChange={(event) => update({ meetingScheduledFor: dateFromInput(event.target.value) || null })} /></label>
            <label><span>Resultado da reunião</span><select value={lead.meetingOutcome || ""} onChange={(event) => update({ meetingOutcome: (event.target.value || null) as MeetingOutcome | null })}><option value="">Não informado</option><option>Agendada</option><option>Realizada</option><option>No-show</option><option>Cancelada</option></select></label>
            <label><span>Data de retorno</span><input type="date" value={dateInputValue(lead.followUpAt || undefined)} onChange={(event) => update({ followUpAt: dateFromInput(event.target.value) || null })} /></label>
            <label><span>Proposta enviada</span><input type="date" value={dateInputValue(lead.proposalAt)} onChange={(event) => update({ proposalAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Fechamento</span><input type="date" value={dateInputValue(lead.closedAt)} onChange={(event) => update({ closedAt: dateFromInput(event.target.value) })} /></label>
          </div>
        </section>
        <section className={styles.closingsSection}><div className={styles.closingsTitle}><small>Esteira de produtos e pagamentos</small><button type="button" onClick={() => setAddingClosing((value) => !value)}>{addingClosing ? "Cancelar" : "+ Adicionar fechamento"}</button></div>{addingClosing && <form className={`${styles.closingForm} ${styles.paymentClosingForm}`} onSubmit={addClosing}><label><span>Produto</span><select value={closingDraft.product} onChange={(event) => { const product = products.find((item) => item.name === event.target.value); setClosingDraft({ ...closingDraft, product: event.target.value, gross: String(product?.price || ""), net: String(product?.netPrice ?? product?.price ?? "") }); }}>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><label><span>Data do fechamento</span><input type="date" value={closingDraft.date} onChange={(event) => setClosingDraft({ ...closingDraft, date: event.target.value })} required /></label><label><span>Responsável do fechamento</span><select value={closingDraft.closerUserId} onChange={(event) => setClosingDraft({ ...closingDraft, closerUserId: event.target.value })}><option value="">Closer não informada</option>{closers.map((closer) => <option key={closer.id} value={closer.id}>{closer.name} · {closer.commissionRate}%</option>)}</select></label><label><span>Valor vendido</span><AccountingInput value={closingDraft.gross} set={(gross) => setClosingDraft({ ...closingDraft, gross })} required /></label><label><span>Valor a receber</span><AccountingInput value={closingDraft.net} set={(net) => setClosingDraft({ ...closingDraft, net })} required /></label><label><span>Forma de pagamento</span><select value={closingDraft.paymentMethod} onChange={(event) => setClosingDraft({ ...closingDraft, paymentMethod: event.target.value as PaymentMethod })}>{["Pix","Boleto","Cartão","Green","Transferência","Outro"].map((method) => <option key={method}>{method}</option>)}</select></label><label><span>Plataforma / instituição</span><input value={closingDraft.provider} onChange={(event) => setClosingDraft({ ...closingDraft, provider: event.target.value })} placeholder="Green, banco, operadora..." /></label><label><span>Total de parcelas</span><input type="number" min="1" max="120" value={closingDraft.installments} onChange={(event) => setClosingDraft({ ...closingDraft, installments: event.target.value })} required /></label><label><span>Entrada já recebida</span><AccountingInput value={closingDraft.entry} set={(entry) => setClosingDraft({ ...closingDraft, entry })} /></label><label><span>1º vencimento</span><input type="date" value={closingDraft.firstDueDate} onChange={(event) => setClosingDraft({ ...closingDraft, firstDueDate: event.target.value })} required /></label><label className={styles.paymentNotes}><span>Observações do pagamento</span><input value={closingDraft.paymentNotes} onChange={(event) => setClosingDraft({ ...closingDraft, paymentNotes: event.target.value })} placeholder="Condições negociadas" /></label><button type="submit">Salvar fechamento e fluxo</button></form>}{purchaseHistory.length > 0 && <><div className={styles.purchaseHistory}>{purchaseHistory.map((purchase) => <article key={purchase.id}><div><b>{purchase.product}</b><label className={styles.inlinePayment}><span>Pagamento</span><select value={purchase.paymentMethod || ""} onChange={(event) => editPurchasePayment(purchase.id, { paymentMethod: event.target.value as PaymentMethod })}><option value="">Informar...</option>{["Pix","Boleto","Cartão","Green","Transferência","Outro"].map((method) => <option key={method}>{method}</option>)}</select></label><small>{purchase.paymentProvider || `${purchase.installments?.length || 0} parcela(s)`}</small></div><label className={styles.purchaseDate}><span>Data da compra</span><input type="date" value={dateInputValue(purchase.closedAt)} onChange={(event) => editPurchaseDate(purchase.id, event.target.value)} /></label><div className={styles.purchaseValues}><span>Vendido <b><Money value={purchase.value} /></b></span><span>A receber <b><Money value={purchase.netValue} /></b></span></div><button className={styles.deletePurchase} type="button" aria-label={`Excluir compra de ${purchase.product}`} onClick={() => removePurchase(purchase.id)}>×</button>{purchase.installments?.length ? <div className={styles.installmentSummary}>{purchase.installments.map((item) => <span key={item.id}>{item.number}ª · {new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.dueDate.slice(0,10)}T12:00:00`))} · {currency.format(item.amount)} · {item.status}</span>)}</div> : null}</article>)}</div>{nextProduct ? <button className={styles.ascensionButton} onClick={startAscension}>Iniciar ascensão para {nextProduct.name}</button> : <span className={styles.ascensionComplete}>Esteira completa</span>}</>}{!purchaseHistory.length && !addingClosing && <p className={styles.noClosings}>Nenhum fechamento registrado.</p>}</section>
        {purchaseHistory.length > 0 && <section className={styles.closerAssignments}><small>Responsáveis pelos fechamentos</small>{purchaseHistory.map((purchase) => <label key={purchase.id}><span><b>{purchase.product}</b><small>{new Intl.DateTimeFormat("pt-BR").format(new Date(purchase.closedAt))} · {currency.format(purchase.value)}</small></span><select value={purchase.closerUserId || ""} onChange={(event) => { const closer = closers.find((item) => item.id === event.target.value); editPurchasePayment(purchase.id, { closerUserId: closer?.id, closerName: closer?.name, commissionRate: closer?.commissionRate || 0, commissionBasis: "received" }); }}><option value="">Closer não informada</option>{closers.map((closer) => <option key={closer.id} value={closer.id}>{closer.name} · {closer.commissionRate}%</option>)}</select></label>)}</section>}
      </aside>
    </div>
  );
}
function FinanceDashboard({ leads, traffic, expenses, closers, month, setMonth, saveExpense, removeExpense, updateLead, saveCloserGoal }: { leads: Lead[]; traffic: TrafficRecord[]; expenses: Expense[]; closers: Closer[]; month: string; setMonth: (month: string) => void; saveExpense: (expense: Expense) => Promise<void>; removeExpense: (id: string) => Promise<void>; updateLead: (id: string, changes: Partial<Lead>) => void; saveCloserGoal: (closerId: string, month: string, amount: number) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ description: "", category: "Equipe", amount: "", dueDate: `${month}-01`, status: "Prevista" as Expense["status"], fixed: true, notes: "" });
  const receivables = leads.flatMap((lead) => purchasesForLead(lead, []).flatMap((purchase) => {
    const scheduled = purchase.installments?.length ? purchase.installments : [{ id: `${purchase.id}-legacy`, number: 1, dueDate: brazilDateKey(purchase.closedAt), amount: purchase.netValue, status: isCampaignPurchase(purchase) ? "Recebido" as const : "Previsto" as const, ...(isCampaignPurchase(purchase) ? { receivedAt: brazilDateKey(purchase.closedAt) } : {}) }];
    return scheduled.map((installment) => ({ ...installment, purchase, lead }));
  }));
  const monthReceivables = receivables.filter((item) => item.dueDate.slice(0, 7) === month && item.status !== "Cancelado");
  const directMonthExpenses = expenses.filter((item) => item.dueDate.slice(0, 7) === month && item.status !== "Cancelada");
  const recurringMonthExpenses = expenses.filter((item) => item.fixed && item.dueDate.slice(0, 7) < month && item.status !== "Cancelada").map((item) => ({ ...item, id: `${item.id}@${month}`, dueDate: `${month}-${String(Math.min(Number(item.dueDate.slice(8, 10)), new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate())).padStart(2, "0")}`, status: "Prevista" as const, paidAt: undefined, virtualRecurring: true }));
  const monthExpenses = [...directMonthExpenses, ...recurringMonthExpenses];
  const [selectedYear, selectedMonthNumber] = month.split("-").map(Number);
  const nextMonth = `${selectedMonthNumber === 12 ? selectedYear + 1 : selectedYear}-${String(selectedMonthNumber === 12 ? 1 : selectedMonthNumber + 1).padStart(2, "0")}`;
  const nextMonthRevenue = receivables.filter((item) => item.dueDate.slice(0, 7) === nextMonth && item.status !== "Cancelado").reduce((sum, item) => sum + item.amount, 0);
  const expectedRevenue = monthReceivables.reduce((sum, item) => sum + item.amount, 0);
  const receivedRevenue = monthReceivables.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0);
  const expectedExpenses = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const pendingRevenue = monthReceivables.filter((item) => item.status !== "Recebido").reduce((sum, item) => sum + item.amount, 0);
  const monthPurchases = leads.flatMap((lead) => purchasesForLead(lead, [])).filter((purchase) => brazilMonthKey(purchase.closedAt) === month);
  const soldRevenue = monthPurchases.reduce((sum, purchase) => sum + purchase.value, 0);
  const today = new Date();
  const currentMonth = brazilMonthKey(today);
  const daysInSelectedMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate();
  const elapsedDays = month === currentMonth ? Math.max(1, Number(brazilDateKey(today).slice(8, 10))) : daysInSelectedMonth;
  const projectedRevenue = month > currentMonth ? 0 : month === currentMonth ? soldRevenue / elapsedDays * daysInSelectedMonth : soldRevenue;
  const trafficInvestment = traffic.filter((item) => (item.date ? brazilMonthKey(item.date) : item.month) === month).reduce((sum, item) => sum + item.investment, 0);
  const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const paidExpenses = directMonthExpenses.filter((item) => item.status === "Paga" && (trafficInvestment <= 0 || normalize(item.category) !== "trafego")).reduce((sum, item) => sum + item.amount, 0);
  const paidTrafficFallback = trafficInvestment > 0 ? trafficInvestment : directMonthExpenses.filter((item) => item.status === "Paga" && normalize(item.category) === "trafego").reduce((sum, item) => sum + item.amount, 0);
  const realizedNetCash = receivedRevenue - paidExpenses - paidTrafficFallback;
  const fixedExpenses = monthExpenses.filter((item) => item.fixed).reduce((sum, item) => sum + item.amount, 0);
  const variableExpenses = expectedExpenses - fixedExpenses;
  const sortedReceivables = [...monthReceivables].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const sortedExpenses = [...monthExpenses].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const receivablesByProduct = [...new Set(sortedReceivables.map((item) => item.purchase.product))].map((product) => {
    const items = sortedReceivables.filter((item) => item.purchase.product === product);
    const purchases = [...new Map(items.map((item) => [item.purchase.id, item.purchase])).values()];
    return { product, items, sold: purchases.reduce((sum, purchase) => sum + purchase.value, 0), received: items.filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0) };
  });
  const activePaymentPlans = leads.flatMap((lead) => purchasesForLead(lead, []).filter((purchase) => purchase.origin !== "campaign" && (purchase.installments?.length || 0) > 1 && purchase.installments?.some((installment) => installment.status !== "Recebido" && installment.status !== "Cancelado")).map((purchase) => ({ lead, purchase })));
  const updateInstallment = (lead: Lead, purchase: Purchase, installmentId: string, status: Installment["status"]) => {
    const purchaseInstallments: Installment[] = purchase.installments?.length
      ? purchase.installments
      : [{ id: `${purchase.id}-legacy`, number: 1, dueDate: brazilDateKey(purchase.closedAt), amount: purchase.netValue, status: isCampaignPurchase(purchase) ? "Recebido" : "Previsto", ...(isCampaignPurchase(purchase) ? { receivedAt: brazilDateKey(purchase.closedAt) } : {}) }];
    const purchases = purchasesForLead(lead, []).map((item) => item.id === purchase.id ? {
      ...item,
      installments: purchaseInstallments.map((installment) => installment.id === installmentId ? {
        ...installment,
        status,
        receivedAt: status === "Recebido" ? brazilDateKey(new Date()) : undefined,
      } : installment),
    } : item);
    updateLead(lead.id, { purchases });
  };
  const submitExpense = async (event: React.FormEvent) => { event.preventDefault(); if (!draft.description.trim() || Number(draft.amount) <= 0 || !draft.dueDate) { window.alert("Informe descrição, valor maior que zero e vencimento."); return; } setSaving(true); try { await saveExpense({ id: `expense-${uniqueId()}`, description: draft.description.trim(), category: draft.category, amount: Number(draft.amount), dueDate: draft.dueDate, status: draft.status, fixed: draft.fixed, paidAt: draft.status === "Paga" ? brazilDateKey(new Date()) : undefined, notes: draft.notes.trim() }); setAdding(false); setDraft({ description: "", category: "Equipe", amount: "", dueDate: `${month}-01`, status: "Prevista", fixed: true, notes: "" }); } finally { setSaving(false); } };
  return <div className={`${styles.content} ${styles.financeDashboard}`}>
    <section className={styles.financeHero}><div><span>FLUXO DE CAIXA</span><h2>Resumo financeiro do mês</h2><p>Veja primeiro o resultado geral e, abaixo, confira cada entrada e saída por vencimento.</p></div><label><span>Mês analisado</span><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label></section>
    <div className={styles.financeKpis}><Kpi label="Valor recebido (bruto)" value={currency.format(receivedRevenue)} detail={`${monthReceivables.filter((item) => item.status === "Recebido").length} recebimentos · antes das despesas`} /><Kpi label="Faturamento vendido" value={currency.format(soldRevenue)} detail="Vendas fechadas no mês" /><Kpi label="Projeção de faturamento" value={currency.format(projectedRevenue)} detail={month === currentMonth ? `Ritmo dos primeiros ${elapsedDays} dias` : month < currentMonth ? "Faturamento realizado no mês" : "Mês futuro sem histórico"} /><Kpi label="Tráfego pago lançado" value={currency.format(paidTrafficFallback)} detail={trafficInvestment > 0 ? "Investimento cadastrado em campanhas" : "Despesas pagas na categoria Tráfego"} /><Kpi label="Saldo líquido realizado" value={currency.format(realizedNetCash)} detail="Recebido − despesas pagas − tráfego" /><Kpi label="Valor a receber" value={currency.format(pendingRevenue)} detail="Pendente no mês selecionado" /><Kpi label="Projeção total de recebimento" value={currency.format(expectedRevenue)} detail="Recebido + valores pendentes" /><Kpi label="Projeção do próximo mês" value={currency.format(nextMonthRevenue)} detail={`Vencimentos previstos para ${nextMonth.split("-").reverse().join("/")}`} /><Kpi label="Despesas previstas" value={currency.format(expectedExpenses)} detail={`${currency.format(fixedExpenses)} fixas · ${currency.format(variableExpenses)} variáveis`} /></div>
    <CloserCommissionDashboard month={month} leads={leads} closers={closers} saveGoal={saveCloserGoal} />
    <section className={`${styles.financePanel} ${styles.financePanelFull}`}><header><div><span>ENTRADAS POR PRODUTO</span><h3>Recebimentos</h3><small>Abra um produto para conferir clientes, parcelas e vencimentos</small></div><div className={styles.financePanelTotal}><small>Total previsto</small><b>{currency.format(expectedRevenue)}</b></div></header><div className={styles.productReceivables}>{receivablesByProduct.map((group) => <details key={group.product}><summary><span><b>{group.product}</b><small>{group.items.length} recebimento{group.items.length === 1 ? "" : "s"} no mês</small></span><span><small>Total vendido</small><b>{currency.format(group.sold)}</b></span><span><small>Total recebido</small><b>{currency.format(group.received)}</b></span><i>⌄</i></summary><div className={styles.financeRows}>{group.items.map((item) => <article key={item.id}><div><b>{item.lead.name}</b><small>{item.purchase.paymentMethod || (item.purchase.origin === "campaign" ? "Venda importada · paga" : "Pagamento não informado")}</small></div><span><small>Parcela</small><b>{item.number}/{item.purchase.installments?.length || 1}</b></span><span><small>Vencimento</small><b>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.dueDate.slice(0,10)}T12:00:00`))}</b></span><strong>{currency.format(item.amount)}</strong>{item.purchase.origin === "campaign" ? <em className={styles.paidImport}>Recebido</em> : <select value={item.status} onChange={(event) => updateInstallment(item.lead, item.purchase, item.id, event.target.value as Installment["status"])}><option>Previsto</option><option>Recebido</option><option>Atrasado</option><option>Cancelado</option></select>}</article>)}</div></details>)}{!receivablesByProduct.length && <p className={styles.emptyFinanceGroup}>Nenhum recebimento previsto neste mês.</p>}</div></section>
    <section className={`${styles.financePanel} ${styles.financePanelFull}`}><header><div><span>CONTROLE GERAL</span><h3>Parcelamentos ativos</h3><small>Fechamentos manuais com parcelas ainda em aberto</small></div><div className={styles.financePanelTotal}><small>Contratos ativos</small><b>{activePaymentPlans.length}</b></div></header><div className={styles.installmentPlans}>{activePaymentPlans.map(({ lead, purchase }) => { const received = (purchase.installments || []).filter((item) => item.status === "Recebido").reduce((sum, item) => sum + item.amount, 0); return <details key={purchase.id}><summary><span><b>{lead.name}</b><small>{purchase.product} · {purchase.installments?.length} parcelas</small></span><span><small>Recebido</small><b>{currency.format(received)}</b></span><span><small>Em aberto</small><b>{currency.format(purchase.netValue - received)}</b></span><i>⌄</i></summary><div className={styles.activeInstallmentRows}>{purchase.installments?.map((item) => <article key={item.id}><span><b>{item.number}ª parcela</b><small>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.dueDate.slice(0,10)}T12:00:00`))}</small></span><strong>{currency.format(item.amount)}</strong><select value={item.status} onChange={(event) => updateInstallment(lead, purchase, item.id, event.target.value as Installment["status"])}><option>Previsto</option><option>Recebido</option><option>Atrasado</option><option>Cancelado</option></select></article>)}</div></details>; })}{!activePaymentPlans.length && <p className={styles.emptyFinanceGroup}>Nenhum parcelamento ativo.</p>}</div></section>
    <section className={`${styles.financePanel} ${styles.financePanelFull}`}><header><div><span>SAÍDAS</span><h3>Contas e despesas</h3><small>Despesas fixas se repetem automaticamente nos meses seguintes</small></div><div className={styles.financePanelActions}><div className={styles.financePanelTotal}><small>Total previsto</small><b>{currency.format(expectedExpenses)}</b></div><button onClick={() => setAdding((value) => !value)}>{adding ? "Cancelar" : "+ Nova despesa"}</button></div></header>{adding && <form className={styles.expenseForm} onSubmit={submitExpense}><Input label="Descrição" value={draft.description} set={(description) => setDraft({ ...draft, description })} required /><label><span>Categoria</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{["Equipe","Tráfego","Ferramentas","Impostos","Operacional","Comissões","Outros"].map((category) => <option key={category}>{category}</option>)}</select></label><label><span>Tipo de despesa</span><select value={draft.fixed ? "Fixa" : "Variável"} onChange={(event) => setDraft({ ...draft, fixed: event.target.value === "Fixa" })}><option>Fixa</option><option>Variável</option></select></label><Input label="Valor" value={draft.amount} set={(amount) => setDraft({ ...draft, amount })} type="money" required /><Input label="Vencimento" value={draft.dueDate} set={(dueDate) => setDraft({ ...draft, dueDate })} type="date" required /><label><span>Status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Expense["status"] })}><option>Prevista</option><option>Paga</option><option>Atrasada</option><option>Cancelada</option></select></label><Input label="Observações" value={draft.notes} set={(notes) => setDraft({ ...draft, notes })} /><button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar despesa"}</button></form>}<div className={`${styles.financeColumnLabels} ${styles.expenseColumnLabels}`}><span>Descrição / categoria</span><span>Vencimento</span><span>Valor</span><span>Status</span><span></span></div><div className={styles.financeRows}>{sortedExpenses.map((item) => <article key={item.id}><div><b>{item.description}</b><small>{item.category} · {item.fixed ? "Fixa" : "Variável"}{item.virtualRecurring ? " · recorrência automática" : ""}{item.notes ? ` · ${item.notes}` : ""}</small></div><span><small>Vencimento</small><b>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${item.dueDate.slice(0,10)}T12:00:00`))}</b></span><strong>{currency.format(item.amount)}</strong>{item.virtualRecurring ? <em>Prevista</em> : <select value={item.status} onChange={(event) => void saveExpense({ ...item, status: event.target.value as Expense["status"], paidAt: event.target.value === "Paga" ? brazilDateKey(new Date()) : undefined })}><option>Prevista</option><option>Paga</option><option>Atrasada</option><option>Cancelada</option></select>}{item.virtualRecurring ? <span /> : <button className={styles.deletePurchase} onClick={() => { if (window.confirm("Excluir esta despesa?")) void removeExpense(item.id); }}>×</button>}</article>)}{!monthExpenses.length && <p>Nenhuma despesa lançada neste mês.</p>}</div></section>
  </div>;
}

function CloserCommissionDashboard({ month, leads, closers, saveGoal }: { month: string; leads: Lead[]; closers: Closer[]; saveGoal: (closerId: string, month: string, amount: number) => Promise<void> }) {
  const purchases = leads.flatMap((lead) => purchasesForLead(lead, []).map((purchase) => ({ lead, purchase })));
  const assigned = purchases.filter((item) => item.purchase.closerUserId || item.purchase.closerName);
  const closerIdentities = [...closers];
  for (const { purchase } of assigned) if (!closerIdentities.some((closer) => closer.id === purchase.closerUserId || (!purchase.closerUserId && closer.name === purchase.closerName))) closerIdentities.push({ id: purchase.closerUserId || `history-${purchase.closerName}`, name: purchase.closerName || "Closer não identificada", email: "", commissionRate: purchase.commissionRate || 0 });
  const rows = closerIdentities.map((closer) => {
    const closerPurchases = assigned.filter((item) => item.purchase.closerUserId === closer.id || (!item.purchase.closerUserId && item.purchase.closerName === closer.name));
    const monthClosings = closerPurchases.filter((item) => brazilMonthKey(item.purchase.closedAt) === month);
    const received = closerPurchases.flatMap((item) => (item.purchase.installments || []).filter((installment) => installment.status === "Recebido" && brazilMonthKey(installment.receivedAt || installment.dueDate) === month).map((installment) => ({ ...item, installment })));
    const receivedValue = received.reduce((sum, item) => sum + item.installment.amount, 0);
    const commission = received.reduce((sum, item) => sum + item.installment.amount * (item.purchase.commissionRate ?? closer.commissionRate) / 100, 0);
    const rates = [...new Set(received.map((item) => item.purchase.commissionRate ?? closer.commissionRate))];
    return { closer, closings: monthClosings.length, gross: monthClosings.reduce((sum, item) => sum + item.purchase.value, 0), receivedValue, commission, rateLabel: rates.length > 1 ? "Variável" : `${rates[0] ?? closer.commissionRate}%` };
  });
  const unassigned = purchases.filter((item) => !item.purchase.closerUserId && !item.purchase.closerName && brazilMonthKey(item.purchase.closedAt) === month);
  const totalCommission = rows.reduce((sum, row) => sum + row.commission, 0);
  return <section className={styles.commissionPanel}><header><div><span>METAS E COMISSÕES</span><h3>Desempenho das closers</h3><p>Defina a meta mensal e acompanhe o vendido, o atingimento e a comissão.</p></div><div><small>Total a pagar</small><b>{currency.format(totalCommission)}</b></div></header>{rows.length ? <div className={styles.commissionTable}><header><b>Closer</b><b>Fechamentos</b><b>Vendido</b><b>Meta mensal</b><b>Atingido</b><b>Recebido</b><b>Comissão</b></header>{rows.map((row) => { const goal = row.closer.goal || 0; const progress = goal > 0 ? Math.min(100, row.gross / goal * 100) : 0; return <article key={row.closer.id}><span><i>{row.closer.name.slice(0,2).toUpperCase()}</i><b>{row.closer.name}</b></span><strong>{row.closings}</strong><strong>{currency.format(row.gross)}</strong><label className={styles.closerGoalInput}><small>R$</small><input key={`${row.closer.id}-${month}-${goal}`} type="number" min="0" step="100" defaultValue={goal || ""} placeholder="Definir meta" onBlur={(event) => { const amount = Math.max(0, Number(event.target.value) || 0); if (amount !== goal) void saveGoal(row.closer.id, month, amount); }} /></label><span className={styles.closerGoalProgress}><b>{goal ? `${progress.toFixed(0)}%` : "Sem meta"}</b><i><em style={{ width: `${progress}%` }} /></i><small>{goal ? `Faltam ${currency.format(Math.max(0, goal - row.gross))}` : "Informe a meta"}</small></span><strong>{currency.format(row.receivedValue)}</strong><b>{currency.format(row.commission)}</b></article>; })}</div> : <p className={styles.emptyCommission}>Cadastre uma closer para definir metas.</p>}{unassigned.length > 0 && <footer><span>⚠ {unassigned.length} fechamento{unassigned.length > 1 ? "s" : ""} sem closer atribuída</span><small>Atribua a responsável no histórico de fechamentos do lead.</small></footer>}</section>;
}

function FinanceFlowDashboard({ month, receivables, expenses }: { month: string; receivables: Array<Installment & { purchase: Purchase; lead: Lead }>; expenses: Expense[] }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const daily = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const incoming = receivables.filter((item) => Number(item.dueDate.slice(8, 10)) === day).reduce((sum, item) => sum + item.amount, 0);
    const outgoing = expenses.filter((item) => Number(item.dueDate.slice(8, 10)) === day).reduce((sum, item) => sum + item.amount, 0);
    return { day, incoming, outgoing };
  });
  let runningBalance = 0;
  const balances = daily.map((item) => (runningBalance += item.incoming - item.outgoing));
  const maxBar = Math.max(1, ...daily.flatMap((item) => [item.incoming, item.outgoing]));
  const minBalance = Math.min(0, ...balances);
  const maxBalance = Math.max(1, ...balances);
  const balanceRange = Math.max(1, maxBalance - minBalance);
  const width = 960; const height = 280; const top = 24; const bottom = 42; const plotHeight = height - top - bottom; const columnWidth = width / daysInMonth;
  const balancePoints = balances.map((balance, index) => `${index * columnWidth + columnWidth / 2},${top + (maxBalance - balance) / balanceRange * plotHeight}`).join(" ");
  const receivedCount = receivables.filter((item) => item.status === "Recebido").length;
  const delayedCount = receivables.filter((item) => item.status === "Atrasado").length;
  const paidCount = expenses.filter((item) => item.status === "Paga").length;
  const incomeTotal = daily.reduce((sum, item) => sum + item.incoming, 0);
  const expenseTotal = daily.reduce((sum, item) => sum + item.outgoing, 0);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
  return <section className={styles.financeChartPanel}>
    <header><div><span>VISÃO DO MÊS</span><h3>Fluxo de recebimentos e despesas</h3><p>Movimentação prevista por vencimento e evolução do saldo ao longo de {monthLabel}.</p></div><div className={styles.financeChartLegend}><span><i className={styles.incomeLegend} />Entradas</span><span><i className={styles.expenseLegend} />Saídas</span><span><i className={styles.balanceLegend} />Saldo acumulado</span></div></header>
    <div className={styles.financeChartScroller}><svg className={styles.financeFlowChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Fluxo financeiro de ${monthLabel}`}>
      {[0, .25, .5, .75, 1].map((ratio) => <line key={ratio} x1="0" x2={width} y1={top + plotHeight * ratio} y2={top + plotHeight * ratio} className={styles.financeGridLine} />)}
      {daily.map((item, index) => { const incomingHeight = item.incoming / maxBar * plotHeight * .72; const outgoingHeight = item.outgoing / maxBar * plotHeight * .72; const x = index * columnWidth; return <g key={item.day}><rect x={x + columnWidth * .17} y={top + plotHeight - incomingHeight} width={Math.max(2, columnWidth * .27)} height={incomingHeight} rx="2" className={styles.financeIncomeBar}><title>Dia {item.day}: entradas {currency.format(item.incoming)}</title></rect><rect x={x + columnWidth * .52} y={top + plotHeight - outgoingHeight} width={Math.max(2, columnWidth * .27)} height={outgoingHeight} rx="2" className={styles.financeExpenseBar}><title>Dia {item.day}: saídas {currency.format(item.outgoing)}</title></rect>{(item.day === 1 || item.day === daysInMonth || item.day % 5 === 0) && <text x={x + columnWidth / 2} y={height - 17} className={styles.financeDayLabel}>{item.day}</text>}</g>; })}
      <polyline points={balancePoints} className={styles.financeBalanceLine} />
      {balances.map((balance, index) => (daily[index].incoming || daily[index].outgoing) ? <circle key={index} cx={index * columnWidth + columnWidth / 2} cy={top + (maxBalance - balance) / balanceRange * plotHeight} r="3.5" className={styles.financeBalancePoint}><title>Saldo acumulado no dia {index + 1}: {currency.format(balance)}</title></circle> : null)}
    </svg></div>
    <div className={styles.financeChartSummary}>
      <article><span>Volume de entradas</span><b>{currency.format(incomeTotal)}</b><small>{receivables.length} parcelas no mês</small></article>
      <article><span>Volume de saídas</span><b>{currency.format(expenseTotal)}</b><small>{expenses.length} despesas no mês</small></article>
      <article><span>Recebimentos</span><b>{receivedCount}<small> confirmados</small></b><em>{delayedCount ? `${delayedCount} atrasado${delayedCount > 1 ? "s" : ""}` : "Nenhum atrasado"}</em></article>
      <article><span>Pagamentos</span><b>{paidCount}<small> realizados</small></b><em>{expenses.length - paidCount} pendente{expenses.length - paidCount === 1 ? "" : "s"}</em></article>
    </div>
  </section>;
}

function Input({
  label,
  value,
  set,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  const isMoney = type === "money" || /valor|faturamento|receita|investimento|meta/i.test(label);
  if (isMoney) return <label><span>{label}</span><AccountingInput value={value} set={set} required={required} /></label>;
  return (
    <label>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => set(event.target.value)}
        required={required}
      />
    </label>
  );
}
function AccountingInput({ value, set, required = false }: { value: string | number; set: (rawValue: string) => void; required?: boolean }) {
  const numeric = Number(value) || 0;
  const display = numeric ? currency.format(numeric) : "";
  return <input type="text" inputMode="numeric" value={display} placeholder="R$ 0,00" required={required} onChange={(event) => { const cents = event.target.value.replace(/\D/g, ""); set(cents ? String(Number(cents) / 100) : ""); }} />;
}
function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a9.8 9.8 0 0 0-8.45 14.75L2.2 21.8l5.17-1.35A9.8 9.8 0 1 0 12 2Zm0 17.8a7.8 7.8 0 0 1-3.98-1.08l-.28-.17-3.07.8.82-2.99-.18-.3A7.8 7.8 0 1 1 12 19.8Zm4.28-5.84c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.76-.74.91-.14.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.18a7.1 7.1 0 0 1-1.31-1.63c-.14-.23-.02-.36.1-.48.11-.1.24-.27.35-.4.12-.14.16-.24.24-.4.08-.15.04-.29-.02-.4-.06-.12-.52-1.26-.72-1.72-.19-.46-.38-.4-.52-.4h-.45c-.16 0-.41.06-.63.3-.21.23-.82.8-.82 1.96s.84 2.27.96 2.43c.12.16 1.66 2.53 4.02 3.55.56.24 1 .39 1.34.5.57.18 1.08.15 1.49.09.45-.07 1.38-.57 1.58-1.11.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.45-.28Z" /></svg>;
}
function MonthlyMetricsChart({ channel, leads, endMonth, goals, setGoal }: { channel: Channel; leads: Lead[]; endMonth: string; goals: Record<string, number>; setGoal: (month: string, value: number) => void }) {
  const [year, month] = endMonth.split("-").map(Number);
  const end = new Date(year, month - 1, 1);
  const availableMonths = [
    endMonth,
    ...leads.map((lead) => brazilMonthKey(lead.createdAt)),
    ...leads.flatMap((lead) => purchasesForLead(lead, []).map((purchase) => brazilMonthKey(purchase.closedAt))),
    ...Object.keys(goals),
  ].filter((key) => /^\d{4}-\d{2}$/.test(key) && key <= endMonth).sort();
  const [firstYear, firstMonthNumber] = (availableMonths[0] || endMonth).split("-").map(Number);
  const firstMonth = new Date(firstYear, firstMonthNumber - 1, 1);
  const monthCount = Math.max(1, (end.getFullYear() - firstMonth.getFullYear()) * 12 + end.getMonth() - firstMonth.getMonth() + 1);
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const items = leads.filter((lead) => brazilMonthKey(lead.createdAt) === key);
    const purchases = leads.flatMap((lead) => purchasesForLead(lead, []).filter((purchase) => purchaseMatchesChannel(purchase, lead, channel)));
    const trafficLeads = items.filter((lead) => lead.source === "Tráfego" || lead.tags?.some((tag) => ["tráfego", "trafego"].includes(tag.trim().toLowerCase()))).length;
    return { key, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""), leads: items.length, organicLeads: items.length - trafficLeads, trafficLeads, closedValue: purchases.filter((purchase) => inMonth(purchase.closedAt, key)).reduce((sum, purchase) => sum + purchase.value, 0), goal: goals[key] || 0 };
  });
  const highestValue = Math.max(1, ...months.flatMap((item) => [item.closedValue, item.goal]));
  // Keep the tallest column and its value label inside the scrollable chart viewport.
  const maxValue = highestValue * 1.15;
  const maxLeads = Math.max(1, ...months.map((item) => item.leads));
  const leadPoints = months.map((item, index) => ({ x: index * 100 + 50, y: 215 - item.leads / maxLeads * 180, value: item.leads }));
  const leadPath = leadPoints.reduce((path, point, index) => { if (!index) return `M 0 ${point.y} L ${point.x} ${point.y}`; const previous = leadPoints[index - 1]; const middle = (previous.x + point.x) / 2; return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`; }, "") + (leadPoints.length ? ` L ${months.length * 100} ${leadPoints.at(-1)!.y}` : "");
  const areaPath = leadPoints.length ? `${leadPath} L ${months.length * 100} 230 L 0 230 Z` : "";
  const valueTicks = [maxValue, maxValue * .75, maxValue * .5, maxValue * .25, 0];
  const leadTicks = [maxLeads, Math.round(maxLeads * .75), Math.round(maxLeads * .5), Math.round(maxLeads * .25), 0];
  const saveGoal = (value: string) => setGoal(endMonth, Number(value) || 0);
  useEffect(() => {
    document.querySelectorAll<HTMLDivElement>(`.${styles.comboScroller}`).forEach((scroller) => {
      scroller.scrollLeft = scroller.scrollWidth;
    });
  }, [months.length, endMonth]);
  return <section className={`${styles.panel} ${styles.monthlyChart}`}><header><div><span>Performance mensal</span><h3>Valor bruto fechado × meta</h3><p>Colunas financeiras por mês e evolução dos leads gerados.</p></div><div className={styles.chartLegend}><span><i className={styles.goalLegend} />Meta</span><span><i className={styles.closedLegend} />Bruto fechado</span><span><i className={styles.leadLegend} />Leads gerados</span></div></header><div className={styles.goalControl}><div><span>Meta do mês selecionado</span><small>{endMonth.split("-").reverse().join("/")}</small></div><label>R$<input type="number" min="0" step="100" value={goals[endMonth] || ""} onChange={(event) => saveGoal(event.target.value)} placeholder="Definir meta" /></label></div><div className={styles.comboChart}><div className={styles.valueAxis}>{valueTicks.map((tick, index) => <span key={index}>{tick >= 1000 ? `R$ ${(tick / 1000).toFixed(tick % 1000 ? 1 : 0)}k` : currency.format(tick)}</span>)}</div><div className={styles.comboScroller}><div className={styles.comboPlot} style={{ gridTemplateColumns: `repeat(${months.length}, 150px)`, width: `${Math.max(360, months.length * 150)}px` }}><svg viewBox={`0 0 ${months.length * 100} 240`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lead-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62c7f2" stopOpacity=".16" /><stop offset="1" stopColor="#62c7f2" stopOpacity="0" /></linearGradient></defs><path className={styles.leadArea} d={areaPath} /><path className={styles.leadCurve} d={leadPath} /></svg>{leadPoints.map((point,index) => <span key={months[index].key} className={styles.leadPoint} style={{ left: `${(index + .5) / months.length * 100}%`, top: `${point.y / 240 * 100}%` }}><b>{point.value}</b><span className={styles.leadPointTooltip}><strong>{months[index].label} · {point.value} leads</strong><small>Orgânico <b>{months[index].organicLeads}</b></small><small>Tráfego <b>{months[index].trafficLeads}</b></small></span></span>)}{months.map((item) => <article key={item.key}><div><span className={styles.goalBar} style={{ height: `${item.goal / maxValue * 100}%` }}><b>{item.goal ? currency.format(item.goal) : ""}</b></span><span className={styles.closedBar} style={{ height: `${item.closedValue / maxValue * 100}%` }}><b>{item.closedValue ? currency.format(item.closedValue) : ""}</b></span></div><strong>{item.label}</strong><small>{item.key.slice(0,4)}</small></article>)}</div></div><div className={styles.leadAxis}>{leadTicks.map((tick,index) => <span key={index}>{tick}</span>)}</div></div></section>;
}
function QuickPeriodButtons({ start, end, setRange }: { start: string; end: string; setRange: (start: string, end: string) => void }) {
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const weekRange = [dateKey(weekStart), dateKey(weekEnd)] as const;
  const monthRange = [dateKey(monthStart), dateKey(monthEnd)] as const;
  const active = start === weekRange[0] && end === weekRange[1] ? "week" : start === monthRange[0] && end === monthRange[1] ? "month" : "custom";
  return <div className={styles.periodPresets} aria-label="Atalhos de período">
      <button type="button" className={active === "week" ? styles.activePeriod : undefined} onClick={() => setRange(...weekRange)}>Semana</button>
      <button type="button" className={active === "month" ? styles.activePeriod : undefined} onClick={() => setRange(...monthRange)}>Mês</button>
    </div>;
}
function DashboardProductFilter({ products, value, set }: { products: ProductDefinition[]; value: string; set: (product: string) => void }) {
  return <section className={styles.dashboardProductFilter}><div><span>Produto analisado</span><small>Todos os indicadores abaixo respeitam esta seleção.</small></div><select value={value} onChange={(event) => set(event.target.value)}><option>Todos</option>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></section>;
}
function PeriodFilter({ start, end, setRange }: { start: string; end: string; setRange: (start: string, end: string) => void }) {
  return <section className={styles.periodFilter}>
    <span>Período</span>
    <QuickPeriodButtons start={start} end={end} setRange={setRange} />
    <label><small>Data inicial</small><input type="date" value={start} max={end} onChange={(event) => event.target.value && setRange(event.target.value, end)} /></label>
    <label><small>Data final</small><input type="date" value={end} min={start} onChange={(event) => event.target.value && setRange(start, event.target.value)} /></label>
  </section>;
}
function ProductValueChart({ channel, leads, start, end, products }: { channel: Channel; leads: Lead[]; start: string; end: string; products: ProductDefinition[] }) {
  const productNames = Array.from(new Set([...products.map((product) => product.name), ...leads.map((lead) => lead.product || "Não informado"), ...leads.flatMap((lead) => purchasesForLead(lead, products).map((purchase) => purchase.product))])).filter((product) => product !== "Não informado");
  const productData = productNames.map((product) => { const items = leads.filter((lead) => lead.product === product); const closed = leads.flatMap((lead) => purchasesForLead(lead, products).filter((purchase) => purchaseMatchesChannel(purchase, lead, channel))).filter((purchase) => purchase.product === product && inRange(purchase.closedAt, start, end)); const value = closed.reduce((sum, purchase) => sum + purchase.value, 0); return { product, value, net: closed.reduce((sum, purchase) => sum + purchase.netValue, 0), sales: closed.length, proposals: items.filter((lead) => inRange(lead.proposalAt, start, end)).length }; }).sort((a,b) => b.value - a.value);
  const total = productData.reduce((sum, product) => sum + product.value, 0);
  const totalNet = productData.reduce((sum, product) => sum + product.net, 0);
  const colors = ["#2bc48a", "#5aaee8", "#a986e8", "#d6a752", "#e47882"];
  return <section className={`${styles.panel} ${styles.productChart}`}><header><div><span>Receita por produto</span><h3>Composição do valor fechado</h3><p>Atualizado pelos produtos marcados como fechados na pipeline.</p></div><div className={styles.productTotals}><span><small>Bruto total</small><strong><Money value={total} /></strong></span><span><small>Líquido total</small><strong><Money value={totalNet} /></strong></span></div></header><div className={styles.productStack}>{productData.map((item,index) => <i key={item.product} style={{ width: `${total ? item.value / total * 100 : 100 / Math.max(productData.length,1)}%`, background: colors[index % colors.length] }} />)}</div><div className={styles.productList}>{productData.map((item,index) => <article key={item.product}><i style={{ background: colors[index % colors.length] }} /><div><b>{item.product}</b><small>{item.sales} fechamentos</small></div><div className={styles.productValues}><span><small>Bruto</small><strong><Money value={item.value} /></strong></span><span><small>Líquido</small><strong><Money value={item.net} /></strong></span></div><em>{total ? (item.value / total * 100).toFixed(1) : "0.0"}%</em></article>)}</div></section>;
}
function OriginValueChart({ channel, leads, start, end, sources }: { channel: Channel; leads: Lead[]; start: string; end: string; sources: string[] }) {
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const closings = leads.flatMap((lead) => purchasesForLead(lead, []).filter((purchase) => purchaseMatchesChannel(purchase, lead, channel) && inRange(purchase.closedAt, start, end)).map((purchase) => ({ purchase, source: groupedOriginName(purchase.source || lead.source) })));
  const originNames = Array.from(new Set([...sources.map(groupedOriginName), ...leads.map((lead) => groupedOriginName(lead.source)), ...closings.map((item) => item.source)]));
  const origins = originNames.map((source) => { const items = leads.filter((lead) => groupedOriginName(lead.source) === source); const closedItems = closings.filter((item) => item.source === source).map((item) => item.purchase); return { source, leads: items.filter((lead) => inRange(lead.createdAt, start, end)).length, conversations: items.filter((lead) => inRange(lead.conversationAt, start, end)).length, proposals: items.filter((lead) => inRange(lead.proposalAt, start, end)).length, closed: closedItems.length, value: closedItems.reduce((sum, purchase) => sum + purchase.value, 0) }; }).filter((origin) => origin.leads > 0 || origin.closed > 0 || origin.value > 0).sort((a,b) => Number(b.source.startsWith("Forms -")) - Number(a.source.startsWith("Forms -")) || b.leads - a.leads || b.value - a.value || a.source.localeCompare(b.source, "pt-BR"));
  const maximum = Math.max(1, ...origins.map((origin) => origin.value));
  const selected = origins.find((origin) => origin.source === selectedOrigin);
  return <section className={styles.originAnalysis}><header><div><span>Leads e receita por origem</span><h4>Quantidade de leads × valor fechado</h4></div><small>Origens equivalentes foram agrupadas. Clique para detalhar.</small></header><div className={styles.originBars}>{origins.map((origin) => <button key={origin.source} onClick={() => setSelectedOrigin(origin.source)}><span>{origin.source}</span><small className={styles.originLeadCount}><b>{origin.leads}</b> lead{origin.leads === 1 ? "" : "s"}</small><div><i style={{ width: `${origin.value ? Math.max(7, origin.value / maximum * 100) : 2}%` }} /></div><strong><Money value={origin.value} /></strong></button>)}</div>{selected && <div className={styles.backdrop} onMouseDown={() => setSelectedOrigin(null)}><section className={styles.originDetail} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Análise da origem</span><h2>{selected.source}</h2></div><button onClick={() => setSelectedOrigin(null)}>×</button></header><strong><Money value={selected.value} /><small>valor final fechado</small></strong><div><article><span>Leads</span><b>{selected.leads}</b></article><article><span>Conversas</span><b>{selected.conversations}</b></article><article><span>Propostas</span><b>{selected.proposals}</b></article><article><span>Vendas</span><b>{selected.closed}</b></article></div><footer><span>Conversão final</span><b>{selected.leads ? (selected.closed / selected.leads * 100).toFixed(1) : "0.0"}%</b></footer></section></div>}</section>;
}
function FinancialSummary({
  stats,
}: {
  stats: {
    total: number;
    proposals: number;
    closed: number;
    openValue: number;
    wonValue: number;
    netWonValue: number;
    proposalValue: number;
    conversion: number;
    proposalConversion: number;
    valueConversion: number;
  };
}) {
  return (
    <section className={styles.financialSummary}>
      <header>
        <h3>Conversão e valores</h3>
      </header>
      <div>
        <article>
          <span>Valor em propostas abertas</span>
          <strong><Money value={stats.openValue} /></strong>
          <small>Montante disponível no pipeline</small>
        </article>
        <article>
          <span>Valor final fechado</span>
          <strong><Money value={stats.wonValue} /></strong>
          <small>Líquido {currency.format(stats.netWonValue)} · taxas {currency.format(Math.max(0, stats.wonValue - stats.netWonValue))}</small>
        </article>
        <article>
          <span>Fechamento sobre leads</span>
          <strong>{stats.conversion.toFixed(1)}%</strong>
          <small>
            {stats.closed} de {stats.total} leads gerados
          </small>
        </article>
        <article>
          <span>Fechamento sobre propostas</span>
          <strong>{stats.proposalConversion.toFixed(1)}%</strong>
          <small>
            {stats.closed} de {stats.proposals} propostas enviadas
          </small>
        </article>
      </div>
    </section>
  );
}
function SourcePieChart({
  sources,
  colors,
  total,
}: {
  sources: Array<{ source: string; share: number }>;
  colors: string[];
  total: number;
}) {
  let offset = 0;
  return (
    <div className={styles.labeledPie}>
      <svg
        viewBox="0 0 360 300"
        role="img"
        aria-label="Distribuição percentual dos leads por origem"
      >
        <g transform="rotate(-90 180 150)">
          {sources.map((item, index) => {
            const start = offset;
            offset += item.share;
            return (
              <circle
                key={item.source}
                cx="180"
                cy="150"
                r="82"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="58"
                strokeDasharray={`${item.share} ${100 - item.share}`}
                strokeDashoffset={-start}
                pathLength="100"
              />
            );
          })}
        </g>
        {sources.map((item, index) => {
          const previous = sources
            .slice(0, index)
            .reduce((sum, source) => sum + source.share, 0);
          const angle = (previous + item.share / 2) * 3.6 - 90;
          const radians = (angle * Math.PI) / 180;
          const x1 = 180 + Math.cos(radians) * 113;
          const y1 = 150 + Math.sin(radians) * 113;
          const x2 = 180 + Math.cos(radians) * 137;
          const y2 = 150 + Math.sin(radians) * 137;
          const right = Math.cos(radians) >= 0;
          const x3 = x2 + (right ? 18 : -18);
          return (
            <g key={item.source}>
              <polyline
                points={`${x1},${y1} ${x2},${y2} ${x3},${y2}`}
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="1.5"
              />
              <text
                x={x3 + (right ? 4 : -4)}
                y={y2 - 3}
                textAnchor={right ? "start" : "end"}
                className={styles.piePercent}
              >
                {item.share.toFixed(1)}%
              </text>
              <text
                x={x3 + (right ? 4 : -4)}
                y={y2 + 10}
                textAnchor={right ? "start" : "end"}
                className={styles.pieLabel}
              >
                {item.source.length > 16
                  ? `${item.source.slice(0, 14)}…`
                  : item.source}
              </text>
            </g>
          );
        })}
        <circle cx="180" cy="150" r="51" className={styles.pieCenter} />
        <text x="180" y="148" textAnchor="middle" className={styles.pieTotal}>
          {total}
        </text>
        <text
          x="180"
          y="166"
          textAnchor="middle"
          className={styles.pieTotalLabel}
        >
          LEADS
        </text>
      </svg>
    </div>
  );
}
function Kpi({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className={styles.panelTitle}>
      <span>{eyebrow}</span>
      <h3>{title}</h3>
    </header>
  );
}
