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

const initialMetrics: Metrics = {
  investment: 12500, impressions: 185000, clicks: 6200, visitors: 4100,
  checkouts: 480, leads: 1450, tickets: 320, attendees: 176,
  pitch: 132, sales: 40, frontRevenue: 16000, backendRevenue: 47880,
  netRate: 90, productPrice: 1197,
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("pt-BR");
const pct = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : "0,0"}%`;
const safeDiv = (a: number, b: number) => b > 0 ? a / b : 0;

type Tab = "visao" | "funil" | "comparativo" | "projecoes" | "criativos";

export default function MarketingDashboard() {
  const [tab, setTab] = useState<Tab>("visao");
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [editing, setEditing] = useState(false);
  const [goal, setGoal] = useState(100000);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mensor-marketing-metrics-v1");
      if (saved) setMetrics({ ...initialMetrics, ...JSON.parse(saved) });
    } catch { /* mantém os dados iniciais se o armazenamento estiver inválido */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("mensor-marketing-metrics-v1", JSON.stringify(metrics));
  }, [metrics, loaded]);

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
    setMetrics((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));

  const nav: Array<[Tab, string, string]> = [
    ["visao", "Visão geral", "⌂"], ["funil", "Funil", "⌄"],
    ["comparativo", "Comparativo", "⇄"], ["projecoes", "Metas e projeções", "◎"],
    ["criativos", "Criativos", "✦"],
  ];

  return (
    <main className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}><span>MT</span><div><b>Mensor</b><small>Intelligence</small></div></div>
        <nav>{nav.map(([id, label, icon]) => <button key={id} className={tab === id ? styles.active : ""} onClick={() => setTab(id)}><i>{icon}</i>{label}</button>)}</nav>
        <div className={styles.sideProject}><small>Projeto ativo</small><b>Diego Mensor</b><span><i /> Em andamento</span></div>
        <form action={sairDashboard}><button className={styles.logout}>Sair da conta</button></form>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div><p>Projeto / Diego Mensor</p><h1>{nav.find(([id]) => id === tab)?.[1]}</h1></div>
          <div className={styles.topActions}><span>Atualizado agora</span><button onClick={() => setEditing(true)}>+ Atualizar dados</button></div>
        </header>

        {tab === "visao" && <Overview metrics={metrics} calc={calc} setTab={setTab} />}
        {tab === "funil" && <Funnel metrics={metrics} />}
        {tab === "comparativo" && <Comparison />}
        {tab === "projecoes" && <Projections metrics={metrics} calc={calc} goal={goal} setGoal={setGoal} />}
        {tab === "criativos" && <Creatives />}
      </section>

      {editing && <Editor metrics={metrics} setMetric={setMetric} close={() => setEditing(false)} reset={() => setMetrics(initialMetrics)} />}
    </main>
  );
}

function Overview({ metrics, calc, setTab }: { metrics: Metrics; calc: ReturnType<typeof calculateShape>; setTab: (tab: Tab) => void }) {
  const cards = [
    ["Receita total", money.format(calc.gross), "+18,4%", "Receita"],
    ["Investimento", money.format(metrics.investment), "Mídia paga", "Tráfego"],
    ["Lucro líquido", money.format(calc.profit), pct(calc.margin), "Resultado"],
    ["ROAS", `${calc.roas.toFixed(2)}x`, `${pct(calc.roi)} ROI`, "Eficiência"],
  ];
  return <div className={styles.content}>
    <div className={styles.context}><div><span>Lançamento ativo</span><b>Imersão Destrave — Agosto/2026</b></div><button>Trocar campanha⌄</button></div>
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
  const fields: Array<[keyof Metrics, string]> = [["investment", "Investimento"], ["impressions", "Impressões"], ["clicks", "Cliques"], ["visitors", "Visitantes"], ["checkouts", "Checkouts"], ["leads", "Leads"], ["tickets", "Ingressos"], ["attendees", "Presentes"], ["pitch", "Pessoas no pitch"], ["sales", "Vendas"], ["frontRevenue", "Receita front-end"], ["backendRevenue", "Receita produto principal"], ["netRate", "Percentual líquido"], ["productPrice", "Preço do produto"]];
  return <div className={styles.modalBackdrop} onMouseDown={close}><section className={styles.editor} onMouseDown={(e) => e.stopPropagation()}><header><div><span>Campanha ativa</span><h2>Atualizar dados</h2></div><button onClick={close}>×</button></header><div className={styles.formGrid}>{fields.map(([key, label]) => <label key={key}><span>{label}</span><input type="number" value={metrics[key]} onChange={(e) => setMetric(key, e.target.value)} /></label>)}</div><footer><button onClick={reset}>Restaurar exemplo</button><button onClick={close}>Salvar alterações</button></footer></section></div>;
}

function PanelHead({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className={styles.panelHead}><span>{eyebrow}</span><h3>{title}</h3></header>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><b>{value}</b></div>; }

