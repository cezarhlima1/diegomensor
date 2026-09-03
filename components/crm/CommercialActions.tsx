"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./crm.module.css";

type Action = {
  id: string;
  name: string;
  startsOn: string;
  endsOn?: string;
  description: string;
  offeredProduct?: string;
  accessType: "Gratuita" | "Paga" | "Mista";
  ticketValue: number;
  status: "Planejada" | "Em andamento" | "Finalizada" | "Cancelada";
};

type Participant = {
  id: string;
  actionId: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  ticketType: string;
  ticketAmount: number;
  paymentStatus: string;
  boughtProduct?: string;
  saleAmount: number;
  crmStatus: string;
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const dateKey = (value?: string | null) => String(value || "").slice(0, 10);
const formatShortDate = (value?: string | null) => {
  const key = dateKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return "Sem data";
  const date = new Date(`${key}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Sem data" : shortDate.format(date);
};

function initialDraft(month: string): Action {
  return {
    id: makeId(),
    name: "",
    startsOn: `${month}-01`,
    description: "",
    accessType: "Gratuita",
    ticketValue: 0,
    status: "Planejada",
  };
}

async function responseMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body.detail || body.error || fallback;
  } catch {
    return fallback;
  }
}

export default function CommercialActions({ products }: { products: Array<{ name: string }> }) {
  const [actions, setActions] = useState<Action[]>([]);
  const [people, setPeople] = useState<Participant[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selected, setSelected] = useState<Action | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState<Action>(() => initialDraft(new Date().toISOString().slice(0, 7)));

  const load = async () => {
    const response = await fetch("/api/crm/actions", { cache: "no-store" });
    if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível carregar as ações."));
    const data = await response.json();
    setActions(data.actions || []);
    setPeople(data.participants || []);
  };

  useEffect(() => {
    void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar as ações."));
  }, []);

  const monthActions = useMemo(
    () => actions.filter((action) => dateKey(action.startsOn).slice(0, 7) === month).sort((a, b) => dateKey(a.startsOn).localeCompare(dateKey(b.startsOn))),
    [actions, month],
  );

  const calendarDays = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const totalDays = new Date(year, monthNumber, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
  }, [month]);

  const monthPeople = useMemo(() => {
    const actionIds = new Set(monthActions.map((action) => action.id));
    return people.filter((person) => actionIds.has(person.actionId));
  }, [monthActions, people]);

  const monthDate = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Date(year, monthNumber - 1, 1);
  }, [month]);

  const moveMonth = (amount: number) => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + amount, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  const openNewAction = () => {
    setError("");
    setSuccess("");
    setDraft(initialDraft(month));
    setAdding(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/crm/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "action", record: draft }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível salvar a ação."));
      setAdding(false);
      setDraft(initialDraft(month));
      setSuccess("Ação salva com sucesso.");
      try {
        await load();
      } catch {
        setError("A ação foi salva, mas a agenda não conseguiu atualizar. Recarregue a página para visualizá-la.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a ação.");
    } finally {
      setSaving(false);
    }
  };

  const release = async (action: Action) => {
    if (!confirm(`Liberar os participantes pendentes de ${action.name} para o CRM?`)) return;
    setError("");
    const response = await fetch("/api/crm/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "release", actionId: action.id }),
    });
    if (!response.ok) {
      setError(await responseMessage(response, "Não foi possível liberar os participantes."));
      return;
    }
    setSuccess("Participantes liberados para o CRM.");
    try {
      await load();
    } catch {
      setError("Os participantes foram liberados, mas a tela não conseguiu atualizar. Recarregue a página.");
    }
  };

  const participantCount = (actionId: string) => people.filter((person) => person.actionId === actionId).length;
  const waitingCount = (actionId: string) => people.filter((person) => person.actionId === actionId && person.crmStatus === "Aguardando liberação").length;

  return (
    <div className={`${styles.content} ${styles.actionCalendar}`}>
      <section className={styles.actionHero}>
        <div>
          <span>PLANEJAMENTO COMERCIAL</span>
          <h2>Ação comercial</h2>
          <p>Planeje campanhas e eventos. Os participantes só entram no CRM quando você liberar.</p>
        </div>
        <button type="button" onClick={openNewAction}>+ Nova ação</button>
      </section>

      {error && <p className={styles.actionError}>{error}</p>}
      {success && <p className={styles.actionSuccess}>{success}</p>}

      <section className={styles.actionKpis}>
        <article><span>Ações no mês</span><b>{monthActions.length}</b><small>planejadas e realizadas</small></article>
        <article><span>Participantes</span><b>{monthPeople.length}</b><small>vinculados às ações</small></article>
        <article><span>Aguardando CRM</span><b>{monthPeople.filter((person) => person.crmStatus === "Aguardando liberação").length}</b><small>entram somente após liberação</small></article>
        <article><span>Ingressos cadastrados</span><b>{money.format(monthPeople.reduce((total, person) => total + Number(person.ticketAmount || 0), 0))}</b><small>valor dos participantes do mês</small></article>
      </section>

      <section className={styles.actionCalendarLayout}>
        <div className={styles.calendarPanel}>
          <header>
            <div>
              <span>CALENDÁRIO</span>
              <h3>{monthLabel.format(monthDate)}</h3>
            </div>
            <div className={styles.monthControls}>
              <button type="button" aria-label="Mês anterior" onClick={() => moveMonth(-1)}>‹</button>
              <input type="month" aria-label="Selecionar mês" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} />
              <button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)}>›</button>
            </div>
          </header>
          <div className={styles.calendarScroll}>
            <div className={styles.calendarGrid}>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <b key={day}>{day}</b>)}
              {calendarDays.map((day, index) => (
                <article className={!day ? styles.emptyCalendarDay : ""} key={`${day || "empty"}-${index}`}>
                  {day && (
                    <>
                      <time>{day}</time>
                      {monthActions
                        .filter((action) => dateKey(action.startsOn) === `${month}-${String(day).padStart(2, "0")}`)
                        .map((action) => (
                          <button type="button" key={action.id} onClick={() => setSelected(action)}>
                            <span />
                            <b>{action.name}</b>
                            <small>{action.accessType}{action.ticketValue ? ` · ${money.format(action.ticketValue)}` : ""}</small>
                            <em>{action.status}</em>
                          </button>
                        ))}
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className={styles.actionMonthList}>
          <header><span>AGENDA DO MÊS</span><b>{monthActions.length}</b></header>
          <div>
            {monthActions.length === 0 && <p>Nenhuma ação cadastrada neste mês.</p>}
            {monthActions.map((action) => (
              <button type="button" key={action.id} onClick={() => setSelected(action)}>
                <time>{formatShortDate(action.startsOn)}</time>
                <span><b>{action.name}</b><small>{action.accessType} · {participantCount(action.id)} participantes</small></span>
                <em>{action.status}</em>
              </button>
            ))}
          </div>
        </aside>
      </section>

      {adding && (
        <div className={styles.backdrop}>
          <form className={`${styles.modal} ${styles.actionModal}`} onSubmit={save}>
            <header>
              <div><span>AÇÃO COMERCIAL</span><h2>Nova ação</h2><p>Cadastre o planejamento. Nenhum participante será enviado ao CRM agora.</p></div>
              <button type="button" aria-label="Fechar" onClick={() => setAdding(false)}>×</button>
            </header>
            <div className={styles.formGrid}>
              <label className={styles.actionNameField}><span>Nome da ação</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label>
              <label><span>Data da ação</span><input type="date" value={draft.startsOn} onChange={(event) => setDraft({ ...draft, startsOn: event.target.value })} required /></label>
              <label><span>Formato de acesso</span><select value={draft.accessType} onChange={(event) => setDraft({ ...draft, accessType: event.target.value as Action["accessType"] })}><option>Gratuita</option><option>Paga</option><option>Mista</option></select></label>
              <label><span>Valor padrão do ingresso</span><input type="number" min="0" step="0.01" value={draft.ticketValue} onChange={(event) => setDraft({ ...draft, ticketValue: Number(event.target.value) })} /></label>
              <label><span>Produto ofertado</span><select value={draft.offeredProduct || ""} onChange={(event) => setDraft({ ...draft, offeredProduct: event.target.value })}><option value="">Não informado</option>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label>
              <label className={styles.actionDescription}><span>Descrição / objetivo</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Ex.: Workshop de precificação para gerar oportunidades..." /></label>
            </div>
            {error && <p className={styles.actionModalError}>{error}</p>}
            <footer><button type="button" onClick={() => setAdding(false)} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar ação"}</button></footer>
          </form>
        </div>
      )}

      {selected && (
        <div className={styles.backdrop} onMouseDown={() => setSelected(null)}>
          <section className={`${styles.modal} ${styles.actionDetail}`} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>{selected.status}</span><h2>{selected.name}</h2><p>{formatShortDate(selected.startsOn)} · {selected.accessType}{selected.ticketValue ? ` · ${money.format(selected.ticketValue)}` : ""}</p></div>
              <button type="button" aria-label="Fechar" onClick={() => setSelected(null)}>×</button>
            </header>
            {selected.description && <p className={styles.actionDetailDescription}>{selected.description}</p>}
            <div className={styles.actionSummary}>
              <b>{participantCount(selected.id)}<small>participantes</small></b>
              <b>{waitingCount(selected.id)}<small>aguardando CRM</small></b>
            </div>
            <footer><button type="button" onClick={() => setSelected(null)}>Fechar</button><button type="button" onClick={() => release(selected)} disabled={waitingCount(selected.id) === 0}>Liberar pendentes para o CRM</button></footer>
          </section>
        </div>
      )}
    </div>
  );
}
