"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./crm.module.css";

type Stage = "Novo lead" | "Contato feito" | "Diagnóstico" | "Proposta" | "Fechado";
type View = "inicio" | "pipeline" | "contatos" | "tarefas";
type Lead = { id: string; name: string; company: string; phone: string; email: string; source: string; stage: Stage; value: number; temperature: "Quente" | "Morno" | "Frio"; nextAction: string; date: string };

const stages: Stage[] = ["Novo lead", "Contato feito", "Diagnóstico", "Proposta", "Fechado"];
const initialLeads: Lead[] = [
  { id: "1", name: "Rafael Martins", company: "RM Auto Center", phone: "(54) 99921-4301", email: "rafael@rmauto.com", source: "Formulário mentoria", stage: "Novo lead", value: 12000, temperature: "Quente", nextAction: "Fazer primeiro contato", date: "Hoje, 09:30" },
  { id: "2", name: "Marcelo Vieira", company: "Vieira Motors", phone: "(51) 99810-3210", email: "marcelo@vieiramotors.com", source: "Instagram", stage: "Novo lead", value: 8500, temperature: "Morno", nextAction: "Enviar mensagem", date: "Hoje, 11:15" },
  { id: "3", name: "Ana Paula Costa", company: "Costa Centro Automotivo", phone: "(11) 99744-8200", email: "ana@costacentro.com", source: "Indicação", stage: "Contato feito", value: 12000, temperature: "Quente", nextAction: "Agendar diagnóstico", date: "Amanhã, 10:00" },
  { id: "4", name: "Lucas Almeida", company: "Box 12 Garage", phone: "(47) 99102-5588", email: "lucas@box12.com", source: "Evento", stage: "Contato feito", value: 8500, temperature: "Morno", nextAction: "Retorno no WhatsApp", date: "12 ago, 14:00" },
  { id: "5", name: "Fernando Lima", company: "LimaCar", phone: "(48) 99913-2041", email: "fernando@limacar.com", source: "Formulário mentoria", stage: "Diagnóstico", value: 15000, temperature: "Quente", nextAction: "Reunião de diagnóstico", date: "Hoje, 16:30" },
  { id: "6", name: "Bruno Souza", company: "BS Performance", phone: "(19) 99670-1182", email: "bruno@bsperformance.com", source: "YouTube", stage: "Proposta", value: 12000, temperature: "Quente", nextAction: "Follow-up da proposta", date: "Amanhã, 09:00" },
  { id: "7", name: "Carla Mendes", company: "Mendes Auto Service", phone: "(21) 99781-3009", email: "carla@mendesauto.com", source: "Instagram", stage: "Proposta", value: 8500, temperature: "Morno", nextAction: "Validar decisor", date: "13 ago, 15:00" },
  { id: "8", name: "Eduardo Rocha", company: "Rocha Motors", phone: "(31) 99803-6615", email: "eduardo@rochamotors.com", source: "Indicação", stage: "Fechado", value: 12000, temperature: "Quente", nextAction: "Onboarding", date: "Concluído" },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function CRM() {
  const [view, setView] = useState<View>("inicio");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { try { const saved = localStorage.getItem("mensor-crm-v1"); if (saved) setLeads(JSON.parse(saved)); } catch {} setLoaded(true); }, []);
  useEffect(() => { if (loaded) localStorage.setItem("mensor-crm-v1", JSON.stringify(leads)); }, [leads, loaded]);

  const stats = useMemo(() => {
    const open = leads.filter((lead) => lead.stage !== "Fechado");
    const won = leads.filter((lead) => lead.stage === "Fechado");
    return { total: leads.length, openValue: open.reduce((sum, lead) => sum + lead.value, 0), wonValue: won.reduce((sum, lead) => sum + lead.value, 0), conversion: leads.length ? won.length / leads.length * 100 : 0, hot: leads.filter((lead) => lead.temperature === "Quente" && lead.stage !== "Fechado").length };
  }, [leads]);

  const filtered = leads.filter((lead) => `${lead.name} ${lead.company} ${lead.email}`.toLowerCase().includes(search.toLowerCase()));
  const moveLead = (id: string, stage: Stage) => setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, stage } : lead));
  const addLead = (lead: Lead) => { setLeads((current) => [lead, ...current]); setAdding(false); };

  const navigation: Array<[View, string, string]> = [["inicio", "Visão geral", "⌂"], ["pipeline", "Pipeline", "▦"], ["contatos", "Contatos", "◎"], ["tarefas", "Tarefas", "✓"]];
  return <main className={styles.crm}>
    <aside className={styles.sidebar}><div className={styles.logo}><span>MT</span><div><b>Mensor</b><small>CRM</small></div></div><nav>{navigation.map(([id, label, icon]) => <button key={id} className={view === id ? styles.active : ""} onClick={() => setView(id)}><i>{icon}</i><span>{label}</span></button>)}</nav><div className={styles.localNotice}><i>●</i><div><b>Modo local</b><span>Sem banco de dados</span></div></div></aside>
    <section className={styles.workspace}><header className={styles.topbar}><div><small>Mensor Treinamentos / Comercial</small><h1>{navigation.find(([id]) => id === view)?.[1]}</h1></div><div className={styles.topActions}><label><span>⌕</span><input placeholder="Buscar contato..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><button onClick={() => setAdding(true)}>+ Nova oportunidade</button></div></header>
      {view === "inicio" && <Dashboard leads={leads} stats={stats} openPipeline={() => setView("pipeline")} />}
      {view === "pipeline" && <Pipeline leads={filtered} moveLead={moveLead} select={setSelected} />}
      {view === "contatos" && <Contacts leads={filtered} select={setSelected} />}
      {view === "tarefas" && <Tasks leads={filtered.filter((lead) => lead.stage !== "Fechado")} select={setSelected} />}
    </section>
    {adding && <LeadModal close={() => setAdding(false)} save={addLead} />}
    {selected && <LeadDrawer lead={selected} close={() => setSelected(null)} move={(stage) => { moveLead(selected.id, stage); setSelected({ ...selected, stage }); }} />}
  </main>;
}

function Dashboard({ leads, stats, openPipeline }: { leads: Lead[]; stats: { total: number; openValue: number; wonValue: number; conversion: number; hot: number }; openPipeline: () => void }) {
  return <div className={styles.content}><section className={styles.welcome}><div><span>Resumo comercial</span><h2>Bom dia, Diego.</h2><p>Acompanhe as oportunidades que precisam da sua atenção hoje.</p></div><button onClick={openPipeline}>Abrir pipeline →</button></section><div className={styles.kpis}><Kpi label="Oportunidades" value={String(stats.total)} detail={`${stats.hot} leads quentes`} /><Kpi label="Pipeline aberto" value={currency.format(stats.openValue)} detail="Potencial em negociação" /><Kpi label="Receita fechada" value={currency.format(stats.wonValue)} detail="Neste ciclo" /><Kpi label="Conversão" value={`${stats.conversion.toFixed(1)}%`} detail="Lead para cliente" /></div><div className={styles.dashboardGrid}><section className={styles.panel}><PanelTitle eyebrow="Funil comercial" title="Distribuição das oportunidades" /><div className={styles.stageSummary}>{stages.map((stage) => { const items = leads.filter((lead) => lead.stage === stage); return <div key={stage}><span><i />{stage}</span><b>{items.length}</b><div><em style={{ width: `${Math.max(8, items.length / Math.max(leads.length, 1) * 100)}%` }} /></div><small>{currency.format(items.reduce((sum, lead) => sum + lead.value, 0))}</small></div>; })}</div></section><section className={styles.panel}><PanelTitle eyebrow="Agenda" title="Próximas ações" /><div className={styles.activity}>{leads.filter((lead) => lead.stage !== "Fechado").slice(0, 5).map((lead) => <article key={lead.id}><span>{lead.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><b>{lead.nextAction}</b><small>{lead.name} · {lead.company}</small></div><time>{lead.date}</time></article>)}</div></section></div></div>;
}

function Pipeline({ leads, moveLead, select }: { leads: Lead[]; moveLead: (id: string, stage: Stage) => void; select: (lead: Lead) => void }) {
  return <div className={styles.pipelineWrap}><div className={styles.pipeline}>{stages.map((stage) => { const items = leads.filter((lead) => lead.stage === stage); return <section key={stage} onDragOver={(event) => event.preventDefault()} onDrop={(event) => moveLead(event.dataTransfer.getData("leadId"), stage)}><header><div><i /><b>{stage}</b><span>{items.length}</span></div><small>{currency.format(items.reduce((sum, lead) => sum + lead.value, 0))}</small></header><div className={styles.cards}>{items.map((lead) => <article key={lead.id} draggable onDragStart={(event) => event.dataTransfer.setData("leadId", lead.id)} onClick={() => select(lead)}><div className={styles.cardTop}><span className={styles[lead.temperature.toLowerCase()]}>{lead.temperature}</span><i>•••</i></div><h3>{lead.name}</h3><p>{lead.company}</p><strong>{currency.format(lead.value)}</strong><footer><span>{lead.source}</span><small>{lead.nextAction}</small></footer></article>)}</div></section>; })}</div></div>;
}

function Contacts({ leads, select }: { leads: Lead[]; select: (lead: Lead) => void }) { return <div className={styles.content}><section className={styles.panel}><PanelTitle eyebrow="Base comercial" title={`${leads.length} contatos`} /><div className={styles.contactTable}><header><b>Contato</b><b>Origem</b><b>Etapa</b><b>Valor</b><b>Próxima ação</b></header>{leads.map((lead) => <button key={lead.id} onClick={() => select(lead)}><span><i>{lead.name.slice(0, 2).toUpperCase()}</i><span><b>{lead.name}</b><small>{lead.company} · {lead.phone}</small></span></span><span>{lead.source}</span><span>{lead.stage}</span><strong>{currency.format(lead.value)}</strong><span>{lead.nextAction}</span></button>)}</div></section></div>; }
function Tasks({ leads, select }: { leads: Lead[]; select: (lead: Lead) => void }) { return <div className={styles.content}><div className={styles.taskList}>{leads.map((lead, index) => <article key={lead.id}><button aria-label="Marcar como concluída" /><div><span>{index < 2 ? "Hoje" : "Próximos dias"}</span><h3>{lead.nextAction}</h3><p>{lead.name} · {lead.company}</p></div><time>{lead.date}</time><button onClick={() => select(lead)}>Ver contato →</button></article>)}</div></div>; }

function LeadModal({ close, save }: { close: () => void; save: (lead: Lead) => void }) {
  const [draft, setDraft] = useState({ name: "", company: "", phone: "", email: "", source: "Formulário mentoria", value: "", temperature: "Morno" as Lead["temperature"], nextAction: "Fazer primeiro contato" });
  return <div className={styles.backdrop} onMouseDown={close}><form className={styles.modal} onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); save({ ...draft, id: String(Date.now()), stage: "Novo lead", value: Number(draft.value) || 0, date: "Hoje" }); }}><header><div><span>Nova oportunidade</span><h2>Cadastrar contato</h2></div><button type="button" onClick={close}>×</button></header><div className={styles.formGrid}><Input label="Nome" value={draft.name} set={(name) => setDraft({ ...draft, name })} required /><Input label="Oficina / empresa" value={draft.company} set={(company) => setDraft({ ...draft, company })} required /><Input label="WhatsApp" value={draft.phone} set={(phone) => setDraft({ ...draft, phone })} /><Input label="E-mail" value={draft.email} set={(email) => setDraft({ ...draft, email })} type="email" /><Input label="Origem" value={draft.source} set={(source) => setDraft({ ...draft, source })} /><Input label="Valor potencial" value={draft.value} set={(value) => setDraft({ ...draft, value })} type="number" /><label><span>Temperatura</span><select value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: event.target.value as Lead["temperature"] })}><option>Quente</option><option>Morno</option><option>Frio</option></select></label><Input label="Próxima ação" value={draft.nextAction} set={(nextAction) => setDraft({ ...draft, nextAction })} /></div><footer><button type="button" onClick={close}>Cancelar</button><button type="submit">Salvar oportunidade</button></footer></form></div>;
}
function LeadDrawer({ lead, close, move }: { lead: Lead; close: () => void; move: (stage: Stage) => void }) { return <div className={styles.backdrop} onMouseDown={close}><aside className={styles.drawer} onMouseDown={(event) => event.stopPropagation()}><header><button onClick={close}>×</button><span className={styles[lead.temperature.toLowerCase()]}>{lead.temperature}</span><h2>{lead.name}</h2><p>{lead.company}</p></header><section><small>Dados de contato</small><p><span>WhatsApp</span><b>{lead.phone || "Não informado"}</b></p><p><span>E-mail</span><b>{lead.email || "Não informado"}</b></p><p><span>Origem</span><b>{lead.source}</b></p></section><section><small>Oportunidade</small><p><span>Valor potencial</span><b>{currency.format(lead.value)}</b></p><label><span>Etapa atual</span><select value={lead.stage} onChange={(event) => move(event.target.value as Stage)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label></section><section><small>Próxima ação</small><div className={styles.nextAction}><b>{lead.nextAction}</b><span>{lead.date}</span></div></section></aside></div>; }
function Input({ label, value, set, type = "text", required = false }: { label: string; value: string; set: (value: string) => void; type?: string; required?: boolean }) { return <label><span>{label}</span><input type={type} value={value} onChange={(event) => set(event.target.value)} required={required} /></label>; }
function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) { return <article><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className={styles.panelTitle}><span>{eyebrow}</span><h3>{title}</h3></header>; }

