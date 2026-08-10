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
type View = "inicio" | "pipeline" | "contatos" | "mensagens";
type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: string;
  stage: Stage;
  value: number;
  temperature: "Quente" | "Morno" | "Frio";
  nextAction: string;
  date: string;
  createdAt?: string;
};

const stages: Stage[] = [
  "Novo lead",
  "Contato feito",
  "Em conversação",
  "Reunião agendada",
  "Proposta",
  "Fechado",
];
const initialLeads: Lead[] = [
  {
    id: "1",
    name: "Rafael Martins",
    company: "RM Auto Center",
    phone: "(54) 99921-4301",
    email: "rafael@rmauto.com",
    source: "Formulário mentoria",
    stage: "Novo lead",
    value: 0,
    temperature: "Quente",
    nextAction: "Fazer primeiro contato",
    date: "Hoje, 09:30",
  },
  {
    id: "2",
    name: "Marcelo Vieira",
    company: "Vieira Motors",
    phone: "(51) 99810-3210",
    email: "marcelo@vieiramotors.com",
    source: "Instagram",
    stage: "Novo lead",
    value: 0,
    temperature: "Morno",
    nextAction: "Enviar mensagem",
    date: "Hoje, 11:15",
  },
  {
    id: "3",
    name: "Ana Paula Costa",
    company: "Costa Centro Automotivo",
    phone: "(11) 99744-8200",
    email: "ana@costacentro.com",
    source: "Indicação",
    stage: "Contato feito",
    value: 0,
    temperature: "Quente",
    nextAction: "Agendar diagnóstico",
    date: "Amanhã, 10:00",
  },
  {
    id: "4",
    name: "Lucas Almeida",
    company: "Box 12 Garage",
    phone: "(47) 99102-5588",
    email: "lucas@box12.com",
    source: "Evento",
    stage: "Contato feito",
    value: 0,
    temperature: "Morno",
    nextAction: "Retorno no WhatsApp",
    date: "12 ago, 14:00",
  },
  {
    id: "5",
    name: "Fernando Lima",
    company: "LimaCar",
    phone: "(48) 99913-2041",
    email: "fernando@limacar.com",
    source: "Formulário mentoria",
    stage: "Reunião agendada",
    value: 0,
    temperature: "Quente",
    nextAction: "Reunião de diagnóstico",
    date: "Hoje, 16:30",
  },
  {
    id: "6",
    name: "Bruno Souza",
    company: "BS Performance",
    phone: "(19) 99670-1182",
    email: "bruno@bsperformance.com",
    source: "YouTube",
    stage: "Proposta",
    value: 12000,
    temperature: "Quente",
    nextAction: "Follow-up da proposta",
    date: "Amanhã, 09:00",
  },
  {
    id: "7",
    name: "Carla Mendes",
    company: "Mendes Auto Service",
    phone: "(21) 99781-3009",
    email: "carla@mendesauto.com",
    source: "Instagram",
    stage: "Proposta",
    value: 8500,
    temperature: "Morno",
    nextAction: "Validar decisor",
    date: "13 ago, 15:00",
  },
  {
    id: "8",
    name: "Eduardo Rocha",
    company: "Rocha Motors",
    phone: "(31) 99803-6615",
    email: "eduardo@rochamotors.com",
    source: "Indicação",
    stage: "Fechado",
    value: 12000,
    temperature: "Quente",
    nextAction: "Onboarding",
    date: "Concluído",
  },
];

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const whatsappLink = (lead: Lead) => {
  const digits = lead.phone.replace(/\D/g, "");
  const phone = digits.startsWith("55") ? digits : `55${digits}`;
  const firstName = lead.name.trim().split(" ")[0];
  const message = `Olá, ${firstName}! Tudo bem? Aqui é da Mensor Treinamentos. Recebi seu contato e queria entender melhor o momento da sua oficina.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

export default function CRM() {
  const [view, setView] = useState<View>("inicio");
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map((lead) => ({ ...lead, createdAt: new Date().toISOString() })));
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mensor-crm-v1");
      if (saved)
        setLeads(
          (JSON.parse(saved) as Lead[]).map((lead) => {
            const stage = (lead.stage as string) === "Diagnóstico" ? "Em conversação" as Stage : lead.stage;
            const createdAt = lead.createdAt || new Date().toISOString();
            return ["Proposta", "Fechado"].includes(stage) ? { ...lead, stage, createdAt } : { ...lead, stage, createdAt, value: 0 };
          }),
        );
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("mensor-crm-v1", JSON.stringify(leads));
  }, [leads, loaded]);

  const reportingLeads = useMemo(() => leads.filter((lead) => (lead.createdAt || new Date().toISOString()).slice(0, 7) === selectedMonth), [leads, selectedMonth]);
  const stats = useMemo(() => {
    const open = reportingLeads.filter((lead) => lead.stage === "Proposta");
    const won = reportingLeads.filter((lead) => lead.stage === "Fechado");
    const proposals = reportingLeads.filter((lead) =>
      ["Proposta", "Fechado"].includes(lead.stage),
    );
    return {
      total: reportingLeads.length,
      meetings: reportingLeads.filter((lead) =>
        ["Reunião agendada", "Proposta", "Fechado"].includes(lead.stage),
      ).length,
      proposals: proposals.length,
      closed: won.length,
      openValue: open.reduce((sum, lead) => sum + lead.value, 0),
      wonValue: won.reduce((sum, lead) => sum + lead.value, 0),
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
  }, [reportingLeads]);

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
            lead.value ? String(lead.value) : "",
          );
          if (informed === null) return lead;
          const value = Number(
            informed
              .replace(/[^0-9,.-]/g, "")
              .replace(".", "")
              .replace(",", "."),
          );
          if (!Number.isFinite(value) || value <= 0) return lead;
          return { ...lead, stage, value };
        }
        return { ...lead, stage, value: 0 };
      }),
    );
  const addLead = (lead: Lead) => {
    setLeads((current) => [lead, ...current]);
    setAdding(false);
  };

  const navigation: Array<[View, string, string]> = [
    ["inicio", "Visão geral", "⌂"],
    ["pipeline", "Pipeline", "▦"],
    ["contatos", "Contatos", "◎"],
    ["mensagens", "Mensagens", "✉"],
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
            <small>Mensor Treinamentos / Comercial</small>
            <h1>{navigation.find(([id]) => id === view)?.[1]}</h1>
          </div>
          {view === "inicio" && <PeriodFilter month={selectedMonth} setMonth={setSelectedMonth} total={reportingLeads.length} />}
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
            <button onClick={() => setAdding(true)}>+ Nova oportunidade</button>
          </div>
        </header>
        {view === "inicio" && (
          <Dashboard leads={reportingLeads} allLeads={leads} stats={stats} selectedMonth={selectedMonth} />
        )}
        {view === "pipeline" && (
          <Pipeline leads={filtered} moveLead={moveLead} select={setSelected} />
        )}
        {view === "contatos" && (
          <Contacts leads={filtered} select={setSelected} />
        )}
        {view === "mensagens" && <Messages />}
      </section>
      {adding && <LeadModal close={() => setAdding(false)} save={addLead} />}
      {selected && (
        <LeadDrawer
          lead={selected}
          close={() => setSelected(null)}
          move={(stage) => {
            moveLead(selected.id, stage);
            setSelected({ ...selected, stage });
          }}
        />
      )}
    </main>
  );
}

function Dashboard({
  leads,
  allLeads,
  stats,
  selectedMonth,
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
    conversion: number;
    proposalConversion: number;
    proposalValue: number;
    valueConversion: number;
    hot: number;
  };
  selectedMonth: string;
}) {
  const funnelSteps = [
    { label: "Leads gerados", count: leads.length, detail: "Total de oportunidades" },
    { label: "Conversas iniciadas", count: leads.filter((lead) => lead.stage !== "Novo lead").length, detail: "Primeiro contato realizado" },
    { label: "Reuniões agendadas", count: leads.filter((lead) => ["Reunião agendada", "Proposta", "Fechado"].includes(lead.stage)).length, detail: "Reuniões marcadas" },
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
      <section className={`${styles.panel} ${styles.sourcePanel}`}>
        <PanelTitle eyebrow="Conversão comercial" title="Funil de leads" />
        <p className={styles.sourceIntro}>
          Acompanhe quantos leads avançam em cada etapa, do primeiro contato ao fechamento.
        </p>
        <FunnelVisualization steps={funnelSteps} total={leads.length} />
      </section>
      <MonthlyMetricsChart leads={allLeads} endMonth={selectedMonth} />
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
  select,
}: {
  leads: Lead[];
  select: (lead: Lead) => void;
}) {
  const [sourceFilter, setSourceFilter] = useState("Todos");
  const sourceTags = Array.from(new Set(leads.map((lead) => lead.source.trim()).filter(Boolean))).sort();
  const visibleLeads = sourceFilter === "Todos" ? leads : leads.filter((lead) => lead.source.trim() === sourceFilter);
  return (
    <div className={styles.content}>
      <section className={styles.panel}>
        <PanelTitle
          eyebrow="Base comercial"
          title={`${visibleLeads.length} contatos`}
        />
        <div className={styles.contactFilters}>
          <div><span>Filtrar por funil de origem</span><small>As etiquetas são criadas automaticamente conforme a origem dos leads.</small></div>
          <label><span>Origem</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option>Todos</option>{sourceTags.map((source) => <option key={source}>{source}</option>)}</select></label>
        </div>
        <div className={styles.sourceChips}>
          <button className={sourceFilter === "Todos" ? styles.selectedChip : ""} onClick={() => setSourceFilter("Todos")}>Todos <b>{leads.length}</b></button>
          {sourceTags.map((source) => { const count = leads.filter((lead) => lead.source.trim() === source).length; return <button key={source} className={sourceFilter === source ? styles.selectedChip : ""} onClick={() => setSourceFilter(source)}>{source}<b>{count}</b></button>; })}
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
function Messages() {
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; text: string }>>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [addingMessage, setAddingMessage] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem("mensor-crm-messages-v1"); if (saved) setTemplates(JSON.parse(saved)); } catch {} }, []);
  const saveTemplates = (next: Array<{ id: string; title: string; text: string }>) => { setTemplates(next); localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(next)); };
  const addTemplate = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !message.trim()) return; saveTemplates([{ id: String(Date.now()), title: title.trim(), text: message.trim() }, ...templates]); setTitle(""); setMessage(""); setAddingMessage(false); };
  const copyTemplate = async (id: string, text: string) => { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); };
  return (
    <div className={styles.content}>
      <section className={styles.messageWorkspace}>
        <section className={styles.messageLibrary}><header><div><span>Biblioteca</span><h2>Mensagens salvas</h2></div><div className={styles.messageHeaderActions}><b>{templates.length}</b><button onClick={() => setAddingMessage(true)}>+ Adicionar mensagem</button></div></header>{templates.length ? <div>{templates.map((template) => <article key={template.id}><header><h3>{template.title}</h3><button onClick={() => saveTemplates(templates.filter((item) => item.id !== template.id))} aria-label="Excluir mensagem">×</button></header><p>{template.text}</p><button onClick={() => copyTemplate(template.id, template.text)}>{copied === template.id ? "Copiada!" : "Copiar mensagem"}</button></article>)}</div> : <div className={styles.emptyMessages}><i>✉</i><b>Nenhuma mensagem cadastrada</b><span>Use o botão “Adicionar mensagem” para criar seu primeiro modelo.</span></div>}</section>
      </section>
      {addingMessage && <div className={styles.backdrop} onMouseDown={() => setAddingMessage(false)}><form className={`${styles.messageForm} ${styles.messageModal}`} onMouseDown={(event) => event.stopPropagation()} onSubmit={addTemplate}><header><button type="button" onClick={() => setAddingMessage(false)}>×</button><span>Nova mensagem</span><h2>Cadastrar mensagem padrão</h2><p>Crie um texto pronto para agilizar seus contatos comerciais.</p></header><label><span>Nome da mensagem</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Primeiro contato" autoFocus required /></label><label><span>Texto da mensagem</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva a mensagem que deseja reutilizar..." rows={7} required /></label><button type="submit">Salvar mensagem</button></form></div>}
    </div>
  );
}

function LeadModal({
  close,
  save,
}: {
  close: () => void;
  save: (lead: Lead) => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    source: "Formulário mentoria",
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
          <Input
            label="Origem"
            value={draft.source}
            set={(source) => setDraft({ ...draft, source })}
          />
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
  close,
  move,
}: {
  lead: Lead;
  close: () => void;
  move: (stage: Stage) => void;
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
        </section>
        <section>
          <small>Oportunidade</small>
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
  const colors = ["#1689b8", "#14799f", "#126985", "#10586e", "#0f485a"];
  return <div className={styles.funnelVisual}><svg viewBox="0 0 600 470" role="img" aria-label="Funil de conversão de leads"><defs><filter id="funnel-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="7" stdDeviation="7" floodOpacity=".25" /></filter><filter id="floor-blur"><feGaussianBlur stdDeviation="8" /></filter></defs>{steps.map((step,index) => { const width = 510 - index * 72; const x = (600 - width) / 2; const y = 18 + index * 76; const bottomInset = 18; const percentage = total ? step.count / total * 100 : 0; return <g key={step.label} filter="url(#funnel-shadow)"><path d={`M ${x} ${y + 9} L ${x + width} ${y + 9} L ${x + width - bottomInset} ${y + 59} Q ${x + width / 2} ${y + 71} ${x + bottomInset} ${y + 59} Z`} fill={colors[index]} /><ellipse cx="300" cy={y + 9} rx={width / 2} ry="11" fill={colors[index]} stroke="rgba(189,235,250,.3)" strokeWidth="1.2" /><ellipse cx="300" cy={y + 8} rx={width / 2 - 5} ry="7" fill="rgba(166,226,247,.1)" /><text x={x + 39} y={y + 39} className={styles.funnelStep}>{String(index + 1).padStart(2,"0")}</text><text x={x + 72} y={y + 38} className={styles.funnelLabel}>{step.label}</text><text x={x + width - 76} y={y + 38} textAnchor="end" className={styles.funnelCount}>{step.count}</text><text x={x + width - 35} y={y + 38} textAnchor="end" className={styles.funnelPercent}>{percentage.toFixed(0)}%</text></g>; })}<path d="M 287 408 H 313 V 426 H 329 L 300 454 L 271 426 H 287 Z" fill="#14789e" /><ellipse cx="300" cy="462" rx="62" ry="8" fill="rgba(0,0,0,.42)" filter="url(#floor-blur)" /></svg></div>;
}
function MonthlyMetricsChart({ leads, endMonth }: { leads: Lead[]; endMonth: string }) {
  const [goals, setGoals] = useState<Record<string, number>>({});
  useEffect(() => { try { const saved = localStorage.getItem("mensor-crm-goals-v1"); if (saved) setGoals(JSON.parse(saved)); } catch {} }, []);
  const [year, month] = endMonth.split("-").map(Number);
  const start = new Date(2026, 6, 1);
  const end = new Date(year, month - 1, 1);
  const firstMonth = end < start ? end : start;
  const monthCount = Math.max(1, (end.getFullYear() - firstMonth.getFullYear()) * 12 + end.getMonth() - firstMonth.getMonth() + 1);
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const items = leads.filter((lead) => (lead.createdAt || "").slice(0, 7) === key);
    return { key, label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""), leads: items.length, closedValue: items.filter((lead) => lead.stage === "Fechado").reduce((sum, lead) => sum + lead.value, 0), goal: goals[key] || 0 };
  });
  const maxValue = Math.max(1, ...months.flatMap((item) => [item.closedValue, item.goal]));
  const maxLeads = Math.max(1, ...months.map((item) => item.leads));
  const leadPoints = months.map((item, index) => ({ x: index * 100 + 50, y: 215 - item.leads / maxLeads * 180, value: item.leads }));
  const leadPath = leadPoints.reduce((path, point, index) => { if (!index) return `M ${point.x} ${point.y}`; const previous = leadPoints[index - 1]; const middle = (previous.x + point.x) / 2; return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`; }, "");
  const areaPath = leadPoints.length ? `${leadPath} L ${leadPoints.at(-1)!.x} 230 L ${leadPoints[0].x} 230 Z` : "";
  const valueTicks = [maxValue, maxValue * .75, maxValue * .5, maxValue * .25, 0];
  const leadTicks = [maxLeads, Math.round(maxLeads * .75), Math.round(maxLeads * .5), Math.round(maxLeads * .25), 0];
  const saveGoal = (value: string) => { const next = { ...goals, [endMonth]: Number(value) || 0 }; setGoals(next); localStorage.setItem("mensor-crm-goals-v1", JSON.stringify(next)); };
  return <section className={`${styles.panel} ${styles.monthlyChart}`}><header><div><span>Performance mensal</span><h3>Valor fechado × meta</h3><p>Colunas financeiras por mês e evolução dos leads gerados.</p></div><div className={styles.chartLegend}><span><i className={styles.goalLegend} />Meta</span><span><i className={styles.closedLegend} />Valor fechado</span><span><i className={styles.leadLegend} />Leads gerados</span></div></header><div className={styles.goalControl}><div><span>Meta do mês selecionado</span><small>{endMonth.split("-").reverse().join("/")}</small></div><label>R$<input type="number" min="0" step="100" value={goals[endMonth] || ""} onChange={(event) => saveGoal(event.target.value)} placeholder="Definir meta" /></label></div><div className={styles.comboChart}><div className={styles.valueAxis}>{valueTicks.map((tick, index) => <span key={index}>{tick >= 1000 ? `R$ ${(tick / 1000).toFixed(tick % 1000 ? 1 : 0)}k` : currency.format(tick)}</span>)}</div><div className={styles.comboScroller}><div className={styles.comboPlot} style={{ gridTemplateColumns: `repeat(${months.length}, 150px)`, width: `${Math.max(360, months.length * 150)}px` }}><svg viewBox={`0 0 ${months.length * 100} 240`} preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="lead-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62c7f2" stopOpacity=".16" /><stop offset="1" stopColor="#62c7f2" stopOpacity="0" /></linearGradient></defs><path className={styles.leadArea} d={areaPath} /><path className={styles.leadCurve} d={leadPath} /></svg>{leadPoints.map((point,index) => <span key={months[index].key} className={styles.leadPoint} style={{ left: `${(index + .5) / months.length * 100}%`, top: `${point.y / 240 * 100}%` }}><b>{point.value}</b></span>)}{months.map((item) => <article key={item.key}><div><span className={styles.goalBar} style={{ height: `${item.goal / maxValue * 100}%` }}><b>{item.goal ? currency.format(item.goal) : ""}</b></span><span className={styles.closedBar} style={{ height: `${item.closedValue / maxValue * 100}%` }}><b>{item.closedValue ? currency.format(item.closedValue) : ""}</b></span></div><strong>{item.label}</strong><small>{item.key.slice(0,4)}</small></article>)}</div></div><div className={styles.leadAxis}>{leadTicks.map((tick,index) => <span key={index}>{tick}</span>)}</div></div></section>;
}
function PeriodFilter({ month, setMonth, total }: { month: string; setMonth: (month: string) => void; total: number }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
  return <section className={styles.periodFilter}><div><span>Período da visão geral</span><h2>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h2><p>Dados de 01/{String(monthNumber).padStart(2, "0")} a {lastDay}/{String(monthNumber).padStart(2, "0")} · {total} leads no período</p></div><label><span>Selecionar mês</span><input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} /></label></section>;
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
    proposalValue: number;
    conversion: number;
    proposalConversion: number;
    valueConversion: number;
  };
}) {
  return (
    <section className={styles.financialSummary}>
      <header>
        <span>Métricas detalhadas</span>
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
          <small>Valor confirmado no fechamento</small>
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
