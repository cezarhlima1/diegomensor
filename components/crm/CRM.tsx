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
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mensor-crm-v1");
      if (saved)
        setLeads(
          (JSON.parse(saved) as Lead[]).map((lead) => {
            const stage = (lead.stage as string) === "Diagnóstico" ? "Em conversação" as Stage : lead.stage;
            return ["Proposta", "Fechado"].includes(stage) ? { ...lead, stage } : { ...lead, stage, value: 0 };
          }),
        );
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem("mensor-crm-v1", JSON.stringify(leads));
  }, [leads, loaded]);

  const stats = useMemo(() => {
    const open = leads.filter((lead) => lead.stage === "Proposta");
    const won = leads.filter((lead) => lead.stage === "Fechado");
    const proposals = leads.filter((lead) =>
      ["Proposta", "Fechado"].includes(lead.stage),
    );
    return {
      total: leads.length,
      meetings: leads.filter((lead) =>
        ["Reunião agendada", "Proposta", "Fechado"].includes(lead.stage),
      ).length,
      proposals: proposals.length,
      closed: won.length,
      openValue: open.reduce((sum, lead) => sum + lead.value, 0),
      wonValue: won.reduce((sum, lead) => sum + lead.value, 0),
      conversion: leads.length ? (won.length / leads.length) * 100 : 0,
      proposalConversion: proposals.length
        ? (won.length / proposals.length) * 100
        : 0,
      proposalValue: proposals.reduce((sum, lead) => sum + lead.value, 0),
      valueConversion: proposals.reduce((sum, lead) => sum + lead.value, 0)
        ? (won.reduce((sum, lead) => sum + lead.value, 0) /
            proposals.reduce((sum, lead) => sum + lead.value, 0)) *
          100
        : 0,
      hot: leads.filter(
        (lead) => lead.temperature === "Quente" && lead.stage !== "Fechado",
      ).length,
    };
  }, [leads]);

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
          <Dashboard leads={leads} stats={stats} />
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
  stats,
}: {
  leads: Lead[];
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
        <div className={styles.conversionFunnel}>
          {funnelSteps.map((step, index) => {
            const percentage = leads.length ? (step.count / leads.length) * 100 : 0;
            return <article key={step.label} style={{ width: `${100 - index * 10}%` }}><div><span>{String(index + 1).padStart(2, "0")}</span><b>{step.label}</b><small>{step.detail}</small></div><strong>{step.count}</strong><em>{percentage.toFixed(1)}%</em></article>;
          })}
        </div>
      </section>
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <PanelTitle
            eyebrow="Funil comercial"
            title="Distribuição das oportunidades"
          />
          <div className={styles.stageSummary}>
            {stages.map((stage) => {
              const items = leads.filter((lead) => lead.stage === stage);
              return (
                <div key={stage}>
                  <span>
                    <i />
                    {stage}
                  </span>
                  <b>{items.length}</b>
                  <div>
                    <em
                      style={{
                        width: `${Math.max(8, (items.length / Math.max(leads.length, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {stage === "Proposta" || stage === "Fechado"
                      ? currency.format(
                          items.reduce((sum, lead) => sum + lead.value, 0),
                        )
                      : "Valor definido na proposta"}
                  </small>
                </div>
              );
            })}
          </div>
        </section>
        <section className={styles.panel}>
          <PanelTitle eyebrow="Agenda" title="Próximas ações" />
          <div className={styles.activity}>
            {leads
              .filter((lead) => lead.stage !== "Fechado")
              .slice(0, 5)
              .map((lead) => (
                <article key={lead.id}>
                  <span>
                    {lead.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <b>{lead.nextAction}</b>
                    <small>
                      {lead.name} · {lead.company}
                    </small>
                  </div>
                  <time>{lead.date}</time>
                </article>
              ))}
          </div>
        </section>
      </div>
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
  useEffect(() => { try { const saved = localStorage.getItem("mensor-crm-messages-v1"); if (saved) setTemplates(JSON.parse(saved)); } catch {} }, []);
  const saveTemplates = (next: Array<{ id: string; title: string; text: string }>) => { setTemplates(next); localStorage.setItem("mensor-crm-messages-v1", JSON.stringify(next)); };
  const addTemplate = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim() || !message.trim()) return; saveTemplates([{ id: String(Date.now()), title: title.trim(), text: message.trim() }, ...templates]); setTitle(""); setMessage(""); };
  const copyTemplate = async (id: string, text: string) => { await navigator.clipboard.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1800); };
  return (
    <div className={styles.content}>
      <section className={styles.messageWorkspace}>
        <form className={styles.messageForm} onSubmit={addTemplate}><header><span>Nova mensagem</span><h2>Cadastrar mensagem padrão</h2><p>Crie textos prontos para agilizar seus contatos comerciais.</p></header><label><span>Nome da mensagem</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Primeiro contato" required /></label><label><span>Texto da mensagem</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva a mensagem que deseja reutilizar..." rows={7} required /></label><button type="submit">Salvar mensagem</button></form>
        <section className={styles.messageLibrary}><header><div><span>Biblioteca</span><h2>Mensagens salvas</h2></div><b>{templates.length}</b></header>{templates.length ? <div>{templates.map((template) => <article key={template.id}><header><h3>{template.title}</h3><button onClick={() => saveTemplates(templates.filter((item) => item.id !== template.id))} aria-label="Excluir mensagem">×</button></header><p>{template.text}</p><button onClick={() => copyTemplate(template.id, template.text)}>{copied === template.id ? "Copiada!" : "Copiar mensagem"}</button></article>)}</div> : <div className={styles.emptyMessages}><i>✉</i><b>Nenhuma mensagem cadastrada</b><span>Seus modelos aparecerão aqui.</span></div>}</section>
      </section>
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
        <article>
          <span>Conversão financeira</span>
          <strong>{stats.valueConversion.toFixed(1)}%</strong>
          <small>
            {currency.format(stats.wonValue)} de{" "}
            {currency.format(stats.proposalValue)}
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
