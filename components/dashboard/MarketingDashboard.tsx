"use client";

import { useEffect, useMemo, useState } from "react";
import { sairDashboard } from "@/app/dashboard/actions";
import styles from "./dashboard.module.css";

type Metrics = {
  investment: number; impressions: number; clicks: number; visitors: number;
  checkouts: number; leads: number; tickets: number; attendees: number;
  pitch: number; sales: number; frontRevenue: number; backendRevenue: number;
  netRate: number; productPrice: number;
};

type Launch = {
  id: string; name: string; period: string; strategy: string; status: string;
  frontProduct: string; mainProduct: string; metrics: Metrics;
};

const initialMetrics: Metrics = {
  investment: 12500, impressions: 185000, clicks: 6200, visitors: 4100,
  checkouts: 480, leads: 1450, tickets: 320, attendees: 176,
  pitch: 132, sales: 40, frontRevenue: 16000, backendRevenue: 47880,
  netRate: 90, productPrice: 1197,
};

const initialLaunches: Launch[] = [
  { id: "destrave-ago-2026", name: "Imersão Destrave", period: "Agosto/2026", strategy: "Lançamento", status: "Em andamento", frontProduct: "Imersão Destrave", mainProduct: "Oficina de Alta Performance", metrics: initialMetrics },
  { id: "destrave-jun-2026", name: "Imersão Destrave", period: "Junho/2026", strategy: "Lançamento", status: "Concluído", frontProduct: "Imersão Destrave", mainProduct: "Oficina de Alta Performance", metrics: { ...initialMetrics, investment: 10800, tickets: 284, attendees: 141, pitch: 105, sales: 26, frontRevenue: 13720, backendRevenue: 35700 } },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");
const pct = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : "0,0"}%`;
const safeDiv = (a: number, b: number) => b > 0 ? a / b : 0;

type Tab = "visao" | "lancamentos" | "funil" | "comparativo" | "projecoes" | "criativos";

export default function MarketingDashboard() {
  const [tab, setTab] = useState<Tab>("visao");
  const [launches, setLaunches] = useState<Launch[]>(initialLaunches);
  const [selectedLaunchId, setSelectedLaunchId] = useState(initialLaunches[0].id);
  const [launchDetailId, setLaunchDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(100000);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mensor-marketing-launches-v2");
      if (saved) setLaunches(JSON.parse(saved));
    } catch { /* mantém os dados iniciais se o armazenamento estiver inválido */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("mensor-marketing-launches-v2", JSON.stringify(launches));
  }, [launches, loaded]);

  const selectedLaunch = launches.find((launch) => launch.id === selectedLaunchId) ?? launches[0];
  const metrics = selectedLaunch.metrics;

  const calc = useMemo(() => {
    const gross = metrics.frontRevenue + metrics.backendRevenue;
    const net = gross * (metrics.netRate / 100);
    const profit = net - metrics.investment;
    return {
      gross, net, profit,
      margin: safeDiv(profit, net) * 100,
      roas: safeDiv(gross, metrics.investment),
      roi: safeDiv(profit, metrics.investment) * 100,
      cpl: safeDiv(metrics.investment, metrics.leads),
      cpa: safeDiv(metrics.investment, metrics.tickets),
      avgTicket: safeDiv(gross, metrics.tickets),
      attendance: safeDiv(metrics.attendees, metrics.tickets) * 100,
      retention: safeDiv(metrics.pitch, metrics.attendees) * 100,
      pitchConversion: safeDiv(metrics.sales, metrics.pitch) * 100,
    };
  }, [metrics]);

  const setMetric = (key: keyof Metrics, value: string) =>
    setLaunches((current) => current.map((launch) => launch.id === selectedLaunchId ? { ...launch, metrics: { ...launch.metrics, [key]: Math.max(0, Number(value) || 0) } } : launch));

  const updateLaunch = (id: string, key: keyof Omit<Launch, "id" | "metrics">, value: string) =>
    setLaunches((current) => current.map((launch) => launch.id === id ? { ...launch, [key]: value } : launch));

  const createLaunch = (data: Omit<Launch, "id" | "metrics">) => {
    const launch: Launch = { ...data, id: `launch-${Date.now()}`, metrics: { ...initialMetrics, investment: 0, impressions: 0, clicks: 0, visitors: 0, checkouts: 0, leads: 0, tickets: 0, attendees: 0, pitch: 0, sales: 0, frontRevenue: 0, backendRevenue: 0 } };
    setLaunches((current) => [launch, ...current]);
    setSelectedLaunchId(launch.id);
    setLaunchDetailId(launch.id);
  };

  const nav: Array<[Tab, string, string]> = [
    ["visao", "Tela principal", "⌂"], ["lancamentos", "Lançamentos", "▤"], ["funil", "Funil", "⌄"],
    ["comparativo", "Comparativo", "⇄"], ["projecoes", "Metas e projeções", "◎"],
    ["criativos", "Criativos", "✦"],
  ];

  return (
    <main className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span>MT</span><div><b>Mensor</b><small>Intelligence</small></div></div>
        <nav>{nav.map(([id, label, icon]) => <button key={id} className={tab === id ? styles.active : ""} onClick={() => { if (id === "lancamentos") setLaunchDetailId(null); setTab(id); }}><i>{icon}</i>{label}</button>)}</nav>
        <div className={styles.sideProject}><small>Projeto ativo</small><b>Diego Mensor</b><span><i /> Em andamento</span></div>
        <form action={sairDashboard}><button className={styles.logout}>Sair da conta</button></form>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><p>Projeto / Diego Mensor{tab === "lancamentos" && launchDetailId ? ` / ${selectedLaunch.name} — ${selectedLaunch.period}` : ""}</p><h1>{nav.find(([id]) => id === tab)?.[1]}</h1></div>
          <div className={styles.topActions}><span>Atualizado agora</span>{tab !== "lancamentos" && <button onClick={() => setEditing(true)}>+ Atualizar dados</button>}</div>
        </header>

        {tab === "visao" && <Overview launch={selectedLaunch} metrics={metrics} calc={calc} openLaunches={() => { setLaunchDetailId(null); setTab("lancamentos"); }} setTab={setTab} />}
        {tab === "lancamentos" && <Launches launches={launches} detailId={launchDetailId} select={(id) => { setSelectedLaunchId(id); setLaunchDetailId(id); }} back={() => setLaunchDetailId(null)} create={createLaunch} updateLaunch={updateLaunch} setMetric={setMetric} />}
        {tab === "funil" && <Funnel metrics={metrics} />}
        {tab === "comparativo" && <Comparison />}
        {tab === "projecoes" && <Projections metrics={metrics} calc={calc} goal={goal} setGoal={setGoal} />}
        {tab === "criativos" && <Creatives />}
      </section>

      {editing && <Editor metrics={metrics} setMetric={setMetric} close={() => setEditing(false)} reset={() => setLaunches((current) => current.map((launch) => launch.id === selectedLaunchId ? { ...launch, metrics: initialMetrics } : launch))} />}
    </main>
  );
}

function Overview({ launch, metrics, calc, openLaunches, setTab }: { launch: Launch; metrics: Metrics; calc: ReturnType<typeof calculateShape>; openLaunches: () => void; setTab: (tab: Tab) => void }) {
  const cards = [
    ["Receita total", money.format(calc.gross), "+18,4%", "Receita"],
    ["Investimento", money.format(metrics.investment), "Mídia paga", "Tráfego"],
    ["Lucro líquido", money.format(calc.profit), pct(calc.margin), "Resultado"],
    ["ROAS", `${calc.roas.toFixed(2)}x`, `${pct(calc.roi)} ROI`, "Eficiência"],
  ];
  return <div className={styles.content}>
    <div className={styles.context}><div><span>Lançamento ativo</span><b>{launch.name} — {launch.period}</b></div><button onClick={openLaunches}>Ver lançamentos →</button></div>
    <div className={styles.kpiGrid}>{cards.map(([label, value, detail, eyebrow]) => <article className={styles.kpi} key={label}><small>{eyebrow}</small><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>)}</div>
    <div className={styles.twoColumns}>
      <article className={styles.panel}><PanelHead eyebrow="Aquisição" title="Eficiência da campanha" /><div className={styles.metricRows}>
        <Metric label="Leads" value={number.format(metrics.leads)} /><Metric label="Compradores" value={number.format(metrics.tickets)} />
        <Metric label="CPL" value={money.format(calc.cpl)} /><Metric label="CPA" value={money.format(calc.cpa)} />
        <Metric label="Ticket médio" value={money.format(calc.avgTicket)} /><Metric label="Comparecimento" value={pct(calc.attendance)} />
      </div></article>
      <article className={`${styles.panel} ${styles.diagnosis}`}><PanelHead eyebrow="Diagnóstico automático" title="O que merece atenção" />
        <div className={styles.insight}><i className={styles.good}>↑</i><div><b>Front-end saudável</b><p>A receita de entrada cobre o investimento e cria margem para escalar.</p></div></div>
        <div className={styles.insight}><i className={styles.warn}>!</i><div><b>Comparecimento em {pct(calc.attendance)}</b><p>Este é o maior vazamento atual. Melhorar confirmação e lembretes aumenta o público no pitch.</p></div></div>
        <button onClick={() => setTab("funil")}>Ver análise completa →</button>
      </article>
    </div>
    <article className={styles.panel}><PanelHead eyebrow="Receita" title="Composição do faturamento" /><div className={styles.revenueBar}><span style={{ width: `${safeDiv(metrics.frontRevenue, calc.gross) * 100}%` }} /><i /></div><div className={styles.legend}><span><i className={styles.front} />Front-end <b>{money.format(metrics.frontRevenue)}</b></span><span><i className={styles.back} />Produto principal <b>{money.format(metrics.backendRevenue)}</b></span><strong>Total líquido: {money.format(calc.net)}</strong></div></article>
  </div>;
}

function Launches({ launches, detailId, select, back, create, updateLaunch, setMetric }: {
  launches: Launch[]; detailId: string | null; select: (id: string) => void; back: () => void;
  create: (data: Omit<Launch, "id" | "metrics">) => void;
  updateLaunch: (id: string, key: keyof Omit<Launch, "id" | "metrics">, value: string) => void;
  setMetric: (key: keyof Metrics, value: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", period: "", strategy: "Lançamento", status: "Planejamento", frontProduct: "", mainProduct: "" });
  const launch = launches.find((item) => item.id === detailId);

  if (launch) return <div className={styles.content}>
    <div className={styles.launchBreadcrumb}><button onClick={back}>← Todos os lançamentos</button><span>Cadastro do lançamento</span></div>
    <div className={styles.pageIntro}><span>Lançamento específico</span><h2>{launch.name} — {launch.period}</h2><p>Dados cadastrais e métricas próprias desta campanha.</p></div>
    <article className={styles.launchSection}><header><div><span>01</span><h3>Cadastro do lançamento</h3></div><small>Informações gerais</small></header><div className={styles.launchForm}>
      <label><span>Nome do lançamento</span><input value={launch.name} onChange={(e) => updateLaunch(launch.id, "name", e.target.value)} /></label>
      <label><span>Período</span><input value={launch.period} onChange={(e) => updateLaunch(launch.id, "period", e.target.value)} /></label>
      <label><span>Estratégia</span><input value={launch.strategy} onChange={(e) => updateLaunch(launch.id, "strategy", e.target.value)} /></label>
      <label><span>Status</span><select value={launch.status} onChange={(e) => updateLaunch(launch.id, "status", e.target.value)}><option>Planejamento</option><option>Em andamento</option><option>Concluído</option></select></label>
      <label><span>Produto de entrada</span><input value={launch.frontProduct} onChange={(e) => updateLaunch(launch.id, "frontProduct", e.target.value)} /></label>
      <label><span>Produto principal</span><input value={launch.mainProduct} onChange={(e) => updateLaunch(launch.id, "mainProduct", e.target.value)} /></label>
    </div></article>
    <article className={styles.launchSection}><header><div><span>02</span><h3>Métricas do lançamento</h3></div><small>Os indicadores são calculados automaticamente</small></header><div className={styles.metricsGroups}>
      <MetricGroup title="Aquisição" keys={["investment", "impressions", "clicks", "visitors", "leads"]} metrics={launch.metrics} setMetric={setMetric} />
      <MetricGroup title="Funil e evento" keys={["checkouts", "tickets", "attendees", "pitch", "sales"]} metrics={launch.metrics} setMetric={setMetric} />
      <MetricGroup title="Receita" keys={["frontRevenue", "backendRevenue", "netRate", "productPrice"]} metrics={launch.metrics} setMetric={setMetric} />
    </div></article>
  </div>;

  return <div className={styles.content}>
    <div className={styles.launchesHeader}><div className={styles.pageIntro}><span>Histórico do projeto</span><h2>Lançamentos</h2><p>Cadastre cada campanha separadamente para construir histórico e comparar sua evolução.</p></div><button onClick={() => setCreating((value) => !value)}>+ Novo lançamento</button></div>
    {creating && <form className={styles.newLaunch} onSubmit={(event) => { event.preventDefault(); if (!draft.name || !draft.period) return; create(draft); setCreating(false); }}><header><h3>Cadastrar lançamento</h3><button type="button" onClick={() => setCreating(false)}>×</button></header><div className={styles.launchForm}>
      <label><span>Nome do lançamento</span><input required placeholder="Ex.: Imersão Destrave" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
      <label><span>Período</span><input required placeholder="Ex.: Outubro/2026" value={draft.period} onChange={(e) => setDraft({ ...draft, period: e.target.value })} /></label>
      <label><span>Estratégia</span><input value={draft.strategy} onChange={(e) => setDraft({ ...draft, strategy: e.target.value })} /></label>
      <label><span>Status</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option>Planejamento</option><option>Em andamento</option><option>Concluído</option></select></label>
      <label><span>Produto de entrada</span><input value={draft.frontProduct} onChange={(e) => setDraft({ ...draft, frontProduct: e.target.value })} /></label>
      <label><span>Produto principal</span><input value={draft.mainProduct} onChange={(e) => setDraft({ ...draft, mainProduct: e.target.value })} /></label>
    </div><button type="submit">Criar e adicionar métricas →</button></form>}
    <div className={styles.launchGrid}>{launches.map((item) => { const result = calculateShape(item.metrics); return <article key={item.id} onClick={() => select(item.id)}><header><span>{item.status}</span><i>→</i></header><small>{item.strategy} · {item.period}</small><h3>{item.name}</h3><p>{item.frontProduct} → {item.mainProduct}</p><div><span>Receita <b>{money.format(result.gross)}</b></span><span>ROAS <b>{result.roas.toFixed(2)}x</b></span><span>Vendas <b>{item.metrics.sales}</b></span></div><button>Abrir lançamento</button></article>; })}</div>
  </div>;
}

const metricLabels: Record<keyof Metrics, string> = {
  investment: "Investimento", impressions: "Impressões", clicks: "Cliques", visitors: "Visitantes", checkouts: "Checkouts", leads: "Leads", tickets: "Ingressos", attendees: "Presentes", pitch: "Pessoas no pitch", sales: "Vendas", frontRevenue: "Receita front-end", backendRevenue: "Receita produto principal", netRate: "Percentual líquido", productPrice: "Preço do produto",
};

function MetricGroup({ title, keys, metrics, setMetric }: { title: string; keys: Array<keyof Metrics>; metrics: Metrics; setMetric: (key: keyof Metrics, value: string) => void }) {
  return <section><h4>{title}</h4><div>{keys.map((key) => <label key={key}><span>{metricLabels[key]}</span><input type="number" value={metrics[key]} onChange={(e) => setMetric(key, e.target.value)} /></label>)}</div></section>;
}

function calculateShape(metrics: Metrics) {
  const gross = metrics.frontRevenue + metrics.backendRevenue;
  const net = gross * metrics.netRate / 100;
  const profit = net - metrics.investment;
  return { gross, net, profit, margin: safeDiv(profit, net) * 100, roas: safeDiv(gross, metrics.investment), roi: safeDiv(profit, metrics.investment) * 100, cpl: safeDiv(metrics.investment, metrics.leads), cpa: safeDiv(metrics.investment, metrics.tickets), avgTicket: safeDiv(gross, metrics.tickets), attendance: safeDiv(metrics.attendees, metrics.tickets) * 100, retention: safeDiv(metrics.pitch, metrics.attendees) * 100, pitchConversion: safeDiv(metrics.sales, metrics.pitch) * 100 };
}

function Funnel({ metrics }: { metrics: Metrics }) {
  const steps = [["Impressões", metrics.impressions], ["Cliques", metrics.clicks], ["Visitantes", metrics.visitors], ["Checkouts", metrics.checkouts], ["Ingressos", metrics.tickets], ["Presentes", metrics.attendees], ["Chegaram ao pitch", metrics.pitch], ["Vendas", metrics.sales]] as const;
  return <div className={styles.content}><div className={styles.pageIntro}><span>Jornada completa</span><h2>Funil do lançamento</h2><p>Acompanhe a conversão entre cada etapa e encontre onde a campanha perde mais pessoas.</p></div><div className={styles.funnel}>
    {steps.map(([label, value], index) => { const previous = index ? steps[index - 1][1] : value; const conversion = safeDiv(value, previous) * 100; const worst = index > 0 && conversion === Math.min(...steps.slice(1).map((step, i) => safeDiv(step[1], steps[i][1]) * 100)); return <article key={label} style={{ width: `${100 - index * 6}%` }} className={worst ? styles.leak : ""}><div><span>{String(index + 1).padStart(2, "0")}</span><b>{label}</b></div><strong>{number.format(value)}</strong>{index > 0 && <small>{pct(conversion)} da etapa anterior</small>}</article>; })}
  </div></div>;
}

function Comparison() {
  const rows = [["Investimento", "R$ 12.500", "R$ 10.800", "+15,7%"], ["Ingressos", "320", "284", "+12,7%"], ["CPA", "R$ 39,06", "R$ 38,03", "+2,7%"], ["Comparecimento", "55,0%", "49,6%", "+10,9%"], ["Conversão do pitch", "30,3%", "24,8%", "+22,2%"], ["Receita total", "R$ 63.880", "R$ 49.420", "+29,3%"], ["ROAS", "5,11x", "4,58x", "+11,6%"]];
  return <div className={styles.content}><div className={styles.pageIntro}><span>Evolução</span><h2>Comparativo de lançamentos</h2><p>Veja o que melhorou e onde a operação perdeu eficiência.</p></div><article className={styles.comparison}><div className={styles.compareHead}><b>Métrica</b><span>Agosto/2026</span><span>Junho/2026</span><span>Variação</span></div>{rows.map(([label, current, previous, variation]) => <div key={label}><b>{label}</b><span>{current}</span><span>{previous}</span><strong>↑ {variation}</strong></div>)}</article></div>;
}

function Projections({ metrics, calc, goal, setGoal }: { metrics: Metrics; calc: ReturnType<typeof calculateShape>; goal: number; setGoal: (n: number) => void }) {
  const scenarios = [{ name: "Conservador", factor: 1.28 }, { name: "Realista", factor: 1 }, { name: "Otimista", factor: .78 }];
  return <div className={styles.content}><div className={styles.pageIntro}><span>Planejamento reverso</span><h2>Meta e projeção</h2><p>Transforme uma meta de faturamento no volume necessário em cada etapa.</p></div><label className={styles.goal}><span>Meta de faturamento</span><div>R$ <input type="number" value={goal} onChange={(e) => setGoal(Number(e.target.value) || 0)} /></div></label><div className={styles.scenarios}>{scenarios.map(({ name, factor }) => { const sales = Math.ceil(goal / metrics.productPrice); const pitch = Math.ceil(sales / Math.max(calc.pitchConversion / 100, .01) * factor); const attendees = Math.ceil(pitch / Math.max(calc.retention / 100, .01)); const tickets = Math.ceil(attendees / Math.max(calc.attendance / 100, .01)); return <article key={name}><span>{name}</span><strong>{number.format(tickets)}<small> ingressos</small></strong><div><p>Vendas necessárias <b>{sales}</b></p><p>Pessoas no pitch <b>{pitch}</b></p><p>Presentes <b>{attendees}</b></p><p>Tráfego estimado <b>{money.format(tickets * calc.cpa)}</b></p></div></article>; })}</div></div>;
}

function Creatives() {
  const rows = [["CR-018", "Precificação", "Reels", "R$ 31,20", "4,8x", "Escalar"], ["CR-014", "Sobrecarga", "Stories", "R$ 38,70", "3,9x", "Manter"], ["CR-021", "Gestão", "Estático", "R$ 44,10", "6,2x", "Valioso"], ["CR-009", "Equipe", "Carrossel", "R$ 52,80", "2,1x", "Revisar"]];
  return <div className={styles.content}><div className={styles.pageIntro}><span>Banco de criativos</span><h2>Inteligência por anúncio</h2><p>Analise quais mensagens trazem compradores mais valiosos, não apenas cliques baratos.</p></div><article className={styles.creativeTable}><div><b>Código</b><b>Ângulo</b><b>Formato</b><b>CPA</b><b>ROAS total</b><b>Status</b></div>{rows.map((row) => <div key={row[0]}>{row.map((cell, i) => i === 5 ? <strong key={cell}>{cell}</strong> : <span key={cell}>{cell}</span>)}</div>)}</article><div className={styles.patterns}><article><span>Melhor padrão</span><b>Gestão traz compradores de maior valor</b><p>Mesmo com CPA 14% maior, os criativos de gestão geram o melhor ROAS total.</p></article><article><span>Oportunidade</span><b>Precificação reduz o custo de aquisição</b><p>O ângulo apresenta o menor CPA e pode receber mais verba na próxima rodada.</p></article></div></div>;
}

function Editor({ metrics, setMetric, close, reset }: { metrics: Metrics; setMetric: (k: keyof Metrics, v: string) => void; close: () => void; reset: () => void }) {
  const fields = Object.entries(metricLabels) as Array<[keyof Metrics, string]>;
  return <div className={styles.modalBackdrop} onMouseDown={close}><section className={styles.editor} onMouseDown={(e) => e.stopPropagation()}><header><div><span>Campanha ativa</span><h2>Atualizar dados</h2></div><button onClick={close}>×</button></header><div className={styles.formGrid}>{fields.map(([key, label]) => <label key={key}><span>{label}</span><input type="number" value={metrics[key]} onChange={(e) => setMetric(key, e.target.value)} /></label>)}</div><footer><button onClick={reset}>Restaurar exemplo</button><button onClick={close}>Salvar alterações</button></footer></section></div>;
}

function PanelHead({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className={styles.panelHead}><span>{eyebrow}</span><h3>{title}</h3></header>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div>; }
