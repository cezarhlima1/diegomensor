"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "./crm.module.css";

type Stage = string;
type View = "geral" | "comercial" | "trafego" | "pipeline" | "contatos" | "mensagens";
type Purchase = { id: string; product: string; value: number; netValue: number; closedAt: string; repurchase: boolean };
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
  proposalAt?: string;
  closedAt?: string;
  purchases?: Purchase[];
};
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
type ProductDefinition = { name: string; price: number; netPrice?: number; priceHistory?: ProductPriceChange[] };

const products = [
  { name: "Precificação para oficinas", price: 197 },
  { name: "Produtividade para oficinas", price: 97 },
  { name: "Calculadora de precificação", price: 497 },
  { name: "Treinamento OAP", price: 1197 },
  { name: "Mentoria OAG", price: 10000 },
] as const;
const leadSources = ["Formulário", "Quiz", "Cadastro", "Direct", "Tráfego"] as const;
const legacySources: Record<string, string> = {
  "Formulário mentoria": "Formulário",
  Instagram: "Direct",
  Indicação: "Cadastro",
  Evento: "Tráfego",
  YouTube: "Quiz",
};
const normalizeSource = (source: string) => legacySources[source] || (leadSources.includes(source as typeof leadSources[number]) ? source : "Cadastro");
const productPrice = (product?: string) => products.find((item) => item.name === product)?.price || 0;
const netForValue = (value: number, productName: string | undefined, catalog: ProductDefinition[]) => { const product = catalog.find((item) => item.name === productName); if (!product?.price) return value; return value * ((product.netPrice ?? product.price) / product.price); };
const productLadder = (catalog: ProductDefinition[]) => [...catalog].sort((a, b) => a.price - b.price);
const purchasesForLead = (lead: Lead, catalog: ProductDefinition[]): Purchase[] => lead.purchases !== undefined ? lead.purchases : lead.stage === "Fechado" && lead.closedAt ? [{ id: `legacy-${lead.id}`, product: lead.product || "Não informado", value: lead.value, netValue: lead.netValue ?? netForValue(lead.value, lead.product, catalog), closedAt: lead.closedAt, repurchase: false }] : [];
const inMonth = (date: string | undefined, month: string) => Boolean(date?.startsWith(month));
const inRange = (date: string | undefined, start: string, end: string) => Boolean(date && date.slice(0, 10) >= start && date.slice(0, 10) <= end);
const formatEventDate = (date?: string) => date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date)) : "Ainda não ocorreu";
const dateInputValue = (date?: string) => date ? date.slice(0, 10) : "";
const dateFromInput = (date: string) => date ? new Date(`${date}T12:00:00`).toISOString() : undefined;
const tagColor = (tag: string) => {
  const palette = ["#2f9ed1", "#8b6bd6", "#d28a3f", "#36a879", "#d05f76", "#667fd1", "#b576c7", "#32a6a0", "#c76b3f", "#7a9f35", "#b35c9d"];
  return palette[[...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
};
const stageColor = (stage: string) => {
  const palette = ["#5aaee8", "#37b6a0", "#8f78dd", "#e5a442", "#df6f7d", "#55b86d", "#d47abe", "#6e92e5", "#d67b4e", "#70a94c", "#a56bd0", "#3ab1c4"];
  return palette[[...`etapa-${stage}`].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length];
};
const productColor = (product: string) => {
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
const leadsStorageKey = "mensor-crm-v2";
const trafficStorageKey = "mensor-crm-traffic-v2";
const goalsStorageKey = "mensor-crm-goals-v2";

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
const whatsappLink = (lead: Lead) => {
  const digits = lead.phone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = lead.name.trim().split(" ")[0];
  const message = `Olá, ${firstName}! Tudo bem? Aqui é da Mensor Treinamentos. Recebi seu contato e queria entender melhor o momento da sua oficina.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function CRM() {
  const [view, setView] = useState<View>("geral");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map((lead) => hydrateLeadDates(lead, new Date().toISOString())));
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dateRange, setDateRange] = useState(() => { const now = new Date(); const month = now.toISOString().slice(0, 7); return { start: `${month}-01`, end: `${month}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}` }; });
  const [traffic, setTraffic] = useState<TrafficRecord[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDefinition[]>([...products]);
  const [catalogSources, setCatalogSources] = useState<string[]>([...leadSources]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [, setDatabaseStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  const [, setDatabaseIssue] = useState("");
  const [syncRevision, setSyncRevision] = useState(0);
  const [pipelineStages, setPipelineStages] = useState<Stage[]>(defaultStages);

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
    try {
      const saved = localStorage.getItem(leadsStorageKey);
      if (saved)
        setLeads(
          (JSON.parse(saved) as Lead[]).map((lead) => {
            const stage = (lead.stage as string) === "Diagnóstico" ? "Em conversação" as Stage : lead.stage === "Contato feito" ? "Primeiro contato" : lead.stage;
            const createdAt = lead.createdAt || new Date().toISOString();
            const product = lead.product === "Mentoria" ? "Mentoria OAG" : lead.product || "Não informado";
            const source = normalizeSource(lead.source);
            const migrated = hydrateLeadDates({ ...lead, stage, product, source }, createdAt);
            if (stage === "Fechado" && !migrated.purchases?.length) return { ...migrated, purchases: purchasesForLead(migrated, [...products]) };
            return stage === "Proposta" ? migrated : { ...migrated, value: 0 };
          }),
        );
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(leadsStorageKey, JSON.stringify(leads));
  }, [leads, loaded]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(trafficStorageKey);
      const recoveryDone = localStorage.getItem("mensor-crm-traffic-recovery-v1");
      const currentRecords = saved ? JSON.parse(saved) as TrafficRecord[] : [];
      if (!recoveryDone && currentRecords.length === 0) {
        const legacy = localStorage.getItem("mensor-crm-traffic-v1");
        const recoveredRecords = legacy ? JSON.parse(legacy) as TrafficRecord[] : [];
        if (recoveredRecords.length) {
          setTraffic(recoveredRecords);
          localStorage.setItem(trafficStorageKey, JSON.stringify(recoveredRecords));
        }
        localStorage.setItem("mensor-crm-traffic-recovery-v1", "done");
        return;
      }
      setTraffic(currentRecords);
    } catch {}
  }, []);
  const saveTraffic = (next: TrafficRecord[]) => { setTraffic(next); localStorage.setItem(trafficStorageKey, JSON.stringify(next)); };
  useEffect(() => { try { const savedProducts = localStorage.getItem("mensor-crm-products-v1"); const savedSources = localStorage.getItem("mensor-crm-sources-v1"); if (savedProducts) setCatalogProducts((JSON.parse(savedProducts) as ProductDefinition[]).map((item) => ({ ...item, netPrice: item.netPrice ?? item.price }))); if (savedSources) setCatalogSources(JSON.parse(savedSources)); } catch {} finally { setCatalogLoaded(true); } }, []);
  useEffect(() => {
    if (!loaded || !catalogLoaded) return;
    const historicalCorrectionPending = !localStorage.getItem("mensor-crm-purchase-snapshot-v1");
    setLeads((current) => current.map((lead) => {
      const product = catalogProducts.find((item) => item.name === lead.product);
      const purchases = historicalCorrectionPending ? lead.purchases?.map((purchase) => {
        const purchaseProduct = catalogProducts.find((item) => item.name === purchase.product);
        return purchaseProduct ? { ...purchase, value: purchaseProduct.price, netValue: purchaseProduct.netPrice ?? purchaseProduct.price } : purchase;
      }) : lead.purchases;
      const value = product && (historicalCorrectionPending || lead.stage !== "Fechado") ? product.price : lead.value;
      return { ...lead, value, purchases };
    }));
    if (historicalCorrectionPending) localStorage.setItem("mensor-crm-purchase-snapshot-v1", new Date().toISOString());
  }, [catalogProducts, loaded, catalogLoaded]);
  const saveProducts = (next: ProductDefinition[]) => { setCatalogProducts(next); localStorage.setItem("mensor-crm-products-v1", JSON.stringify(next)); };
  const saveSources = (next: string[]) => { setCatalogSources(next); localStorage.setItem("mensor-crm-sources-v1", JSON.stringify(next)); };
  const renameProduct = (oldName: string, product: ProductDefinition) => { saveProducts(catalogProducts.map((item) => item.name === oldName ? product : item)); setLeads((current) => current.map((lead) => lead.product === oldName ? { ...lead, product: product.name } : lead)); saveTraffic(traffic.map((item) => item.product === oldName ? { ...item, product: product.name } : item)); };
  const renameSource = (oldName: string, name: string) => { saveSources(catalogSources.map((item) => item === oldName ? name : item)); setLeads((current) => current.map((lead) => lead.source === oldName ? { ...lead, source: name } : lead)); };

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
        const hasRemoteData = remote.leads?.length || remote.traffic?.length || remote.products?.length || remote.sources?.length || remote.messages?.length || Object.keys(remote.goals || {}).length;
        if (hasRemoteData) {
          if (cancelled) return;
          setLeads((remote.leads || []).map((lead: Lead) => lead.stage === "Contato feito" ? { ...lead, stage: "Primeiro contato" } : lead)); setTraffic(remote.traffic || []); setCatalogProducts(remote.products?.length ? remote.products : [...products]); setCatalogSources(remote.sources?.length ? remote.sources : [...leadSources]); setPipelineStages(remote.stages?.length ? remote.stages : defaultStages);
          localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(remote.messages || [])); localStorage.setItem(goalsStorageKey, JSON.stringify(remote.goals || {}));
          window.dispatchEvent(new Event("mensor-crm-database-loaded"));
        } else {
          const migration = await fetch("/api/crm", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leads, traffic, products: catalogProducts, sources: catalogSources, stages: pipelineStages, messages: JSON.parse(localStorage.getItem("mensor-crm-messages-v1") || "[]"), goals: JSON.parse(localStorage.getItem(goalsStorageKey) || "{}") }) });
          if (!migration.ok) { await registerDatabaseFailure(migration); return; }
        }
        setDatabaseIssue("");
        setDatabaseStatus("connected");
      } catch (error) { await registerDatabaseFailure(); console.error("Falha ao conectar CRM ao banco", error); }
      finally { if (!cancelled) setDatabaseReady(true); }
    };
    connectDatabase();
    return () => { cancelled = true; };
  }, [loaded, catalogLoaded, databaseReady]);
  useEffect(() => {
    if (!databaseReady) return;
    const timeout = window.setTimeout(() => {
      fetch("/api/crm", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leads, traffic, products: catalogProducts, sources: catalogSources, stages: pipelineStages, messages: JSON.parse(localStorage.getItem("mensor-crm-messages-v1") || "[]"), goals: JSON.parse(localStorage.getItem(goalsStorageKey) || "{}") }) }).then(async (response) => { if (response.ok) { setDatabaseIssue(""); setDatabaseStatus("connected"); } else await registerDatabaseFailure(response); }).catch((error) => { void registerDatabaseFailure(); console.error("Falha ao sincronizar CRM", error); });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [databaseReady, leads, traffic, catalogProducts, catalogSources, pipelineStages, syncRevision]);

  const reportingLeads = useMemo(() => leads.filter((lead) => inRange(lead.createdAt, dateRange.start, dateRange.end)), [leads, dateRange]);
  const stats = useMemo(() => {
    const open = leads.filter((lead) => lead.stage === "Proposta" && inRange(lead.proposalAt, dateRange.start, dateRange.end));
    const won = leads.flatMap((lead) => purchasesForLead(lead, catalogProducts)).filter((purchase) => inRange(purchase.closedAt, dateRange.start, dateRange.end));
    const proposals = leads.filter((lead) => inRange(lead.proposalAt, dateRange.start, dateRange.end));
    return {
      total: reportingLeads.length,
      meetings: leads.filter((lead) => inRange(lead.meetingAt, dateRange.start, dateRange.end)).length,
      proposals: proposals.length,
      closed: won.length,
      openValue: open.reduce((sum, lead) => sum + lead.value, 0),
      wonValue: won.reduce((sum, purchase) => sum + purchase.value, 0),
      netWonValue: won.reduce((sum, purchase) => sum + purchase.netValue, 0),
      conversion: reportingLeads.length ? (won.length / reportingLeads.length) * 100 : 0,
      proposalConversion: proposals.length
        ? (won.length / proposals.length) * 100
        : 0,
      proposalValue: proposals.reduce((sum, lead) => sum + lead.value, 0),
      valueConversion: proposals.reduce((sum, lead) => sum + lead.value, 0)
        ? (won.reduce((sum, purchase) => sum + purchase.value, 0) /
            proposals.reduce((sum, lead) => sum + lead.value, 0)) *
          100
        : 0,
      hot: reportingLeads.filter(
        (lead) => lead.temperature === "Quente" && lead.stage !== "Fechado",
      ).length,
    };
  }, [reportingLeads, leads, dateRange, catalogProducts]);

  const filtered = leads.filter((lead) =>
    `${lead.name} ${lead.company} ${lead.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const moveLead = (id: string, stage: Stage) =>
    setLeads((current) =>
      current.map((lead) => {
        if (lead.id !== id) return lead;
        if (stage === "Proposta" || stage === "Fechado") {
          const catalogProduct = catalogProducts.find((item) => item.name === lead.product);
          const value = lead.value || catalogProduct?.price || productPrice(lead.product) || 0;
          const netValue = lead.netValue ?? catalogProduct?.netPrice ?? catalogProduct?.price ?? value;
          const now = new Date().toISOString();
          if (stage === "Fechado" && lead.stage !== "Fechado") {
            const history = purchasesForLead(lead, catalogProducts);
            const purchase: Purchase = { id: `${lead.id}-${Date.now()}`, product: lead.product || "Não informado", value, netValue, closedAt: now, repurchase: history.length > 0 };
            return { ...lead, stage, value, netValue, closedAt: now, purchases: [...history, purchase] };
          }
          return { ...lead, stage, value, netValue, ...(stage === "Proposta" ? { proposalAt: now } : { closedAt: now }) };
        }
        const now = new Date().toISOString();
        return { ...lead, stage, value: 0, ...(stage === "Primeiro contato" || stage === "Em conversação" ? { conversationAt: now } : {}), ...(stage === "Reunião agendada" ? { meetingAt: now } : {}) };
      }),
    );
  const addLead = (lead: Lead) => {
    setLeads((current) => [lead, ...current]);
    setAdding(false);
  };
  const applyLeadChanges = (lead: Lead, changes: Partial<Lead>) => {
    if ("purchases" in changes) return { ...lead, ...changes };
    const updatesPurchase = "closedAt" in changes || "value" in changes || "netValue" in changes || "product" in changes;
    if (!updatesPurchase || !lead.purchases?.length || lead.stage !== "Fechado") return { ...lead, ...changes };
    const purchases = [...lead.purchases];
    const index = purchases.length - 1;
    purchases[index] = { ...purchases[index], closedAt: changes.closedAt || purchases[index].closedAt, value: changes.value ?? purchases[index].value, netValue: changes.netValue ?? purchases[index].netValue, product: changes.product ?? purchases[index].product };
    return { ...lead, ...changes, purchases };
  };
  const updateLead = (id: string, changes: Partial<Lead>) => {
    setLeads((current) => current.map((lead) => lead.id === id ? applyLeadChanges(lead, changes) : lead));
    setSelected((current) => current?.id === id ? applyLeadChanges(current, changes) : current);
  };
  const renameTag = (oldTag: string, newTag: string) => { setLeads((current) => current.map((lead) => ({ ...lead, tags: (lead.tags || []).map((tag) => tag === oldTag ? newTag : tag) }))); setSelected((lead) => lead ? { ...lead, tags: (lead.tags || []).map((tag) => tag === oldTag ? newTag : tag) } : lead); };
  const deleteTag = (tagToDelete: string) => { setLeads((current) => current.map((lead) => ({ ...lead, tags: (lead.tags || []).filter((tag) => tag !== tagToDelete) }))); setSelected((lead) => lead ? { ...lead, tags: (lead.tags || []).filter((tag) => tag !== tagToDelete) } : lead); };
  const startAscension = (id: string) => {
    const lead = leads.find((item) => item.id === id);
    if (!lead) return;
    const history = purchasesForLead(lead, catalogProducts);
    const lastProduct = history.at(-1)?.product || lead.product;
    const ladder = productLadder(catalogProducts);
    const currentIndex = ladder.findIndex((item) => item.name === lastProduct);
    const nextProduct = ladder[currentIndex + 1];
    if (!nextProduct) return;
    updateLead(id, { stage: "Novo lead", product: nextProduct.name, value: nextProduct.price, nextAction: `Ofertar ${nextProduct.name}`, conversationAt: undefined, meetingAt: undefined, proposalAt: undefined, closedAt: undefined });
  };

  const navigation: Array<[View, string, string]> = [
    ["geral", "Visão geral", "⌂"],
    ["comercial", "Orgânico", "◫"],
    ["trafego", "Tráfego", "↗"],
    ["pipeline", "Pipeline", "▦"],
    ["contatos", "Leads", "◎"],
    ["mensagens", "Detalhes", "⚙"],
  ];
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
          <div>
            <small>Mensor Treinamentos / {navigation.find(([id]) => id === view)?.[1]}</small>
            <h1>{navigation.find(([id]) => id === view)?.[1]}</h1>
          </div>
          {["geral", "comercial", "trafego"].includes(view) && <PeriodFilter start={dateRange.start} end={dateRange.end} setRange={(start, end) => { setDateRange({ start, end }); setSelectedMonth(start.slice(0, 7)); }} />}
          <div className={styles.topActions}>
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
        {view === "geral" && <ExecutiveOverview leads={leads} products={catalogProducts} start={dateRange.start} end={dateRange.end} traffic={traffic} />}
        {view === "comercial" && (
          <Dashboard leads={leads} allLeads={leads} stats={stats} selectedMonth={selectedMonth} start={dateRange.start} end={dateRange.end} products={catalogProducts} sources={catalogSources} />
        )}
        {view === "trafego" && <TrafficDashboard records={traffic.filter((item) => inRange(item.date || `${item.month}-01`, dateRange.start, dateRange.end))} month={selectedMonth} products={catalogProducts} save={(record) => saveTraffic(traffic.some((item) => item.id === record.id) ? traffic.map((item) => item.id === record.id ? record : item) : [record, ...traffic])} remove={(id) => saveTraffic(traffic.filter((item) => item.id !== id))} />}
        {view === "pipeline" && (
          <Pipeline leads={filtered} stages={pipelineStages} setStages={setPipelineStages} moveLead={moveLead} select={setSelected} search={search} />
        )}
        {view === "contatos" && (
          <Contacts leads={filtered} sources={catalogSources} products={catalogProducts} select={setSelected} />
        )}
        {view === "mensagens" && <Details products={catalogProducts} sources={catalogSources} saveProducts={saveProducts} saveSources={saveSources} renameProduct={renameProduct} renameSource={renameSource} />}
      </section>
      {adding && <LeadModal existing={leads} products={catalogProducts} sources={catalogSources} close={() => setAdding(false)} duplicate={(lead) => { setAdding(false); setSelected(lead); }} save={addLead} />}
      {importing && <ImportLeadsModal existing={leads} stages={pipelineStages} products={catalogProducts} sources={catalogSources} close={() => setImporting(false)} save={(imported) => { setLeads((current) => [...imported, ...current]); setImporting(false); }} />}
      {selected && (
        <LeadDrawer
          lead={selected}
          products={catalogProducts}
          sources={catalogSources}
          availableTags={Array.from(new Set(["Desqualificado", ...leads.flatMap((lead) => lead.tags || [])]))}
          stages={pipelineStages}
          close={() => setSelected(null)}
          update={(changes) => updateLead(selected.id, changes)}
          renameTag={renameTag}
          deleteTag={deleteTag}
          remove={() => {
            if (!window.confirm(`Excluir o lead ${selected.name}? Essa ação não poderá ser desfeita.`)) return;
            setLeads((current) => current.filter((lead) => lead.id !== selected.id));
            setSelected(null);
          }}
          move={(stage) => {
            moveLead(selected.id, stage);
            const now = new Date().toISOString();
            setSelected((current) => { if (!current) return current; const catalogProduct = catalogProducts.find((item) => item.name === current.product); const value = current.value || catalogProduct?.price || 0; const netValue = current.netValue ?? catalogProduct?.netPrice ?? catalogProduct?.price ?? value; const history = purchasesForLead(current, catalogProducts); const purchases = stage === "Fechado" && current.stage !== "Fechado" ? [...history, { id: `${current.id}-${Date.now()}`, product: current.product || "Não informado", value, netValue, closedAt: now, repurchase: history.length > 0 }] : current.purchases; return { ...current, stage, value: stage === "Proposta" || stage === "Fechado" ? value : 0, netValue, purchases, ...(stage === "Primeiro contato" || stage === "Em conversação" ? { conversationAt: now } : {}), ...(stage === "Reunião agendada" ? { meetingAt: now } : {}), ...(stage === "Proposta" ? { proposalAt: now } : {}), ...(stage === "Fechado" ? { closedAt: now } : {}) }; });
          }}
          startAscension={() => startAscension(selected.id)}
        />
      )}
    </main>
  );
}

function ExecutiveOverview({ leads, products, start, end, traffic }: { leads: Lead[]; products: ProductDefinition[]; start: string; end: string; traffic: TrafficRecord[] }) {
  const [goals, setGoals] = useState<Record<string, number>>({});
  useEffect(() => { const load = () => { try { const saved = localStorage.getItem(goalsStorageKey); if (saved) setGoals(JSON.parse(saved)); } catch {} }; load(); window.addEventListener("mensor-crm-database-loaded", load); return () => window.removeEventListener("mensor-crm-database-loaded", load); }, []);
  const goalMonth = start.slice(0, 7);
  const updateGoal = (month: string, value: number) => { const next = { ...goals, [month]: value }; setGoals(next); localStorage.setItem(goalsStorageKey, JSON.stringify(next)); window.dispatchEvent(new Event("mensor-crm-change")); };
  const periodTraffic = traffic.filter((item) => inRange(item.date || `${item.month}-01`, start, end));
  const organicClosings = leads.flatMap((lead) => purchasesForLead(lead, products)).filter((purchase) => inRange(purchase.closedAt, start, end));
  const organicRevenue = organicClosings.reduce((sum, purchase) => sum + purchase.value, 0);
  const organicNet = organicClosings.reduce((sum, purchase) => sum + purchase.netValue, 0);
  const repurchaseRevenue = organicClosings.filter((purchase) => purchase.repurchase).reduce((sum, purchase) => sum + purchase.value, 0);
  const repurchaseShare = organicRevenue ? repurchaseRevenue / organicRevenue * 100 : 0;
  const trafficRevenue = periodTraffic.reduce((sum, item) => sum + item.revenue, 0);
  const trafficNet = periodTraffic.reduce((sum, item) => sum + (item.netRevenue ?? netForValue(item.revenue, item.product, products)), 0);
  const trafficInvestment = periodTraffic.reduce((sum, item) => sum + item.investment, 0);
  const directSales = periodTraffic.reduce((sum, item) => sum + item.sales, 0);
  const organicSales = organicClosings.length;
  const totalRevenue = organicRevenue + trafficRevenue;
  const totalNet = organicNet + trafficNet;
  const periodBalance = totalNet - trafficInvestment;
  const totalSales = organicSales + directSales;
  const goal = goals[goalMonth] || 0;
  const goalProgress = goal ? totalRevenue / goal * 100 : 0;
  return <div className={`${styles.content} ${styles.executiveOverview}`}>
    <section className={styles.overviewHero}><div><h2>Orgânico x Tráfego</h2></div><strong><Money value={periodBalance} /><small>saldo do período</small></strong></section>
    <div className={styles.overviewKpis}>
      <Kpi label="Receita bruta" value={<Money value={totalRevenue} />} detail={`${totalSales} vendas totais`} />
      <Kpi label="Receita líquida" value={<Money value={totalNet} />} detail={<><Money value={Math.max(0, totalRevenue - totalNet)} /> em taxas</>} />
      <Kpi label="Investimento em tráfego" value={<Money value={trafficInvestment} />} detail="Descontado do saldo do período" />
      <Kpi label="Saldo do período" value={<Money value={periodBalance} />} detail={<><Money value={totalNet} /> líquidos − investimento</>} />
      <Kpi label="Receita orgânica" value={<Money value={organicRevenue} />} detail={<>Líquido <Money value={organicNet} /></>} />
      <Kpi label="Receita do tráfego" value={<Money value={trafficRevenue} />} detail={<>Líquido <Money value={trafficNet} /></>} />
      <Kpi label="Receita de recompra" value={<Money value={repurchaseRevenue} />} detail={`${repurchaseShare.toFixed(1)}% da receita orgânica`} />
      <Kpi label="Participação da base" value={`${repurchaseShare.toFixed(1)}%`} detail={`${organicClosings.filter((purchase) => purchase.repurchase).length} recompras no período`} />
      <article className={styles.overviewGoal}><label htmlFor="overview-goal">Meta do mês</label><div><small>R$</small><input id="overview-goal" type="number" min="0" step="100" value={goal || ""} onChange={(event) => updateGoal(goalMonth, Number(event.target.value) || 0)} placeholder="0" /></div><span>{goal ? `${goalProgress.toFixed(1)}% atingido` : "Preencha a meta do mês"}</span><i><b style={{ width: `${Math.min(100, goalProgress)}%` }} /></i></article>
    </div>
    <section className={`${styles.panel} ${styles.channelComposition}`}><header><h3>Composição da receita</h3></header><div><article><span>Orgânico</span><strong><Money value={organicRevenue} /></strong><div><i style={{ width: `${totalRevenue ? organicRevenue / totalRevenue * 100 : 0}%` }} /></div><small>{totalRevenue ? (organicRevenue / totalRevenue * 100).toFixed(1) : "0.0"}% do total</small></article><article><span>Tráfego</span><strong><Money value={trafficRevenue} /></strong><div><i style={{ width: `${totalRevenue ? trafficRevenue / totalRevenue * 100 : 0}%` }} /></div><small>{totalRevenue ? (trafficRevenue / totalRevenue * 100).toFixed(1) : "0.0"}% do total</small></article></div></section>
    <UnifiedRevenueAnalysis leads={leads} traffic={traffic} products={products} start={start} end={end} goals={goals} setGoal={updateGoal} />
  </div>;
}

function UnifiedRevenueAnalysis({ leads, traffic, products, start, end, goals, setGoal }: { leads: Lead[]; traffic: TrafficRecord[]; products: ProductDefinition[]; start: string; end: string; goals: Record<string, number>; setGoal: (month: string, value: number) => void }) {
  const trafficLeads = traffic.flatMap((item) => { const units = Math.max(item.sales, item.revenue ? 1 : 0); const date = item.date || `${item.month}-01`; return Array.from({ length: units }, (_, index): Lead => ({ id: `traffic-${item.id}-${index}`, name: item.campaign, company: "Tráfego", phone: "", email: "", source: "Tráfego", product: item.product, stage: "Fechado", value: units ? item.revenue / units : 0, temperature: "Quente", nextAction: "Venda direta", date, createdAt: date, conversationAt: date, meetingAt: date, proposalAt: date, closedAt: date })); });
  const consolidated = [...leads, ...trafficLeads];
  const sources = Array.from(new Set([...leadSources, "Tráfego"]));
  return <div className={styles.unifiedOrganicLayout}><div className={styles.analysisColumn}><ProductValueChart leads={consolidated} start={start} end={end} products={products} /></div><div className={styles.unifiedOriginColumn}><OriginValueChart leads={consolidated} start={start} end={end} sources={sources} /></div><MonthlyMetricsChart leads={consolidated} endMonth={end.slice(0,7)} goals={goals} setGoal={setGoal} /></div>;
}

function TrafficDashboard({ records, month, products, save, remove }: { records: TrafficRecord[]; month: string; products: ProductDefinition[]; save: (record: TrafficRecord) => void; remove: (id: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDate = today.startsWith(month) ? today : `${month}-01`;
  const emptyDraft = { date: defaultDate, status: "Em andamento" as "Em andamento" | "Fechada", campaign: "", product: products[0]?.name || "", investment: "", sales: "", revenue: "", netRevenue: "" };
  const [editing, setEditing] = useState<TrafficRecord | null | "new">(null);
  const [draft, setDraft] = useState(emptyDraft);
  const openNew = () => { setDraft({ ...emptyDraft, date: defaultDate, product: products[0]?.name || "" }); setEditing("new"); };
  const openEdit = (record: TrafficRecord) => { setDraft({ date: record.date || `${record.month}-01`, status: record.status || "Em andamento", campaign: record.campaign, product: record.product, investment: String(record.investment), sales: String(record.sales), revenue: String(record.revenue), netRevenue: String(record.netRevenue ?? netForValue(record.revenue, record.product, products)) }); setEditing(record); };
  records.sort((a, b) => (b.date || `${b.month}-01`).localeCompare(a.date || `${a.month}-01`));
  const totals = records.reduce((sum,item) => ({ investment: sum.investment+item.investment, sales: sum.sales+item.sales, revenue: sum.revenue+item.revenue, net: sum.net+(item.netRevenue ?? netForValue(item.revenue,item.product,products)) }), { investment:0,sales:0,revenue:0,net:0 });
  const submit = (event: React.FormEvent) => { event.preventDefault(); const base = typeof editing === "object" && editing ? editing : null; save({ id: base?.id || String(Date.now()), month: draft.date.slice(0, 7), date: draft.date, status: draft.status, campaign: draft.campaign.trim(), product: draft.product, investment: Number(draft.investment)||0, sales: Number(draft.sales)||0, revenue: Number(draft.revenue)||0, netRevenue: Number(draft.netRevenue)||0, clicks: base?.clicks||0, pageViews: base?.pageViews||0, checkouts: base?.checkouts||0 }); setEditing(null); };
  const cpa = totals.sales ? totals.investment/totals.sales : 0; const roas = totals.investment ? totals.revenue/totals.investment : 0;
  return <div className={`${styles.content} ${styles.trafficDashboard}`}><header className={styles.trafficHeader}><div><span>Vendas diretas</span><h2>Campanhas do mês</h2><p>Atualize diariamente os totais acumulados de cada campanha.</p></div><button onClick={openNew}>+ Adicionar campanha</button></header><div className={styles.trafficKpis}><Kpi label="Investimento total" value={currency.format(totals.investment)} detail={`${records.length} campanhas`} /><Kpi label="Faturamento bruto" value={currency.format(totals.revenue)} detail={`${totals.sales} vendas`} /><Kpi label="Faturamento líquido" value={currency.format(totals.net)} detail={`${currency.format(Math.max(0,totals.revenue-totals.net))} em taxas`} /><Kpi label="ROAS" value={`${roas.toFixed(2)}x`} detail={`CPA ${currency.format(cpa)}`} /></div><section className={`${styles.panel} ${styles.trafficTable}`}><header><div><span>Detalhamento</span><h3>Dashboard por campanha</h3></div><b>{records.length} campanhas</b></header><div className={styles.trafficRows}>{records.map((item) => { const net = item.netRevenue ?? netForValue(item.revenue,item.product,products); const campaignDate = item.date || `${item.month}-01`; const fees = Math.max(0,item.revenue-net); const itemCpa = item.sales ? item.investment/item.sales : 0; const netPerSale = item.sales ? net/item.sales : 0; const itemRoas = item.investment ? item.revenue/item.investment : 0; return <article className={styles.campaignDashboard} key={item.id}><header className={styles.campaignDashboardHeader}><div><span>Campanha</span><b>{item.campaign}</b><small>{item.product}</small><em className={item.status === "Fechada" ? styles.campaignClosed : styles.campaignRunning}>{item.status || "Em andamento"}</em></div><time dateTime={campaignDate}><small>Data da campanha</small><strong>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${campaignDate}T12:00:00`))}</strong></time><div className={styles.campaignActions}><button onClick={() => openEdit(item)}>Editar</button><button onClick={() => remove(item.id)} aria-label={`Excluir ${item.campaign}`}>×</button></div></header><div className={styles.campaignMetrics}><span><small>Investimento</small><strong>{currency.format(item.investment)}</strong></span><span><small>Vendas</small><strong>{item.sales}</strong></span><span><small>Faturamento bruto</small><strong>{currency.format(item.revenue)}</strong></span><span><small>Faturamento líquido</small><strong>{currency.format(net)}</strong></span><span><small>Líquido por produto</small><strong>{currency.format(netPerSale)}</strong></span><span><small>Taxas</small><strong>{currency.format(fees)}</strong></span><span><small>CPA</small><strong>{currency.format(itemCpa)}</strong></span><span><small>ROAS</small><strong className={itemRoas < 1 ? styles.negativeMetric : undefined}>{itemRoas.toFixed(2)}x</strong></span></div></article>})}{!records.length && <div className={styles.emptyTraffic}>Nenhuma campanha cadastrada neste período.</div>}</div></section>{editing && <div className={styles.backdrop} onMouseDown={() => setEditing(null)}><form className={`${styles.modal} ${styles.trafficModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><header><div><span>Campanha mensal</span><h2>{editing === "new" ? "Adicionar campanha" : "Editar campanha"}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header><div className={styles.formGrid}><Input label="Campanha" value={draft.campaign} set={(campaign) => setDraft({...draft,campaign})} required /><Input label="Data da campanha" value={draft.date} set={(date) => setDraft({...draft,date})} type="date" required /><label><span>Status da campanha</span><select value={draft.status} onChange={(event) => setDraft({...draft,status:event.target.value as "Em andamento" | "Fechada"})}><option>Em andamento</option><option>Fechada</option></select></label><label><span>Produto</span><select value={draft.product} onChange={(event) => setDraft({...draft,product:event.target.value})}>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><Input label="Investimento total" value={draft.investment} set={(investment) => setDraft({...draft,investment})} type="number" /><Input label="Quantidade de vendas" value={draft.sales} set={(sales) => setDraft({...draft,sales})} type="number" /><Input label="Faturamento bruto" value={draft.revenue} set={(revenue) => setDraft({...draft,revenue})} type="number" /><Input label="Faturamento líquido" value={draft.netRevenue} set={(netRevenue) => setDraft({...draft,netRevenue})} type="number" /><div className={styles.autoMetrics}><span>CPA <b>{currency.format(Number(draft.sales) ? Number(draft.investment)/Number(draft.sales) : 0)}</b></span><span>Líquido por produto <b>{currency.format(Number(draft.sales) ? Number(draft.netRevenue)/Number(draft.sales) : 0)}</b></span><span>ROAS <b className={(Number(draft.investment) ? Number(draft.revenue)/Number(draft.investment) : 0) < 1 ? styles.negativeMetric : undefined}>{Number(draft.investment) ? (Number(draft.revenue)/Number(draft.investment)).toFixed(2) : "0.00"}x</b></span></div></div><footer><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="submit">Salvar campanha</button></footer></form></div>}</div>;
}

function LegacyTrafficDashboard({ records, month, products, save, remove }: { records: TrafficRecord[]; month: string; products: ProductDefinition[]; save: (record: TrafficRecord) => void; remove: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ campaign: string; product: string; investment: string; clicks: string; pageViews: string; checkouts: string; sales: string; revenue: string }>({ campaign: "", product: products[0]?.name || "", investment: "", clicks: "", pageViews: "", checkouts: "", sales: "", revenue: "" });
  const totals = records.reduce((sum, item) => ({ investment: sum.investment + item.investment, clicks: sum.clicks + item.clicks, pageViews: sum.pageViews + item.pageViews, checkouts: sum.checkouts + item.checkouts, sales: sum.sales + item.sales, revenue: sum.revenue + item.revenue }), { investment: 0, clicks: 0, pageViews: 0, checkouts: 0, sales: 0, revenue: 0 });
  const cpa = totals.sales ? totals.investment / totals.sales : 0;
  const roas = totals.investment ? totals.revenue / totals.investment : 0;
  const conversion = totals.pageViews ? totals.sales / totals.pageViews * 100 : 0;
  const netRevenue = records.reduce((sum, item) => sum + netForValue(item.revenue, item.product, products), 0);
  const submit = (event: React.FormEvent) => { event.preventDefault(); save({ id: String(Date.now()), month, date: new Date().toISOString().slice(0, 10), campaign: draft.campaign.trim(), product: draft.product, investment: Number(draft.investment) || 0, clicks: Number(draft.clicks) || 0, pageViews: Number(draft.pageViews) || 0, checkouts: Number(draft.checkouts) || 0, sales: Number(draft.sales) || 0, revenue: Number(draft.revenue) || 0 }); setAdding(false); setDraft({ campaign: "", product: products[0]?.name || "", investment: "", clicks: "", pageViews: "", checkouts: "", sales: "", revenue: "" }); };
  return <div className={`${styles.content} ${styles.trafficDashboard}`}>
    <header className={styles.trafficHeader}><div><span>Vendas diretas</span><h2>Campanhas e gateway</h2><p>Cadastre os resultados consolidados sem misturar essas vendas com a pipeline comercial.</p></div><button onClick={() => setAdding(true)}>+ Adicionar campanha</button></header>
    <div className={styles.trafficKpis}><Kpi label="Investimento" value={currency.format(totals.investment)} detail={`${totals.clicks} cliques`} /><Kpi label="Faturamento bruto" value={currency.format(totals.revenue)} detail={`${totals.sales} vendas aprovadas`} /><Kpi label="Faturamento líquido" value={currency.format(netRevenue)} detail={`${currency.format(Math.max(0, totals.revenue - netRevenue))} em taxas`} /><Kpi label="ROAS" value={`${roas.toFixed(2)}x`} detail={`CPA ${currency.format(cpa)} · ${conversion.toFixed(2)}% conversão`} /></div>
    <section className={`${styles.panel} ${styles.trafficTable}`}><header><div><span>Detalhamento</span><h3>Resultados por campanha</h3></div><b>{records.length} campanhas</b></header><div className={styles.trafficRows}>{records.map((item) => <article key={item.id}><div><b>{item.campaign}</b><small>{item.product}</small></div><span><small>Investimento</small>{currency.format(item.investment)}</span><span><small>Vendas</small>{item.sales}</span><span><small>Receita</small>{currency.format(item.revenue)}</span><span><small>ROAS</small>{item.investment ? (item.revenue / item.investment).toFixed(2) : "0.00"}x</span><button onClick={() => remove(item.id)} aria-label={`Excluir ${item.campaign}`}>×</button></article>)}{!records.length && <div className={styles.emptyTraffic}>Nenhuma campanha cadastrada neste período.</div>}</div></section>
    {adding && <div className={styles.backdrop} onMouseDown={() => setAdding(false)}><form className={`${styles.modal} ${styles.trafficModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><header><div><span>Tráfego pago</span><h2>Adicionar campanha</h2></div><button type="button" onClick={() => setAdding(false)}>×</button></header><div className={styles.formGrid}><Input label="Campanha" value={draft.campaign} set={(campaign) => setDraft({ ...draft, campaign })} required /><label><span>Produto</span><select value={draft.product} onChange={(event) => setDraft({ ...draft, product: event.target.value })}>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label>{([['investment','Investimento'],['clicks','Cliques'],['pageViews','Visualizações da página'],['checkouts','Checkouts iniciados'],['sales','Compras aprovadas'],['revenue','Faturamento']] as const).map(([key,label]) => <Input key={key} label={label} value={draft[key]} set={(value) => setDraft({ ...draft, [key]: value })} type="number" />)}</div><footer><button type="button" onClick={() => setAdding(false)}>Cancelar</button><button type="submit">Salvar campanha</button></footer></form></div>}
  </div>;
}

function Dashboard({
  leads,
  allLeads,
  stats,
  selectedMonth,
  start,
  end,
  products,
  sources,
}: {
  leads: Lead[];
  allLeads: Lead[];
  stats: {
    total: number;
    meetings: number;
    proposals: number;
    closed: number;
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
  sources: string[];
}) {
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});
  useEffect(() => { const load = () => { try { const saved = localStorage.getItem(goalsStorageKey); if (saved) setMonthlyGoals(JSON.parse(saved)); } catch {} }; load(); window.addEventListener("mensor-crm-database-loaded", load); return () => window.removeEventListener("mensor-crm-database-loaded", load); }, []);
  const updateMonthlyGoal = (month: string, value: number) => { const next = { ...monthlyGoals, [month]: value }; setMonthlyGoals(next); localStorage.setItem(goalsStorageKey, JSON.stringify(next)); window.dispatchEvent(new Event("mensor-crm-change")); };
  const funnelSteps = [
    { label: "Leads gerados", count: leads.filter((lead) => inRange(lead.createdAt, start, end)).length, detail: "Total de oportunidades" },
    { label: "Conversas iniciadas", count: leads.filter((lead) => inRange(lead.conversationAt, start, end)).length, detail: "Primeiro contato realizado" },
    { label: "Reuniões agendadas", count: leads.filter((lead) => inRange(lead.meetingAt, start, end)).length, detail: "Reuniões marcadas" },
    { label: "Propostas enviadas", count: stats.proposals, detail: currency.format(stats.proposalValue) },
    { label: "Fechamentos", count: stats.closed, detail: currency.format(stats.wonValue) },
  ];
  return (
    <div className={`${styles.content} ${styles.dashboardContent}`}>
      <div className={styles.kpis}>
        <Kpi
          label="Leads gerados no mês"
          value={String(stats.total)}
          detail={`${stats.hot} leads quentes`}
        />
        <Kpi
          label="Reuniões agendadas"
          value={String(stats.meetings)}
          detail="Reuniões marcadas"
        />
        <Kpi
          label="Propostas enviadas"
          value={String(stats.proposals)}
          detail={`${currency.format(stats.openValue)} em aberto`}
        />
        <Kpi
          label="Fechamentos"
          value={String(stats.closed)}
          detail={`${currency.format(stats.wonValue)} recebidos`}
        />
      </div>
      <FinancialSummary stats={stats} />
      <div className={styles.analysisColumn}><ProductValueChart leads={leads} start={start} end={end} products={products} /></div>
      <section className={styles.funnelColumn}>
        <PanelTitle eyebrow="Conversão comercial" title="Funil de leads" />
        <p className={styles.sourceIntro}>
          Acompanhe quantos leads avançam em cada etapa, do primeiro contato ao fechamento.
        </p>
        <FunnelVisualization steps={funnelSteps} total={leads.filter((lead) => inRange(lead.createdAt, start, end)).length} />
        <OriginValueChart leads={leads} start={start} end={end} sources={sources} />
      </section>
      <MonthlyMetricsChart leads={allLeads} endMonth={selectedMonth} goals={monthlyGoals} setGoal={updateMonthlyGoal} />
    </div>
  );
}

function Pipeline({
  leads,
  stages,
  setStages,
  moveLead,
  select,
  search,
}: {
  leads: Lead[];
  stages: Stage[];
  setStages: (stages: Stage[]) => void;
  moveLead: (id: string, stage: Stage) => void;
  select: (lead: Lead) => void;
  search: string;
}) {
  const [range, setRange] = useState({ start: "", end: "" });
  const [archiveFilter, setArchiveFilter] = useState<"Ativos" | "Desqualificados" | "Todos">("Ativos");
  const [newStage, setNewStage] = useState("");
  const archived = (lead: Lead) => lead.tags?.includes("Desqualificado");
  const visible = leads.filter((lead) => (!range.start || (lead.createdAt || "").slice(0,10) >= range.start) && (!range.end || (lead.createdAt || "").slice(0,10) <= range.end) && (search ? true : archiveFilter === "Todos" || (archiveFilter === "Desqualificados" ? archived(lead) : !archived(lead))));
  const moveStage = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= stages.length) return; const next = [...stages]; [next[index], next[target]] = [next[target], next[index]]; setStages(next); };
  const addStage = (event: React.FormEvent) => { event.preventDefault(); const name = newStage.trim(); if (!name || stages.some((stage) => stage.toLowerCase() === name.toLowerCase())) return; setStages([...stages, name]); setNewStage(""); };
  return (
    <div className={styles.pipelineWrap}>
      <div className={styles.pipelineTools}><div className={styles.pipelineFilters}><span>Filtrar pipeline</span><label><small>De</small><input type="date" value={range.start} onChange={(event) => setRange({ ...range, start: event.target.value })} /></label><label><small>Até</small><input type="date" value={range.end} onChange={(event) => setRange({ ...range, end: event.target.value })} /></label><label><small>Status</small><select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value as typeof archiveFilter)}><option>Ativos</option><option>Desqualificados</option><option>Todos</option></select></label></div><form onSubmit={addStage}><span>Nova etapa</span><input value={newStage} onChange={(event) => setNewStage(event.target.value)} placeholder="Ex.: Follow-up" /><button aria-label="Adicionar etapa">+</button></form></div>
      <div className={styles.pipelineScroller}><div className={styles.pipeline} style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(245px, 1fr))`, minWidth: `${stages.length * 255}px` }}>
        {stages.map((stage) => {
          const items = visible.filter((lead) => lead.stage === stage);
          const stageIndex = stages.indexOf(stage);
          return (
            <section
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) =>
                moveLead(event.dataTransfer.getData("leadId"), stage)
              }
            >
              <header>
                <div>
                  <i style={{ background: stageColor(stage), boxShadow: `0 0 9px ${stageColor(stage)}88` }} />
                  <b>{stage}</b>
                  <span>{items.length}</span>
                </div>
                <div className={styles.stageActions}><button onClick={() => moveStage(stageIndex,-1)} disabled={!stageIndex}>←</button><button onClick={() => moveStage(stageIndex,1)} disabled={stageIndex === stages.length - 1}>→</button></div>
              </header>
              <div className={styles.cards}>
                {items.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    style={{ borderLeft: `3px solid ${stageColor(stage)}` }}
                    onDragStart={(event) =>
                      event.dataTransfer.setData("leadId", lead.id)
                    }
                    onClick={() => select(lead)}
                  >
                    <div className={styles.cleanCard}>
                      <div>
                        <h3>{lead.name}</h3>
                        <p><span>Origem</span>{lead.source}</p>
                        {lead.product && lead.product !== "Não informado" && <em className={styles.productTag} style={{ color: productColor(lead.product), borderColor: `${productColor(lead.product)}66`, background: `${productColor(lead.product)}18` }}>{lead.product}</em>}
                        {lead.tags?.length ? <div className={styles.cardTags}>{lead.tags.slice(0,3).map((tag) => <span key={tag} style={{ color: tagColor(tag), borderColor: `${tagColor(tag)}55`, background: `${tagColor(tag)}16` }}>{tag}</span>)}</div> : null}
                      </div>
                      {lead.phone && (
                        <a href={whatsappLink(lead)} target="_blank" rel="noopener noreferrer" style={{ color: stageColor(stage), background: `${stageColor(stage)}18`, borderColor: `${stageColor(stage)}55` }} aria-label={`Chamar ${lead.name} no WhatsApp`} onClick={(event) => event.stopPropagation()}>
                          <WhatsAppIcon />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div></div>
    </div>
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
  const [ascensionFilter, setAscensionFilter] = useState("Todos");
  const [contactRange, setContactRange] = useState({ start: "", end: "" });
  const sourceTags = sources;
  const canAscend = (lead: Lead) => { const history = purchasesForLead(lead, products); if (!history.length) return false; const ladder = productLadder(products); const index = ladder.findIndex((product) => product.name === history.at(-1)?.product); return index >= 0 && index < ladder.length - 1; };
  const hasRepurchase = (lead: Lead) => purchasesForLead(lead, products).some((purchase) => purchase.repurchase);
  const inContactRange = (lead: Lead) => (!contactRange.start || Boolean(lead.createdAt && lead.createdAt.slice(0, 10) >= contactRange.start)) && (!contactRange.end || Boolean(lead.createdAt && lead.createdAt.slice(0, 10) <= contactRange.end));
  const visibleLeads = leads.filter((lead) => inContactRange(lead) && (sourceFilter === "Todos" || lead.source.trim() === sourceFilter) && (ascensionFilter === "Todos" || (ascensionFilter === "Possível ascensão" ? canAscend(lead) : hasRepurchase(lead))));
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
          <div className={styles.contactFilterFields}><label><span>Data inicial</span><input type="date" value={contactRange.start} max={contactRange.end} onChange={(event) => setContactRange({ ...contactRange, start: event.target.value })} /></label><label><span>Data final</span><input type="date" value={contactRange.end} min={contactRange.start} onChange={(event) => setContactRange({ ...contactRange, end: event.target.value })} /></label><label><span>Origem</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option>Todos</option>{sourceTags.map((source) => <option key={source}>{source}</option>)}</select></label><label><span>Esteira</span><select value={ascensionFilter} onChange={(event) => setAscensionFilter(event.target.value)}><option>Todos</option><option>Possível ascensão</option><option>Clientes com recompra</option></select></label><button onClick={exportExcel}>↓ Baixar Excel</button></div>
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
function Details({ products, sources, saveProducts, saveSources, renameProduct, renameSource }: { products: ProductDefinition[]; sources: string[]; saveProducts: (items: ProductDefinition[]) => void; saveSources: (items: string[]) => void; renameProduct: (oldName: string, product: ProductDefinition) => void; renameSource: (oldName: string, name: string) => void }) {
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
  const addTemplate = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !message.trim()) return; saveTemplates(editingMessage ? templates.map((item) => item.id === editingMessage ? { ...item, title: title.trim(), text: message.trim() } : item) : [{ id: String(Date.now()), title: title.trim(), text: message.trim() }, ...templates]); setTitle(""); setMessage(""); setEditingMessage(null); setAddingMessage(false); };
  const copyTemplate = async (id: string, text: string) => { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); };
  const addProduct = () => { setProductDraft({ name: "", gross: "", net: "" }); setEditingProduct("new"); };
  const addSource = () => { setSourceDraft(""); setEditingSource("new"); };
  const editProduct = (product: ProductDefinition) => { setProductDraft({ name: product.name, gross: String(product.price), net: String(product.netPrice ?? product.price) }); setEditingProduct(product); };
  const editSource = (source: string) => { setSourceDraft(source); setEditingSource(source); };
  const submitProduct = (event: React.FormEvent) => { event.preventDefault(); const name = productDraft.name.trim(); if (!name) return; const price = Number(productDraft.gross)||0; const netPrice = Number(productDraft.net)||0; if (editingProduct === "new") saveProducts([...products,{ name, price, netPrice, priceHistory: [] }]); else if (editingProduct) { const changed = editingProduct.price !== price || (editingProduct.netPrice ?? editingProduct.price) !== netPrice; const priceHistory = changed ? [...(editingProduct.priceHistory || []), { id: String(Date.now()), changedAt: new Date().toISOString(), previousPrice: editingProduct.price, previousNetPrice: editingProduct.netPrice ?? editingProduct.price, price, netPrice }] : editingProduct.priceHistory || []; renameProduct(editingProduct.name,{ name, price, netPrice, priceHistory }); } setEditingProduct(null); };
  const submitSource = (event: React.FormEvent) => { event.preventDefault(); const name = sourceDraft.trim(); if (!name) return; if (editingSource === "new") saveSources([...sources,name]); else if (editingSource) renameSource(editingSource,name); setEditingSource(null); };
  const editTemplate = (template: { id: string; title: string; text: string }) => { setTitle(template.title); setMessage(template.text); setEditingMessage(template.id); setAddingMessage(true); };
  return (
    <div className={`${styles.content} ${styles.detailsPage}`}>
      <header className={styles.detailsIntro}><span>Configurações do CRM</span><h2>Cadastros e recursos da operação</h2><p>Gerencie os registros utilizados na pipeline, nos filtros e nas métricas.</p></header>
      <div className={styles.detailCatalogs}>
        <section className={styles.detailCatalog}><header><div><span>Catálogo</span><h3>Produtos</h3></div><button onClick={addProduct}>+ Produto</button></header><div>{products.map((product) => <article key={product.name}><div><b>{product.name}</b><small>Taxas: {currency.format(Math.max(0, product.price - (product.netPrice ?? product.price)))}</small></div><div className={styles.productValues}><span>Bruto <b>{currency.format(product.price)}</b></span><span>Líquido <b>{currency.format(product.netPrice ?? product.price)}</b></span></div>{product.priceHistory?.length ? <details className={styles.priceHistory}><summary>Histórico de alterações <b>{product.priceHistory.length}</b></summary><div>{[...product.priceHistory].reverse().map((change) => <article key={change.id}><time>{formatEventDate(change.changedAt)}</time><span>Bruto: {currency.format(change.previousPrice)} → {currency.format(change.price)}</span><span>Líquido: {currency.format(change.previousNetPrice)} → {currency.format(change.netPrice)}</span></article>)}</div></details> : <small className={styles.noPriceHistory}>Nenhuma alteração de valor</small>}<div className={styles.catalogActions}><button onClick={() => editProduct(product)}>Editar</button><button onClick={() => saveProducts(products.filter((item) => item.name !== product.name))} aria-label={`Excluir ${product.name}`}>×</button></div></article>)}</div></section>
        <section className={styles.detailCatalog}><header><div><span>Etiquetas</span><h3>Origens de lead</h3></div><button onClick={addSource}>+ Origem</button></header><div>{sources.map((source) => <article key={source}><div><b>{source}</b><small>Origem disponível no CRM</small></div><i className={styles.sourceTag}>{source}</i><div className={styles.catalogActions}><button onClick={() => editSource(source)}>Editar</button><button onClick={() => saveSources(sources.filter((item) => item !== source))} aria-label={`Excluir ${source}`}>×</button></div></article>)}</div></section>
      </div>
      <section className={styles.messageWorkspace}>
        <section className={styles.messageLibrary}><header><div><span>Pipeline</span><h2>Mensagens salvas</h2></div><div className={styles.messageHeaderActions}><b>{templates.length}</b><button onClick={() => { setTitle(""); setMessage(""); setEditingMessage(null); setAddingMessage(true); }}>+ Adicionar mensagem</button></div></header>{templates.length ? <div>{templates.map((template) => <article key={template.id}><header><h3>{template.title}</h3><div className={styles.templateActions}><button onClick={() => editTemplate(template)}>Editar</button><button onClick={() => saveTemplates(templates.filter((item) => item.id !== template.id))} aria-label="Excluir mensagem">×</button></div></header><p>{template.text}</p><button onClick={() => copyTemplate(template.id, template.text)}>{copied === template.id ? "Copiada!" : "Copiar mensagem"}</button></article>)}</div> : <div className={styles.emptyMessages}><i>✉</i><b>Nenhuma mensagem cadastrada</b><span>Use o botão “Adicionar mensagem” para criar seu primeiro modelo.</span></div>}</section>
      </section>
      {addingMessage && <div className={styles.backdrop} onMouseDown={() => setAddingMessage(false)}><form className={`${styles.messageForm} ${styles.messageModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={addTemplate}><header><button type="button" onClick={() => setAddingMessage(false)}>×</button><span>Mensagem da pipeline</span><h2>{editingMessage ? "Editar mensagem" : "Cadastrar mensagem padrão"}</h2><p>Crie um texto pronto para agilizar seus contatos comerciais.</p></header><label><span>Nome da mensagem</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Primeiro contato" autoFocus required /></label><label><span>Texto da mensagem</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva a mensagem que deseja reutilizar..." rows={7} required /></label><button type="submit">Salvar mensagem</button></form></div>}
      {editingProduct && <div className={styles.backdrop} onMouseDown={() => setEditingProduct(null)}><form className={`${styles.modal} ${styles.detailModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submitProduct}><header><div><span>Produto</span><h2>{editingProduct === "new" ? "Cadastrar produto" : "Editar produto"}</h2></div><button type="button" onClick={() => setEditingProduct(null)}>×</button></header><div className={styles.formGrid}><Input label="Nome do produto" value={productDraft.name} set={(name) => setProductDraft({...productDraft,name})} required /><Input label="Valor bruto" value={productDraft.gross} set={(gross) => setProductDraft({...productDraft,gross})} type="number" /><Input label="Valor líquido" value={productDraft.net} set={(net) => setProductDraft({...productDraft,net})} type="number" /></div><footer><button type="button" onClick={() => setEditingProduct(null)}>Cancelar</button><button type="submit">Salvar produto</button></footer></form></div>}
      {editingSource && <div className={styles.backdrop} onMouseDown={() => setEditingSource(null)}><form className={`${styles.modal} ${styles.detailModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submitSource}><header><div><span>Origem</span><h2>{editingSource === "new" ? "Cadastrar origem" : "Editar origem"}</h2></div><button type="button" onClick={() => setEditingSource(null)}>×</button></header><div className={styles.formGrid}><Input label="Nome da origem" value={sourceDraft} set={setSourceDraft} required /></div><footer><button type="button" onClick={() => setEditingSource(null)}>Cancelar</button><button type="submit">Salvar origem</button></footer></form></div>}
    </div>
  );
}

function ImportLeadsModal({ existing, stages, products, sources, close, save }: { existing: Lead[]; stages: Stage[]; products: ProductDefinition[]; sources: string[]; close: () => void; save: (leads: Lead[]) => void }) {
  type PreviewRow = { name: string; company: string; source: string; product: string; stage: string; lead?: Lead; status: "Pronto" | "Duplicado" | "Inválido"; issue?: string };
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const parseDate = (value: unknown) => {
    if (typeof value === "number") { const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000); return date.toISOString(); }
    const text = String(value || "").trim();
    if (!text) return undefined;
    const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const date = brazilian ? new Date(Number(brazilian[3]), Number(brazilian[2]) - 1, Number(brazilian[1]), 12) : new Date(text.length === 10 ? `${text}T12:00:00` : text);
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
      const existingKeys = new Set(existing.flatMap((lead) => [lead.email ? `e:${lead.email.trim().toLowerCase()}` : "", lead.phone ? `p:${lead.phone.replace(/\D/g, "")}` : ""]).filter(Boolean));
      const importedKeys = new Set<string>();
      const parsed = rawRows.map((raw, index): PreviewRow => {
        const keyed = Object.fromEntries(Object.entries(raw).map(([key, value]) => [normalize(key), value]));
        const get = (...keys: string[]) => keys.map((key) => keyed[normalize(key)]).find((value) => String(value ?? "").trim()) ?? "";
        const name = String(get("Nome")).trim(); const company = String(get("Empresa", "Oficina")).trim(); const phone = String(get("WhatsApp", "Telefone")).trim(); const email = String(get("E-mail", "Email")).trim().toLowerCase();
        const sourceInput = String(get("Origem")).trim(); const source = sources.find((item) => normalize(item) === normalize(sourceInput)) || sourceInput || "Cadastro";
        const productInput = String(get("Produto")).trim(); const catalogProduct = products.find((item) => normalize(item.name) === normalize(productInput)); const product = catalogProduct?.name || productInput || "Não informado";
        const stageInput = String(get("Etapa")).trim(); const stage = stages.find((item) => normalize(item) === normalize(stageInput)) || "Novo lead";
        const temperatureInput = String(get("Temperatura")).trim(); const temperature: Lead["temperature"] = ["Quente","Morno","Frio"].find((item) => normalize(item) === normalize(temperatureInput)) as Lead["temperature"] || "Morno";
        const createdAt = parseDate(get("Data do lead", "Data lead", "Data")); const conversationAt = parseDate(get("Data da conversa")); const meetingAt = parseDate(get("Data da reunião", "Data da reuniao")); const proposalAt = parseDate(get("Data da proposta")); const closedAt = parseDate(get("Data do fechamento"));
        const customGross = numberValue(get("Valor bruto personalizado", "Valor bruto")); const customNet = numberValue(get("Valor líquido personalizado", "Valor liquido personalizado", "Valor líquido", "Valor liquido")); const value = customGross || catalogProduct?.price || 0; const netValue = customNet || (catalogProduct?.netPrice ?? catalogProduct?.price ?? 0);
        const keys = [email ? `e:${email}` : "", phone ? `p:${phone.replace(/\D/g, "")}` : ""].filter(Boolean); const duplicate = keys.some((key) => existingKeys.has(key) || importedKeys.has(key)); keys.forEach((key) => importedKeys.add(key));
        let issue = !name ? "Nome não informado" : !createdAt ? "Data do lead inválida" : "";
        if (!issue && productInput && product === productInput && !catalogProduct) issue = "Produto não cadastrado";
        if (!issue && stage === "Fechado" && !closedAt) issue = "Fechamento sem data";
        const purchases: Purchase[] | undefined = stage === "Fechado" && closedAt ? [{ id: `import-${Date.now()}-${index}`, product, value, netValue, closedAt, repurchase: false }] : undefined;
        const lead: Lead | undefined = issue ? undefined : { id: `import-${Date.now()}-${index}`, name, company, phone, email, source, product, stage, value, netValue, temperature, nextAction: "", date: createdAt ? new Intl.DateTimeFormat("pt-BR").format(new Date(createdAt)) : "", createdAt, conversationAt, meetingAt, proposalAt, closedAt, purchases };
        return { name: name || `Linha ${index + 2}`, company, source, product, stage, lead, status: issue ? "Inválido" : duplicate ? "Duplicado" : "Pronto", issue: issue || (duplicate ? "WhatsApp ou e-mail já cadastrado" : undefined) };
      });
      setRows(parsed);
    } catch { setRows([{ name: "Arquivo não reconhecido", company: "", source: "", product: "", stage: "", status: "Inválido", issue: "Use o modelo em XLSX ou CSV" }]); }
    finally { setReading(false); }
  };
  const ready = rows.filter((row) => row.status === "Pronto" && row.lead).map((row) => row.lead as Lead);
  return <div className={styles.backdrop} onMouseDown={close}><section className={`${styles.modal} ${styles.importModal}`} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Importação de contatos</span><h2>Subir leads por planilha</h2></div><button onClick={close}>×</button></header><div className={styles.importIntro}><p>Use o modelo para manter produtos, etapas e datas coerentes com as dashboards.</p><button onClick={downloadTemplate}>↓ Baixar planilha-modelo</button></div><label className={styles.fileDrop}><input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])} /><span>{reading ? "Lendo planilha..." : fileName || "Selecionar arquivo XLSX ou CSV"}</span><small>Clique para escolher a planilha</small></label>{rows.length > 0 && <><div className={styles.importSummary}><span><b>{ready.length}</b> prontos</span><span><b>{rows.filter((row) => row.status === "Duplicado").length}</b> duplicados</span><span><b>{rows.filter((row) => row.status === "Inválido").length}</b> inválidos</span></div><div className={styles.importPreview}><header><b>Lead</b><b>Origem / produto</b><b>Etapa</b><b>Status</b></header>{rows.slice(0,10).map((row,index) => <article key={`${row.name}-${index}`}><span><b>{row.name}</b><small>{row.company}</small></span><span><b>{row.source}</b><small>{row.product}</small></span><span>{row.stage}</span><em className={row.status === "Pronto" ? styles.importReady : row.status === "Duplicado" ? styles.importDuplicate : styles.importInvalid}>{row.status}<small>{row.issue}</small></em></article>)}</div>{rows.length > 10 && <small className={styles.previewLimit}>Exibindo 10 de {rows.length} linhas.</small>}</>}<footer><button onClick={close}>Cancelar</button><button disabled={!ready.length} onClick={() => save(ready)}>Importar {ready.length} leads</button></footer></section></div>;
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
  save: (lead: Lead) => void;
  duplicate: (lead: Lead) => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: "Formulário",
    product: products[0]?.name || "",
    customGross: "",
    customNet: "",
    customDeal: false,
    temperature: "Morno" as Lead["temperature"],
    nextAction: "",
  });
  return (
    <div className={styles.backdrop} onMouseDown={close}>
      <form
        className={`${styles.modal} ${styles.leadModal}`}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const email = draft.email.trim().toLowerCase(); const phone = draft.phone.replace(/\D/g, "");
          const match = existing.find((lead) => (email && lead.email.trim().toLowerCase() === email) || (phone && lead.phone.replace(/\D/g, "") === phone));
          if (match) { window.alert("Este WhatsApp ou e-mail já está cadastrado. Vamos abrir o lead existente para você continuar o atendimento."); duplicate(match); return; }
          save({
            ...draft,
            id: String(Date.now()),
            stage: "Novo lead",
            value: draft.customDeal ? Number(draft.customGross) || 0 : products.find((product) => product.name === draft.product)?.price || 0,
            netValue: draft.customDeal ? Number(draft.customNet) || 0 : products.find((product) => product.name === draft.product)?.netPrice ?? products.find((product) => product.name === draft.product)?.price ?? 0,
            date: "Hoje",
            createdAt: new Date().toISOString(),
          });
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
            <select value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })}>
              {sources.map((source) => <option key={source}>{source}</option>)}
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
        <footer>
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button type="submit">Salvar oportunidade</button>
        </footer>
      </form>
    </div>
  );
}
function LeadDrawer({
  lead,
  products,
  sources,
  availableTags,
  stages,
  close,
  move,
  update,
  renameTag,
  deleteTag,
  remove,
  startAscension,
}: {
  lead: Lead;
  products: ProductDefinition[];
  sources: string[];
  availableTags: string[];
  stages: Stage[];
  close: () => void;
  move: (stage: Stage) => void;
  update: (changes: Partial<Lead>) => void;
  renameTag: (oldTag: string, newTag: string) => void;
  deleteTag: (tag: string) => void;
  remove: () => void;
  startAscension: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: lead.name, company: lead.company, phone: lead.phone, email: lead.email, temperature: lead.temperature });
  const selectedProduct = products.find((item) => item.name === lead.product);
  const [customDeal, setCustomDeal] = useState(Boolean(selectedProduct && (lead.value !== selectedProduct.price || lead.netValue !== (selectedProduct.netPrice ?? selectedProduct.price))));
  const [newTag, setNewTag] = useState("");
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState("");
  const tags = lead.tags || [];
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
  const removePurchase = (purchaseId: string) => {
    if (!window.confirm("Excluir esta compra do histórico? Os valores também deixarão de aparecer nos dashboards.")) return;
    const purchases = purchaseHistory.filter((purchase) => purchase.id !== purchaseId);
    const latest = purchases.at(-1);
    update({ purchases, ...(purchaseHistory.at(-1)?.id === purchaseId ? { closedAt: latest?.closedAt } : {}) });
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
          <button className={styles.saveLeadEdit} type="button" onClick={() => { update(draft); setEditing(false); }}>Salvar alterações</button>
        </section>}
        <section>
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
        <section>
          <small>Oportunidade</small>
          <label>
            <span>Produto</span>
            <select value={lead.product || "Não informado"} onChange={(event) => { const product = event.target.value; const selectedProduct = products.find((item) => item.name === product); update({ product, value: selectedProduct?.price || 0, netValue: selectedProduct?.netPrice ?? selectedProduct?.price ?? 0 }); }}>
              <option value="Não informado">Não informado</option>
              {products.map((product) => <option key={product.name} value={product.name}>{product.name}</option>)}
            </select>
          </label>
          {lead.product && lead.product !== "Não informado" && <label className={styles.customDealToggle}><input type="checkbox" checked={customDeal} onChange={(event) => { const enabled = event.target.checked; setCustomDeal(enabled); const product = products.find((item) => item.name === lead.product); if (!enabled && product) update({ value: product.price, netValue: product.netPrice ?? product.price }); }} /><span>Usar valores personalizados nesta negociação</span></label>}
          {customDeal && <div className={styles.customDealValues}><label><span>Valor bruto negociado</span><input type="number" min="0" step="0.01" value={lead.value || ""} onChange={(event) => update({ value: Number(event.target.value) || 0 })} /></label><label><span>Valor líquido negociado</span><input type="number" min="0" step="0.01" value={lead.netValue || ""} onChange={(event) => update({ netValue: Number(event.target.value) || 0 })} /></label></div>}
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
          <small>Observação e etiquetas</small>
          <label><span>Observação do lead</span><textarea value={lead.notes || ""} onChange={(event) => update({ notes: event.target.value })} placeholder="Registre contexto, objeções e próximos detalhes importantes..." rows={4} /></label>
          <div className={styles.leadTags}>
            <span>Etiquetas</span>
            <div>{tags.map((tag, index) => tag === "Desqualificado" ? <span key={tag} style={{ borderColor: "#d05f76", background: "#d05f7622" }}><button type="button" style={{ color: "#d05f76", cursor: "default" }}>Desqualificado</button><button type="button" aria-label="Remover Desqualificado deste lead" onClick={() => update({ tags: tags.filter((item) => item !== tag) })}>×</button></span> : editingTag === index ? <form key={`${tag}-${index}`} style={{ borderColor: tagColor(tag) }} onSubmit={(event) => { event.preventDefault(); saveTag(index); }}><input value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onBlur={() => saveTag(index)} autoFocus /><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => deleteTag(tag)}>×</button></form> : <span key={`${tag}-${index}`} style={{ borderColor: tagColor(tag), background: `${tagColor(tag)}22` }}><button type="button" style={{ color: tagColor(tag) }} onClick={() => { setEditingTag(index); setTagDraft(tag); }}>{tag}</button><button type="button" aria-label={`Excluir etiqueta ${tag} de todos os cadastros`} onClick={() => deleteTag(tag)}>×</button></span>)}</div>
            <form onSubmit={(event) => { event.preventDefault(); addTag(); }}><input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Nova etiqueta" /><button type="submit">+ Adicionar</button></form>
            {availableTags.filter((tag) => !tags.includes(tag)).length > 0 && <div className={styles.availableTags}>{availableTags.filter((tag) => !tags.includes(tag)).map((tag) => <button type="button" key={tag} style={{ borderColor: tagColor(tag), color: tagColor(tag) }} onClick={() => update({ tags: [...tags, tag] })}>+ {tag}</button>)}</div>}
          </div>
        </section>
        <section>
          <small>Histórico de datas</small>
          <div className={styles.leadTimeline}>
            <label><span>Lead gerado</span><input type="date" value={dateInputValue(lead.createdAt)} onChange={(event) => update({ createdAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Conversa iniciada</span><input type="date" value={dateInputValue(lead.conversationAt)} onChange={(event) => update({ conversationAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Reunião agendada</span><input type="date" value={dateInputValue(lead.meetingAt)} onChange={(event) => update({ meetingAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Proposta enviada</span><input type="date" value={dateInputValue(lead.proposalAt)} onChange={(event) => update({ proposalAt: dateFromInput(event.target.value) })} /></label>
            <label><span>Fechamento</span><input type="date" value={dateInputValue(lead.closedAt)} onChange={(event) => update({ closedAt: dateFromInput(event.target.value) })} /></label>
          </div>
        </section>
        {purchaseHistory.length > 0 && <section><small>Esteira de produtos</small><div className={styles.purchaseHistory}>{purchaseHistory.map((purchase) => <article key={purchase.id}><div><b>{purchase.product}</b><small>{purchase.repurchase ? "Recompra da base" : "Primeira compra"}</small></div><label className={styles.purchaseDate}><span>Data da compra</span><input type="date" value={dateInputValue(purchase.closedAt)} onChange={(event) => editPurchaseDate(purchase.id, event.target.value)} /></label><strong><Money value={purchase.value} /></strong><button className={styles.deletePurchase} type="button" aria-label={`Excluir compra de ${purchase.product}`} onClick={() => removePurchase(purchase.id)}>×</button></article>)}</div>{nextProduct ? <button className={styles.ascensionButton} onClick={startAscension}>Iniciar ascensão para {nextProduct.name}</button> : <span className={styles.ascensionComplete}>Esteira completa</span>}</section>}
      </aside>
    </div>
  );
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
function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a9.8 9.8 0 0 0-8.45 14.75L2.2 21.8l5.17-1.35A9.8 9.8 0 1 0 12 2Zm0 17.8a7.8 7.8 0 0 1-3.98-1.08l-.28-.17-3.07.8.82-2.99-.18-.3A7.8 7.8 0 1 1 12 19.8Zm4.28-5.84c-.23-.12-1.38-.68-1.6-.76-.21-.08-.37-.12-.52.12-.16.23-.6.76-.74.91-.14.16-.27.18-.5.06-.24-.12-1-.37-1.9-1.18a7.1 7.1 0 0 1-1.31-1.63c-.14-.23-.02-.36.1-.48.11-.1.24-.27.35-.4.12-.14.16-.24.24-.4.08-.15.04-.29-.02-.4-.06-.12-.52-1.26-.72-1.72-.19-.46-.38-.4-.52-.4h-.45c-.16 0-.41.06-.63.3-.21.23-.82.8-.82 1.96s.84 2.27.96 2.43c.12.16 1.66 2.53 4.02 3.55.56.24 1 .39 1.34.5.57.18 1.08.15 1.49.09.45-.07 1.38-.57 1.58-1.11.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.45-.28Z" /></svg>;
}
function FunnelVisualization({ steps, total }: { steps: Array<{ label: string; count: number; detail: string }>; total: number }) {
  const colors = ["#1d4a5c", "#1b4556", "#193f4f", "#173a48", "#153440"];
  return <div className={styles.funnelVisual}><svg viewBox="0 0 760 455" role="img" aria-label="Funil de conversão de leads">{steps.map((step,index) => { const width = 430 - index * 48; const x = (760 - width) / 2; const y = 18 + index * 78; const percentage = total ? step.count / total * 100 : 0; return <g key={step.label}><path d={`M ${x} ${y + 8} L ${x + width} ${y + 8} L ${x + width - 12} ${y + 60} Q 380 ${y + 65} ${x + 12} ${y + 60} Z`} fill={colors[index]} /><ellipse cx="380" cy={y + 8} rx={width / 2} ry="10" fill={colors[index]} /><ellipse cx="380" cy={y + 7} rx={width / 2 - 5} ry="6" fill="rgba(220,239,246,.04)" /><line x1={x - 7} y1={y + 35} x2={x - 36} y2={y + 35} className={styles.funnelLeader} /><text x={x - 44} y={y + 31} textAnchor="end" className={styles.funnelOutsideLabel}>{step.label}</text><text x={x - 44} y={y + 45} textAnchor="end" className={styles.funnelOutsideDetail}>{step.detail}</text><text x="380" y={y + 43} textAnchor="middle" className={styles.funnelInsideCount}>{step.count}</text><line x1={x + width + 7} y1={y + 35} x2={x + width + 36} y2={y + 35} className={styles.funnelLeader} /><text x={x + width + 44} y={y + 40} className={styles.funnelOutsidePercent}>{percentage.toFixed(1)}%</text></g>; })}</svg></div>;
}
function MonthlyMetricsChart({ leads, endMonth, goals, setGoal }: { leads: Lead[]; endMonth: string; goals: Record<string, number>; setGoal: (month: string, value: number) => void }) {
  const [year, month] = endMonth.split("-").map(Number);
  const start = new Date(2026, 6, 1);
  const end = new Date(year, month - 1, 1);
  const firstMonth = end < start ? end : start;
  const monthCount = Math.max(1, (end.getFullYear() - firstMonth.getFullYear()) * 12 + end.getMonth() - firstMonth.getMonth() + 1);
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const items = leads.filter((lead) => (lead.createdAt || "").slice(0, 7) === key);
    const purchases = leads.flatMap((lead) => lead.purchases?.length ? lead.purchases : lead.stage === "Fechado" && lead.closedAt ? [{ value: lead.value, closedAt: lead.closedAt }] : []);
    const trafficLeads = items.filter((lead) => lead.id.startsWith("traffic-")).length;
    return { key, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""), leads: items.length, organicLeads: items.length - trafficLeads, trafficLeads, closedValue: purchases.filter((purchase) => inMonth(purchase.closedAt, key)).reduce((sum, purchase) => sum + purchase.value, 0), goal: goals[key] || 0 };
  });
  const maxValue = Math.max(1, ...months.flatMap((item) => [item.closedValue, item.goal]));
  const maxLeads = Math.max(1, ...months.map((item) => item.leads));
  const leadPoints = months.map((item, index) => ({ x: index * 100 + 50, y: 215 - item.leads / maxLeads * 180, value: item.leads }));
  const leadPath = leadPoints.reduce((path, point, index) => { if (!index) return `M 0 ${point.y} L ${point.x} ${point.y}`; const previous = leadPoints[index - 1]; const middle = (previous.x + point.x) / 2; return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`; }, "") + (leadPoints.length ? ` L ${months.length * 100} ${leadPoints.at(-1)!.y}` : "");
  const areaPath = leadPoints.length ? `${leadPath} L ${months.length * 100} 230 L 0 230 Z` : "";
  const valueTicks = [maxValue, maxValue * .75, maxValue * .5, maxValue * .25, 0];
  const leadTicks = [maxLeads, Math.round(maxLeads * .75), Math.round(maxLeads * .5), Math.round(maxLeads * .25), 0];
  const saveGoal = (value: string) => setGoal(endMonth, Number(value) || 0);
  return <section className={`${styles.panel} ${styles.monthlyChart}`}><header><div><span>Performance mensal</span><h3>Valor fechado × meta</h3><p>Colunas financeiras por mês e evolução dos leads gerados.</p></div><div className={styles.chartLegend}><span><i className={styles.goalLegend} />Meta</span><span><i className={styles.closedLegend} />Valor fechado</span><span><i className={styles.leadLegend} />Leads gerados</span></div></header><div className={styles.goalControl}><div><span>Meta do mês selecionado</span><small>{endMonth.split("-").reverse().join("/")}</small></div><label>R$<input type="number" min="0" step="100" value={goals[endMonth] || ""} onChange={(event) => saveGoal(event.target.value)} placeholder="Definir meta" /></label></div><div className={styles.comboChart}><div className={styles.valueAxis}>{valueTicks.map((tick, index) => <span key={index}>{tick >= 1000 ? `R$ ${(tick / 1000).toFixed(tick % 1000 ? 1 : 0)}k` : currency.format(tick)}</span>)}</div><div className={styles.comboScroller}><div className={styles.comboPlot} style={{ gridTemplateColumns: `repeat(${months.length}, 150px)`, width: `${Math.max(360, months.length * 150)}px` }}><svg viewBox={`0 0 ${months.length * 100} 240`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lead-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62c7f2" stopOpacity=".16" /><stop offset="1" stopColor="#62c7f2" stopOpacity="0" /></linearGradient></defs><path className={styles.leadArea} d={areaPath} /><path className={styles.leadCurve} d={leadPath} /></svg>{leadPoints.map((point,index) => <span key={months[index].key} className={styles.leadPoint} style={{ left: `${(index + .5) / months.length * 100}%`, top: `${point.y / 240 * 100}%` }}><b>{point.value}</b><span className={styles.leadPointTooltip}><strong>{months[index].label} · {point.value} leads</strong><small>Orgânico <b>{months[index].organicLeads}</b></small><small>Tráfego <b>{months[index].trafficLeads}</b></small></span></span>)}{months.map((item) => <article key={item.key}><div><span className={styles.goalBar} style={{ height: `${item.goal / maxValue * 100}%` }}><b>{item.goal ? currency.format(item.goal) : ""}</b></span><span className={styles.closedBar} style={{ height: `${item.closedValue / maxValue * 100}%` }}><b>{item.closedValue ? currency.format(item.closedValue) : ""}</b></span></div><strong>{item.label}</strong><small>{item.key.slice(0,4)}</small></article>)}</div></div><div className={styles.leadAxis}>{leadTicks.map((tick,index) => <span key={index}>{tick}</span>)}</div></div></section>;
}
function PeriodFilter({ start, end, setRange }: { start: string; end: string; setRange: (start: string, end: string) => void }) {
  return <section className={styles.periodFilter}><span>Filtro</span><label><small>Início</small><input type="date" value={start} max={end} onChange={(event) => event.target.value && setRange(event.target.value, end)} /></label><label><small>Final</small><input type="date" value={end} min={start} onChange={(event) => event.target.value && setRange(start, event.target.value)} /></label></section>;
}
function ProductValueChart({ leads, start, end, products }: { leads: Lead[]; start: string; end: string; products: ProductDefinition[] }) {
  const productNames = Array.from(new Set([...products.map((product) => product.name), ...leads.map((lead) => lead.product || "Não informado"), ...leads.flatMap((lead) => purchasesForLead(lead, products).map((purchase) => purchase.product))])).filter((product) => product !== "Não informado");
  const productData = productNames.map((product) => { const items = leads.filter((lead) => lead.product === product); const closed = leads.flatMap((lead) => purchasesForLead(lead, products)).filter((purchase) => purchase.product === product && inRange(purchase.closedAt, start, end)); const value = closed.reduce((sum, purchase) => sum + purchase.value, 0); return { product, value, net: closed.reduce((sum, purchase) => sum + purchase.netValue, 0), sales: closed.length, proposals: items.filter((lead) => inRange(lead.proposalAt, start, end)).length }; }).sort((a,b) => b.value - a.value);
  const total = productData.reduce((sum, product) => sum + product.value, 0);
  const colors = ["#2bc48a", "#5aaee8", "#a986e8", "#d6a752", "#e47882"];
  return <section className={`${styles.panel} ${styles.productChart}`}><header><div><span>Receita por produto</span><h3>Composição do valor fechado</h3><p>Atualizado pelos produtos marcados como fechados na pipeline.</p></div><strong><Money value={total} /><small>valor bruto total</small></strong></header><div className={styles.productStack}>{productData.map((item,index) => <i key={item.product} style={{ width: `${total ? item.value / total * 100 : 100 / Math.max(productData.length,1)}%`, background: colors[index % colors.length] }} />)}</div><div className={styles.productList}>{productData.map((item,index) => <article key={item.product}><i style={{ background: colors[index % colors.length] }} /><div><b>{item.product}</b><small>{item.sales} fechamentos · líquido <Money value={item.net} /></small></div><strong><Money value={item.value} /></strong><em>{total ? (item.value / total * 100).toFixed(1) : "0.0"}%</em></article>)}</div></section>;
}
function OriginValueChart({ leads, start, end, sources }: { leads: Lead[]; start: string; end: string; sources: string[] }) {
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const origins = sources.map((source) => { const items = leads.filter((lead) => lead.source === source); const closedItems = items.flatMap((lead) => lead.purchases?.length ? lead.purchases : lead.stage === "Fechado" && lead.closedAt ? [{ value: lead.value, closedAt: lead.closedAt }] : []).filter((purchase) => inRange(purchase.closedAt, start, end)); return { source, leads: items.filter((lead) => inRange(lead.createdAt, start, end)).length, conversations: items.filter((lead) => inRange(lead.conversationAt, start, end)).length, proposals: items.filter((lead) => inRange(lead.proposalAt, start, end)).length, closed: closedItems.length, value: closedItems.reduce((sum, purchase) => sum + purchase.value, 0) }; }).sort((a,b) => b.value - a.value || b.leads - a.leads);
  const maximum = Math.max(1, ...origins.map((origin) => origin.value));
  const selected = origins.find((origin) => origin.source === selectedOrigin);
  return <section className={styles.originAnalysis}><header><div><span>Receita por origem</span><h4>Valor fechado × origem do lead</h4></div><small>Clique em uma barra para ver os detalhes</small></header><div className={styles.originBars}>{origins.map((origin) => <button key={origin.source} onClick={() => setSelectedOrigin(origin.source)}><span>{origin.source}</span><div><i style={{ width: `${origin.value ? Math.max(7, origin.value / maximum * 100) : 2}%` }} /></div><strong><Money value={origin.value} /></strong></button>)}</div>{selected && <div className={styles.backdrop} onMouseDown={() => setSelectedOrigin(null)}><section className={styles.originDetail} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Análise da origem</span><h2>{selected.source}</h2></div><button onClick={() => setSelectedOrigin(null)}>×</button></header><strong><Money value={selected.value} /><small>valor final fechado</small></strong><div><article><span>Leads</span><b>{selected.leads}</b></article><article><span>Conversas</span><b>{selected.conversations}</b></article><article><span>Propostas</span><b>{selected.proposals}</b></article><article><span>Fechamentos</span><b>{selected.closed}</b></article></div><footer><span>Conversão final</span><b>{selected.leads ? (selected.closed / selected.leads * 100).toFixed(1) : "0.0"}%</b></footer></section></div>}</section>;
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
