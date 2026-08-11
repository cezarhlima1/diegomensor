"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./crm.module.css";

type Stage =
  | "Novo lead"
  | "Contato feito"
  | "Em conversação"
  | "Reunião agendada"
  | "Proposta"
  | "Fechado";
type View = "geral" | "comercial" | "trafego" | "pipeline" | "contatos" | "mensagens";
type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: string;
  product?: string;
  stage: Stage;
  value: number;
  temperature: "Quente" | "Morno" | "Frio";
  nextAction: string;
  date: string;
  createdAt?: string;
  conversationAt?: string;
  meetingAt?: string;
  proposalAt?: string;
  closedAt?: string;
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
type ProductDefinition = { name: string; price: number; netPrice?: number };

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
const inMonth = (date: string | undefined, month: string) => Boolean(date?.startsWith(month));
const inRange = (date: string | undefined, start: string, end: string) => Boolean(date && date.slice(0, 10) >= start && date.slice(0, 10) <= end);
const formatEventDate = (date?: string) => date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date)) : "Ainda não ocorreu";
const hydrateLeadDates = (lead: Lead, createdAt: string): Lead => ({ ...lead, createdAt, conversationAt: lead.conversationAt || (lead.stage !== "Novo lead" ? createdAt : undefined), meetingAt: lead.meetingAt || (["Reunião agendada", "Proposta", "Fechado"].includes(lead.stage) ? createdAt : undefined), proposalAt: lead.proposalAt || (["Proposta", "Fechado"].includes(lead.stage) ? createdAt : undefined), closedAt: lead.closedAt || (lead.stage === "Fechado" ? createdAt : undefined) });

const stages: Stage[] = [
  "Novo lead",
  "Contato feito",
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
const whatsappLink = (lead: Lead) => {
  const digits = lead.phone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = lead.name.trim().split(" ")[0];
  const message = `Olá, ${firstName}! Tudo bem? Aqui é da Mensor Treinamentos. Recebi seu contato e queria entender melhor o momento da sua oficina.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function CRM() {
  const [view, setView] = useState<View>("geral");
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map((lead) => hydrateLeadDates(lead, new Date().toISOString())));
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dateRange, setDateRange] = useState(() => { const now = new Date(); const month = now.toISOString().slice(0, 7); return { start: `${month}-01`, end: `${month}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}` }; });
  const [traffic, setTraffic] = useState<TrafficRecord[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDefinition[]>([...products]);
  const [catalogSources, setCatalogSources] = useState<string[]>([...leadSources]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(leadsStorageKey);
      if (saved)
        setLeads(
          (JSON.parse(saved) as Lead[]).map((lead) => {
            const stage = (lead.stage as string) === "Diagnóstico" ? "Em conversação" as Stage : lead.stage;
            const createdAt = lead.createdAt || new Date().toISOString();
            const product = lead.product === "Mentoria" ? "Mentoria OAG" : lead.product || "Não informado";
            const source = normalizeSource(lead.source);
            const migrated = hydrateLeadDates({ ...lead, stage, product, source }, createdAt);
            return ["Proposta", "Fechado"].includes(stage) ? migrated : { ...migrated, value: 0 };
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
  useEffect(() => { try { const savedProducts = localStorage.getItem("mensor-crm-products-v1"); const savedSources = localStorage.getItem("mensor-crm-sources-v1"); if (savedProducts) setCatalogProducts((JSON.parse(savedProducts) as ProductDefinition[]).map((item) => ({ ...item, netPrice: item.netPrice ?? item.price }))); if (savedSources) setCatalogSources(JSON.parse(savedSources)); } catch {} }, []);
  const saveProducts = (next: ProductDefinition[]) => { setCatalogProducts(next); localStorage.setItem("mensor-crm-products-v1", JSON.stringify(next)); };
  const saveSources = (next: string[]) => { setCatalogSources(next); localStorage.setItem("mensor-crm-sources-v1", JSON.stringify(next)); };
  const renameProduct = (oldName: string, product: ProductDefinition) => { saveProducts(catalogProducts.map((item) => item.name === oldName ? product : item)); setLeads((current) => current.map((lead) => lead.product === oldName ? { ...lead, product: product.name } : lead)); saveTraffic(traffic.map((item) => item.product === oldName ? { ...item, product: product.name } : item)); };
  const renameSource = (oldName: string, name: string) => { saveSources(catalogSources.map((item) => item === oldName ? name : item)); setLeads((current) => current.map((lead) => lead.source === oldName ? { ...lead, source: name } : lead)); };

  const reportingLeads = useMemo(() => leads.filter((lead) => inRange(lead.createdAt, dateRange.start, dateRange.end)), [leads, dateRange]);
  const stats = useMemo(() => {
    const open = leads.filter((lead) => lead.stage === "Proposta" && inRange(lead.proposalAt, dateRange.start, dateRange.end));
    const won = leads.filter((lead) => inRange(lead.closedAt, dateRange.start, dateRange.end));
    const proposals = leads.filter((lead) => inRange(lead.proposalAt, dateRange.start, dateRange.end));
    return {
      total: reportingLeads.length,
      meetings: leads.filter((lead) => inRange(lead.meetingAt, dateRange.start, dateRange.end)).length,
      proposals: proposals.length,
      closed: won.length,
      openValue: open.reduce((sum, lead) => sum + lead.value, 0),
      wonValue: won.reduce((sum, lead) => sum + lead.value, 0),
      netWonValue: won.reduce((sum, lead) => sum + netForValue(lead.value, lead.product, catalogProducts), 0),
      conversion: reportingLeads.length ? (won.length / reportingLeads.length) * 100 : 0,
      proposalConversion: proposals.length
        ? (won.length / proposals.length) * 100
        : 0,
      proposalValue: proposals.reduce((sum, lead) => sum + lead.value, 0),
      valueConversion: proposals.reduce((sum, lead) => sum + lead.value, 0)
        ? (won.reduce((sum, lead) => sum + lead.value, 0) /
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
          const label =
            stage === "Proposta"
              ? "Informe o valor da proposta enviada:"
              : "Confirme o valor final recebido:";
          const informed = window.prompt(
            label,
            String(lead.value || catalogProducts.find((item) => item.name === lead.product)?.price || productPrice(lead.product) || ""),
          );
          if (informed === null) return lead;
          const value = Number(
            informed
              .replace(/[^0-9,.-]/g, "")
              .replace(".", "")
              .replace(",", "."),
          );
          if (!Number.isFinite(value) || value <= 0) return lead;
          const now = new Date().toISOString();
          return { ...lead, stage, value, ...(stage === "Proposta" ? { proposalAt: now } : { closedAt: now }) };
        }
        const now = new Date().toISOString();
        return { ...lead, stage, value: 0, ...(stage === "Contato feito" || stage === "Em conversação" ? { conversationAt: now } : {}), ...(stage === "Reunião agendada" ? { meetingAt: now } : {}) };
      }),
    );
  const addLead = (lead: Lead) => {
    setLeads((current) => [lead, ...current]);
    setAdding(false);
  };
  const updateLead = (id: string, changes: Partial<Lead>) => {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, ...changes } : lead));
    setSelected((current) => current?.id === id ? { ...current, ...changes } : current);
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
    <main className={styles.crm}>
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
        <div className={styles.localNotice}>
          <i>●</i>
          <div>
            <b>Modo local</b>
            <span>Sem banco de dados</span>
          </div>
        </div>
      </aside>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <small>Mensor Treinamentos / {navigation.find(([id]) => id === view)?.[1]}</small>
            <h1>{navigation.find(([id]) => id === view)?.[1]}</h1>
          </div>
          {["geral", "comercial", "trafego"].includes(view) && <PeriodFilter start={dateRange.start} end={dateRange.end} setRange={(start, end) => { setDateRange({ start, end }); setSelectedMonth(start.slice(0, 7)); }} />}
          <div className={styles.topActions}>
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
          </div>
        </header>
        {view === "geral" && <ExecutiveOverview leads={leads} products={catalogProducts} start={dateRange.start} end={dateRange.end} traffic={traffic} />}
        {view === "comercial" && (
          <Dashboard leads={leads} allLeads={leads} stats={stats} selectedMonth={selectedMonth} start={dateRange.start} end={dateRange.end} products={catalogProducts} sources={catalogSources} />
        )}
        {view === "trafego" && <TrafficDashboard records={traffic.filter((item) => inRange(item.date || `${item.month}-01`, dateRange.start, dateRange.end))} month={selectedMonth} products={catalogProducts} save={(record) => saveTraffic(traffic.some((item) => item.id === record.id) ? traffic.map((item) => item.id === record.id ? record : item) : [record, ...traffic])} remove={(id) => saveTraffic(traffic.filter((item) => item.id !== id))} />}
        {view === "pipeline" && (
          <Pipeline leads={filtered} moveLead={moveLead} select={setSelected} />
        )}
        {view === "contatos" && (
          <Contacts leads={filtered} sources={catalogSources} select={setSelected} />
        )}
        {view === "mensagens" && <Details products={catalogProducts} sources={catalogSources} saveProducts={saveProducts} saveSources={saveSources} renameProduct={renameProduct} renameSource={renameSource} />}
      </section>
      {adding && <LeadModal products={catalogProducts} sources={catalogSources} close={() => setAdding(false)} save={addLead} />}
      {selected && (
        <LeadDrawer
          lead={selected}
          products={catalogProducts}
          sources={catalogSources}
          close={() => setSelected(null)}
          update={(changes) => updateLead(selected.id, changes)}
          move={(stage) => {
            moveLead(selected.id, stage);
            const now = new Date().toISOString();
            setSelected((current) => current ? { ...current, stage, ...(stage === "Contato feito" || stage === "Em conversação" ? { conversationAt: now } : {}), ...(stage === "Reunião agendada" ? { meetingAt: now } : {}), ...(stage === "Proposta" ? { proposalAt: now } : {}), ...(stage === "Fechado" ? { closedAt: now } : {}) } : current);
          }}
        />
      )}
    </main>
  );
}

function ExecutiveOverview({ leads, products, start, end, traffic }: { leads: Lead[]; products: ProductDefinition[]; start: string; end: string; traffic: TrafficRecord[] }) {
  const [goals, setGoals] = useState<Record<string, number>>({});
  useEffect(() => { try { const saved = localStorage.getItem(goalsStorageKey); if (saved) setGoals(JSON.parse(saved)); } catch {} }, []);
  const goalMonth = start.slice(0, 7);
  const updateGoal = (month: string, value: number) => { const next = { ...goals, [month]: value }; setGoals(next); localStorage.setItem(goalsStorageKey, JSON.stringify(next)); };
  const periodTraffic = traffic.filter((item) => inRange(item.date || `${item.month}-01`, start, end));
  const organicClosings = leads.filter((lead) => inRange(lead.closedAt, start, end));
  const organicRevenue = organicClosings.reduce((sum, lead) => sum + lead.value, 0);
  const organicNet = organicClosings.reduce((sum, lead) => sum + netForValue(lead.value, lead.product, products), 0);
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
    <section className={styles.overviewHero}><div><span>Resultado consolidado</span><h2>Orgânico e tráfego em uma única visão</h2><p>Receita líquida consolidada, já descontado o investimento em tráfego do período.</p></div><strong>{currency.format(periodBalance)}<small>saldo do período</small></strong></section>
    <div className={styles.overviewKpis}>
      <Kpi label="Receita bruta" value={currency.format(totalRevenue)} detail={`${totalSales} vendas totais`} />
      <Kpi label="Receita líquida" value={currency.format(totalNet)} detail={`${currency.format(Math.max(0, totalRevenue - totalNet))} em taxas`} />
      <Kpi label="Investimento em tráfego" value={currency.format(trafficInvestment)} detail="Descontado do saldo do período" />
      <Kpi label="Saldo do período" value={currency.format(periodBalance)} detail={`${currency.format(totalNet)} líquidos − investimento`} />
      <Kpi label="Receita orgânica" value={currency.format(organicRevenue)} detail={`Líquido ${currency.format(organicNet)}`} />
      <Kpi label="Receita do tráfego" value={currency.format(trafficRevenue)} detail={`Líquido ${currency.format(trafficNet)}`} />
      <article className={styles.overviewGoal}><label htmlFor="overview-goal">Meta do mês</label><div><small>R$</small><input id="overview-goal" type="number" min="0" step="100" value={goal || ""} onChange={(event) => updateGoal(goalMonth, Number(event.target.value) || 0)} placeholder="0" /></div><span>{goal ? `${goalProgress.toFixed(1)}% atingido` : "Preencha a meta do mês"}</span><i><b style={{ width: `${Math.min(100, goalProgress)}%` }} /></i></article>
    </div>
    <section className={`${styles.panel} ${styles.channelComposition}`}><header><span>Composição da receita</span><h3>Participação por canal</h3></header><div><article><span>Orgânico</span><strong>{currency.format(organicRevenue)}</strong><div><i style={{ width: `${totalRevenue ? organicRevenue / totalRevenue * 100 : 0}%` }} /></div><small>{totalRevenue ? (organicRevenue / totalRevenue * 100).toFixed(1) : "0.0"}% do total</small></article><article><span>Tráfego</span><strong>{currency.format(trafficRevenue)}</strong><div><i style={{ width: `${totalRevenue ? trafficRevenue / totalRevenue * 100 : 0}%` }} /></div><small>{totalRevenue ? (trafficRevenue / totalRevenue * 100).toFixed(1) : "0.0"}% do total</small></article></div></section>
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
  return <div className={`${styles.content} ${styles.trafficDashboard}`}><header className={styles.trafficHeader}><div><span>Vendas diretas</span><h2>Campanhas do mês</h2><p>Atualize diariamente os totais acumulados de cada campanha.</p></div><button onClick={openNew}>+ Adicionar campanha</button></header><div className={styles.trafficKpis}><Kpi label="Investimento total" value={currency.format(totals.investment)} detail={`${records.length} campanhas`} /><Kpi label="Faturamento bruto" value={currency.format(totals.revenue)} detail={`${totals.sales} vendas`} /><Kpi label="Faturamento líquido" value={currency.format(totals.net)} detail={`${currency.format(Math.max(0,totals.revenue-totals.net))} em taxas`} /><Kpi label="ROAS" value={`${roas.toFixed(2)}x`} detail={`CPA ${currency.format(cpa)}`} /></div><section className={`${styles.panel} ${styles.trafficTable}`}><header><div><span>Detalhamento</span><h3>Dashboard por campanha</h3></div><b>{records.length} campanhas</b></header><div className={styles.trafficRows}>{records.map((item) => { const net = item.netRevenue ?? netForValue(item.revenue,item.product,products); const campaignDate = item.date || `${item.month}-01`; const fees = Math.max(0,item.revenue-net); const itemCpa = item.sales ? item.investment/item.sales : 0; const netPerSale = item.sales ? net/item.sales : 0; const itemRoas = item.investment ? item.revenue/item.investment : 0; return <article className={styles.campaignDashboard} key={item.id}><header className={styles.campaignDashboardHeader}><div><span>Campanha</span><b>{item.campaign}</b><small>{item.product}</small><em className={item.status === "Fechada" ? styles.campaignClosed : styles.campaignRunning}>{item.status || "Em andamento"}</em></div><time dateTime={campaignDate}><small>Data da campanha</small><strong>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${campaignDate}T12:00:00`))}</strong></time><div className={styles.campaignActions}><button onClick={() => openEdit(item)}>Editar</button><button onClick={() => remove(item.id)} aria-label={`Excluir ${item.campaign}`}>×</button></div></header><div className={styles.campaignMetrics}><span><small>Investimento</small><strong>{currency.format(item.investment)}</strong></span><span><small>Vendas</small><strong>{item.sales}</strong></span><span><small>Faturamento bruto</small><strong>{currency.format(item.revenue)}</strong></span><span><small>Faturamento líquido</small><strong>{currency.format(net)}</strong></span><span><small>Líquido por produto</small><strong>{currency.format(netPerSale)}</strong></span><span><small>Taxas</small><strong>{currency.format(fees)}</strong></span><span><small>CPA</small><strong>{currency.format(itemCpa)}</strong></span><span><small>ROAS</small><strong>{itemRoas.toFixed(2)}x</strong></span></div></article>})}{!records.length && <div className={styles.emptyTraffic}>Nenhuma campanha cadastrada neste período.</div>}</div></section>{editing && <div className={styles.backdrop} onMouseDown={() => setEditing(null)}><form className={`${styles.modal} ${styles.trafficModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}><header><div><span>Campanha mensal</span><h2>{editing === "new" ? "Adicionar campanha" : "Editar campanha"}</h2></div><button type="button" onClick={() => setEditing(null)}>×</button></header><div className={styles.formGrid}><Input label="Campanha" value={draft.campaign} set={(campaign) => setDraft({...draft,campaign})} required /><Input label="Data da campanha" value={draft.date} set={(date) => setDraft({...draft,date})} type="date" required /><label><span>Status da campanha</span><select value={draft.status} onChange={(event) => setDraft({...draft,status:event.target.value as "Em andamento" | "Fechada"})}><option>Em andamento</option><option>Fechada</option></select></label><label><span>Produto</span><select value={draft.product} onChange={(event) => setDraft({...draft,product:event.target.value})}>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label><Input label="Investimento total" value={draft.investment} set={(investment) => setDraft({...draft,investment})} type="number" /><Input label="Quantidade de vendas" value={draft.sales} set={(sales) => setDraft({...draft,sales})} type="number" /><Input label="Faturamento bruto" value={draft.revenue} set={(revenue) => setDraft({...draft,revenue})} type="number" /><Input label="Faturamento líquido" value={draft.netRevenue} set={(netRevenue) => setDraft({...draft,netRevenue})} type="number" /><div className={styles.autoMetrics}><span>CPA <b>{currency.format(Number(draft.sales) ? Number(draft.investment)/Number(draft.sales) : 0)}</b></span><span>Líquido por produto <b>{currency.format(Number(draft.sales) ? Number(draft.netRevenue)/Number(draft.sales) : 0)}</b></span><span>ROAS <b>{Number(draft.investment) ? (Number(draft.revenue)/Number(draft.investment)).toFixed(2) : "0.00"}x</b></span></div></div><footer><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="submit">Salvar campanha</button></footer></form></div>}</div>;
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
  useEffect(() => { try { const saved = localStorage.getItem(goalsStorageKey); if (saved) setMonthlyGoals(JSON.parse(saved)); } catch {} }, []);
  const updateMonthlyGoal = (month: string, value: number) => { const next = { ...monthlyGoals, [month]: value }; setMonthlyGoals(next); localStorage.setItem(goalsStorageKey, JSON.stringify(next)); };
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
  moveLead,
  select,
}: {
  leads: Lead[];
  moveLead: (id: string, stage: Stage) => void;
  select: (lead: Lead) => void;
}) {
  return (
    <div className={styles.pipelineWrap}>
      <div className={styles.pipeline}>
        {stages.map((stage) => {
          const items = leads.filter((lead) => lead.stage === stage);
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
                  <i />
                  <b>{stage}</b>
                  <span>{items.length}</span>
                </div>
                <small>
                  {stage === "Proposta" || stage === "Fechado"
                    ? currency.format(
                        items.reduce((sum, lead) => sum + lead.value, 0),
                      )
                    : "Sem valor"}
                </small>
              </header>
              <div className={styles.cards}>
                {items.map((lead) => (
                  <article
                    key={lead.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("leadId", lead.id)
                    }
                    onClick={() => select(lead)}
                  >
                    <div className={styles.cleanCard}>
                      <div>
                        <h3>{lead.name}</h3>
                        <p><span>Origem</span>{lead.source}</p>
                        {lead.product && lead.product !== "Não informado" && <em className={styles.productTag}>{lead.product}</em>}
                      </div>
                      {lead.phone && (
                        <a href={whatsappLink(lead)} target="_blank" rel="noopener noreferrer" aria-label={`Chamar ${lead.name} no WhatsApp`} onClick={(event) => event.stopPropagation()}>
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
      </div>
    </div>
  );
}

function Contacts({
  leads,
  sources,
  select,
}: {
  leads: Lead[];
  sources: string[];
  select: (lead: Lead) => void;
}) {
  const [sourceFilter, setSourceFilter] = useState("Todos");
  const [contactRange, setContactRange] = useState(() => { const now = new Date(); const month = now.toISOString().slice(0, 7); return { start: `${month}-01`, end: `${month}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}` }; });
  const sourceTags = sources;
  const visibleLeads = leads.filter((lead) => inRange(lead.createdAt, contactRange.start, contactRange.end) && (sourceFilter === "Todos" || lead.source.trim() === sourceFilter));
  const exportExcel = () => { const rows = [["Nome", "Empresa", "WhatsApp", "E-mail", "Origem", "Produto", "Etapa", "Valor", "Data do lead", "Data do fechamento"], ...visibleLeads.map((lead) => [lead.name, lead.company, lead.phone, lead.email, lead.source, lead.product || "", lead.stage, String(lead.value), lead.createdAt || "", lead.closedAt || ""])]; const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")).join("\n")}`; const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = `leads-${contactRange.start}-${contactRange.end}.csv`; link.click(); URL.revokeObjectURL(url); };
  return (
    <div className={styles.content}>
      <section className={styles.panel}>
        <PanelTitle
          eyebrow="Base comercial"
          title={`${visibleLeads.length} leads`}
        />
        <div className={styles.contactFilters}>
          <div><span>Filtrar leads</span><small>Combine o período com as etiquetas de origem para localizar ou exportar os registros.</small></div>
          <div className={styles.contactFilterFields}><label><span>Data inicial</span><input type="date" value={contactRange.start} max={contactRange.end} onChange={(event) => setContactRange({ ...contactRange, start: event.target.value })} /></label><label><span>Data final</span><input type="date" value={contactRange.end} min={contactRange.start} onChange={(event) => setContactRange({ ...contactRange, end: event.target.value })} /></label><label><span>Origem</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option>Todos</option>{sourceTags.map((source) => <option key={source}>{source}</option>)}</select></label><button onClick={exportExcel}>↓ Baixar Excel</button></div>
        </div>
        <div className={styles.sourceChips}>
          <button className={sourceFilter === "Todos" ? styles.selectedChip : ""} onClick={() => setSourceFilter("Todos")}>Todos <b>{leads.filter((lead) => inRange(lead.createdAt, contactRange.start, contactRange.end)).length}</b></button>
          {sourceTags.map((source) => { const count = leads.filter((lead) => lead.source.trim() === source && inRange(lead.createdAt, contactRange.start, contactRange.end)).length; return <button key={source} className={sourceFilter === source ? styles.selectedChip : ""} onClick={() => setSourceFilter(source)}>{source}<b>{count}</b></button>; })}
        </div>
        <div className={styles.contactTable}>
          <header>
            <b>Contato</b>
            <b>Origem</b>
            <b>Etapa</b>
            <b>Valor</b>
            <b>Próxima ação</b>
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
              <span>{lead.stage}</span>
              <strong>
                {lead.value ? currency.format(lead.value) : "A definir"}
              </strong>
              <span>{lead.nextAction}</span>
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
  useEffect(() => { try { const saved = localStorage.getItem("mensor-crm-messages-v1"); if (saved) setTemplates(JSON.parse(saved)); } catch {} }, []);
  const saveTemplates = (next: Array<{ id: string; title: string; text: string }>) => { setTemplates(next); localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(next)); };
  const addTemplate = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !message.trim()) return; saveTemplates(editingMessage ? templates.map((item) => item.id === editingMessage ? { ...item, title: title.trim(), text: message.trim() } : item) : [{ id: String(Date.now()), title: title.trim(), text: message.trim() }, ...templates]); setTitle(""); setMessage(""); setEditingMessage(null); setAddingMessage(false); };
  const copyTemplate = async (id: string, text: string) => { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); };
  const addProduct = () => { setProductDraft({ name: "", gross: "", net: "" }); setEditingProduct("new"); };
  const addSource = () => { setSourceDraft(""); setEditingSource("new"); };
  const editProduct = (product: ProductDefinition) => { setProductDraft({ name: product.name, gross: String(product.price), net: String(product.netPrice ?? product.price) }); setEditingProduct(product); };
  const editSource = (source: string) => { setSourceDraft(source); setEditingSource(source); };
  const submitProduct = (event: React.FormEvent) => { event.preventDefault(); const name = productDraft.name.trim(); if (!name) return; const next = { name, price: Number(productDraft.gross)||0, netPrice: Number(productDraft.net)||0 }; if (editingProduct === "new") saveProducts([...products,next]); else if (editingProduct) renameProduct(editingProduct.name,next); setEditingProduct(null); };
  const submitSource = (event: React.FormEvent) => { event.preventDefault(); const name = sourceDraft.trim(); if (!name) return; if (editingSource === "new") saveSources([...sources,name]); else if (editingSource) renameSource(editingSource,name); setEditingSource(null); };
  const editTemplate = (template: { id: string; title: string; text: string }) => { setTitle(template.title); setMessage(template.text); setEditingMessage(template.id); setAddingMessage(true); };
  return (
    <div className={`${styles.content} ${styles.detailsPage}`}>
      <header className={styles.detailsIntro}><span>Configurações do CRM</span><h2>Cadastros e recursos da operação</h2><p>Gerencie os registros utilizados na pipeline, nos filtros e nas métricas.</p></header>
      <div className={styles.detailCatalogs}>
        <section className={styles.detailCatalog}><header><div><span>Catálogo</span><h3>Produtos</h3></div><button onClick={addProduct}>+ Produto</button></header><div>{products.map((product) => <article key={product.name}><div><b>{product.name}</b><small>Taxas: {currency.format(Math.max(0, product.price - (product.netPrice ?? product.price)))}</small></div><div className={styles.productValues}><span>Bruto <b>{currency.format(product.price)}</b></span><span>Líquido <b>{currency.format(product.netPrice ?? product.price)}</b></span></div><div className={styles.catalogActions}><button onClick={() => editProduct(product)}>Editar</button><button onClick={() => saveProducts(products.filter((item) => item.name !== product.name))} aria-label={`Excluir ${product.name}`}>×</button></div></article>)}</div></section>
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

function LeadModal({
  products,
  sources,
  close,
  save,
}: {
  products: ProductDefinition[];
  sources: string[];
  close: () => void;
  save: (lead: Lead) => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: "Formulário",
    product: products[0]?.name || "",
    temperature: "Morno" as Lead["temperature"],
    nextAction: "Fazer primeiro contato",
  });
  return (
    <div className={styles.backdrop} onMouseDown={close}>
      <form
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          save({
            ...draft,
            id: String(Date.now()),
            stage: "Novo lead",
            value: 0,
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
              {products.map((product) => <option key={product.name} value={product.name}>{product.name} — {currency.format(product.price)}</option>)}
            </select>
          </label>
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
          <Input
            label="Próxima ação"
            value={draft.nextAction}
            set={(nextAction) => setDraft({ ...draft, nextAction })}
          />
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
  close,
  move,
  update,
}: {
  lead: Lead;
  products: ProductDefinition[];
  sources: string[];
  close: () => void;
  move: (stage: Stage) => void;
  update: (changes: Partial<Lead>) => void;
}) {
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
        </header>
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
            <select value={lead.product || "Não informado"} onChange={(event) => update({ product: event.target.value })}>
              <option value="Não informado">Não informado</option>
              {products.map((product) => <option key={product.name} value={product.name}>{product.name} — {currency.format(product.price)}</option>)}
            </select>
          </label>
          <p>
            <span>
              {lead.stage === "Fechado"
                ? "Valor recebido"
                : lead.stage === "Proposta"
                  ? "Valor da proposta"
                  : "Valor"}
            </span>
            <b>
              {lead.value
                ? currency.format(lead.value)
                : "Definido ao enviar proposta"}
            </b>
          </p>
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
        <section>
          <small>Próxima ação</small>
          <div className={styles.nextAction}>
            <b>{lead.nextAction}</b>
            <span>{lead.date}</span>
          </div>
        </section>
        <section>
          <small>Histórico de datas</small>
          <div className={styles.leadTimeline}>
            <p><span>Lead gerado</span><b>{formatEventDate(lead.createdAt)}</b></p>
            <p><span>Conversa iniciada</span><b>{formatEventDate(lead.conversationAt)}</b></p>
            <p><span>Reunião agendada</span><b>{formatEventDate(lead.meetingAt)}</b></p>
            <p><span>Proposta enviada</span><b>{formatEventDate(lead.proposalAt)}</b></p>
            <p><span>Fechamento</span><b>{formatEventDate(lead.closedAt)}</b></p>
          </div>
        </section>
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
    return { key, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""), leads: items.length, closedValue: leads.filter((lead) => inMonth(lead.closedAt, key)).reduce((sum, lead) => sum + lead.value, 0), goal: goals[key] || 0 };
  });
  const maxValue = Math.max(1, ...months.flatMap((item) => [item.closedValue, item.goal]));
  const maxLeads = Math.max(1, ...months.map((item) => item.leads));
  const leadPoints = months.map((item, index) => ({ x: index * 100 + 50, y: 215 - item.leads / maxLeads * 180, value: item.leads }));
  const leadPath = leadPoints.reduce((path, point, index) => { if (!index) return `M 0 ${point.y} L ${point.x} ${point.y}`; const previous = leadPoints[index - 1]; const middle = (previous.x + point.x) / 2; return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`; }, "") + (leadPoints.length ? ` L ${months.length * 100} ${leadPoints.at(-1)!.y}` : "");
  const areaPath = leadPoints.length ? `${leadPath} L ${months.length * 100} 230 L 0 230 Z` : "";
  const valueTicks = [maxValue, maxValue * .75, maxValue * .5, maxValue * .25, 0];
  const leadTicks = [maxLeads, Math.round(maxLeads * .75), Math.round(maxLeads * .5), Math.round(maxLeads * .25), 0];
  const saveGoal = (value: string) => setGoal(endMonth, Number(value) || 0);
  return <section className={`${styles.panel} ${styles.monthlyChart}`}><header><div><span>Performance mensal</span><h3>Valor fechado × meta</h3><p>Colunas financeiras por mês e evolução dos leads gerados.</p></div><div className={styles.chartLegend}><span><i className={styles.goalLegend} />Meta</span><span><i className={styles.closedLegend} />Valor fechado</span><span><i className={styles.leadLegend} />Leads gerados</span></div></header><div className={styles.goalControl}><div><span>Meta do mês selecionado</span><small>{endMonth.split("-").reverse().join("/")}</small></div><label>R$<input type="number" min="0" step="100" value={goals[endMonth] || ""} onChange={(event) => saveGoal(event.target.value)} placeholder="Definir meta" /></label></div><div className={styles.comboChart}><div className={styles.valueAxis}>{valueTicks.map((tick, index) => <span key={index}>{tick >= 1000 ? `R$ ${(tick / 1000).toFixed(tick % 1000 ? 1 : 0)}k` : currency.format(tick)}</span>)}</div><div className={styles.comboScroller}><div className={styles.comboPlot} style={{ gridTemplateColumns: `repeat(${months.length}, 150px)`, width: `${Math.max(360, months.length * 150)}px` }}><svg viewBox={`0 0 ${months.length * 100} 240`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lead-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62c7f2" stopOpacity=".16" /><stop offset="1" stopColor="#62c7f2" stopOpacity="0" /></linearGradient></defs><path className={styles.leadArea} d={areaPath} /><path className={styles.leadCurve} d={leadPath} /></svg>{leadPoints.map((point,index) => <span key={months[index].key} className={styles.leadPoint} style={{ left: `${(index + .5) / months.length * 100}%`, top: `${point.y / 240 * 100}%` }}><b>{point.value}</b></span>)}{months.map((item) => <article key={item.key}><div><span className={styles.goalBar} style={{ height: `${item.goal / maxValue * 100}%` }}><b>{item.goal ? currency.format(item.goal) : ""}</b></span><span className={styles.closedBar} style={{ height: `${item.closedValue / maxValue * 100}%` }}><b>{item.closedValue ? currency.format(item.closedValue) : ""}</b></span></div><strong>{item.label}</strong><small>{item.key.slice(0,4)}</small></article>)}</div></div><div className={styles.leadAxis}>{leadTicks.map((tick,index) => <span key={index}>{tick}</span>)}</div></div></section>;
}
function PeriodFilter({ start, end, setRange }: { start: string; end: string; setRange: (start: string, end: string) => void }) {
  return <section className={styles.periodFilter}><span>Filtro</span><label><small>Início</small><input type="date" value={start} max={end} onChange={(event) => event.target.value && setRange(event.target.value, end)} /></label><label><small>Final</small><input type="date" value={end} min={start} onChange={(event) => event.target.value && setRange(start, event.target.value)} /></label></section>;
}
function ProductValueChart({ leads, start, end, products }: { leads: Lead[]; start: string; end: string; products: ProductDefinition[] }) {
  const productNames = Array.from(new Set([...products.map((product) => product.name), ...leads.map((lead) => lead.product || "Não informado")])).filter((product) => product !== "Não informado");
  const productData = productNames.map((product) => { const items = leads.filter((lead) => lead.product === product); const closed = items.filter((lead) => inRange(lead.closedAt, start, end)); const value = closed.reduce((sum, lead) => sum + lead.value, 0); return { product, value, net: closed.reduce((sum, lead) => sum + netForValue(lead.value, lead.product, products), 0), sales: closed.length, proposals: items.filter((lead) => inRange(lead.proposalAt, start, end)).length }; }).sort((a,b) => b.value - a.value);
  const total = productData.reduce((sum, product) => sum + product.value, 0);
  const colors = ["#2bc48a", "#5aaee8", "#a986e8", "#d6a752", "#e47882"];
  return <section className={`${styles.panel} ${styles.productChart}`}><header><div><span>Receita por produto</span><h3>Composição do valor fechado</h3><p>Atualizado pelos produtos marcados como fechados na pipeline.</p></div><strong>{currency.format(total)}<small>valor bruto total</small></strong></header><div className={styles.productStack}>{productData.map((item,index) => <i key={item.product} style={{ width: `${total ? item.value / total * 100 : 100 / Math.max(productData.length,1)}%`, background: colors[index % colors.length] }} />)}</div><div className={styles.productList}>{productData.map((item,index) => <article key={item.product}><i style={{ background: colors[index % colors.length] }} /><div><b>{item.product}</b><small>{item.sales} fechamentos · líquido {currency.format(item.net)}</small></div><strong>{currency.format(item.value)}</strong><em>{total ? (item.value / total * 100).toFixed(1) : "0.0"}%</em></article>)}</div></section>;
}
function OriginValueChart({ leads, start, end, sources }: { leads: Lead[]; start: string; end: string; sources: string[] }) {
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const origins = sources.map((source) => { const items = leads.filter((lead) => lead.source === source); const closedItems = items.filter((lead) => inRange(lead.closedAt, start, end)); return { source, leads: items.filter((lead) => inRange(lead.createdAt, start, end)).length, conversations: items.filter((lead) => inRange(lead.conversationAt, start, end)).length, proposals: items.filter((lead) => inRange(lead.proposalAt, start, end)).length, closed: closedItems.length, value: closedItems.reduce((sum, lead) => sum + lead.value, 0) }; }).sort((a,b) => b.value - a.value || b.leads - a.leads);
  const maximum = Math.max(1, ...origins.map((origin) => origin.value));
  const selected = origins.find((origin) => origin.source === selectedOrigin);
  return <section className={styles.originAnalysis}><header><div><span>Receita por origem</span><h4>Valor fechado × origem do lead</h4></div><small>Clique em uma barra para ver os detalhes</small></header><div className={styles.originBars}>{origins.map((origin) => <button key={origin.source} onClick={() => setSelectedOrigin(origin.source)}><span>{origin.source}</span><div><i style={{ width: `${origin.value ? Math.max(7, origin.value / maximum * 100) : 2}%` }} /></div><strong>{currency.format(origin.value)}</strong></button>)}</div>{selected && <div className={styles.backdrop} onMouseDown={() => setSelectedOrigin(null)}><section className={styles.originDetail} onMouseDown={(event) => event.stopPropagation()}><header><div><span>Análise da origem</span><h2>{selected.source}</h2></div><button onClick={() => setSelectedOrigin(null)}>×</button></header><strong>{currency.format(selected.value)}<small>valor final fechado</small></strong><div><article><span>Leads</span><b>{selected.leads}</b></article><article><span>Conversas</span><b>{selected.conversations}</b></article><article><span>Propostas</span><b>{selected.proposals}</b></article><article><span>Fechamentos</span><b>{selected.closed}</b></article></div><footer><span>Conversão final</span><b>{selected.leads ? (selected.closed / selected.leads * 100).toFixed(1) : "0.0"}%</b></footer></section></div>}</section>;
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
          <strong>{currency.format(stats.openValue)}</strong>
          <small>Montante disponível no pipeline</small>
        </article>
        <article>
          <span>Valor final fechado</span>
          <strong>{currency.format(stats.wonValue)}</strong>
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
  value: string;
  detail: string;
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
