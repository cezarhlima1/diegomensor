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
  confirmedCount: number;
  attendedCount: number;
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
  paymentDate?: string;
  boughtProduct?: string;
  saleAmount: number;
  saleDate?: string;
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
    confirmedCount: 0,
    attendedCount: 0,
    status: "Planejada",
  };
}

function initialParticipant(action: Action): Participant {
  return {
    id: makeId(),
    actionId: action.id,
    name: "",
    phone: "",
    email: "",
    source: "",
    ticketType: action.accessType === "Gratuita" ? "Gratuito" : "Pago",
    ticketAmount: action.accessType === "Gratuita" ? 0 : action.ticketValue,
    paymentStatus: action.accessType === "Gratuita" ? "Recebido" : "Pendente",
    boughtProduct: "",
    saleAmount: 0,
    crmStatus: "Aguardando liberação",
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
  const [editingAction, setEditingAction] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState<Action>(() => initialDraft(new Date().toISOString().slice(0, 7)));
  const [participantDraft, setParticipantDraft] = useState<Participant | null>(null);

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
    setEditingAction(false);
    setAdding(true);
  };

  const openEditAction = (action: Action) => {
    setError("");
    setSuccess("");
    setDraft({ ...action, startsOn: dateKey(action.startsOn), endsOn: dateKey(action.endsOn) || undefined });
    setEditingAction(true);
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
      setEditingAction(false);
      setDraft(initialDraft(month));
      setSuccess(editingAction ? "Ação atualizada com sucesso." : "Ação salva com sucesso.");
      try {
        await load();
        if (editingAction) setSelected(draft);
      } catch {
        setError("A ação foi salva, mas a agenda não conseguiu atualizar. Recarregue a página para visualizá-la.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a ação.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAction = async (action: Action) => {
    const linked = participantCount(action.id);
    const warning = linked
      ? `Excluir “${action.name}” e seus ${linked} participante${linked === 1 ? "" : "s"} vinculado${linked === 1 ? "" : "s"}? Leads já liberados no CRM não serão apagados.`
      : `Excluir definitivamente a ação “${action.name}”?`;
    if (!confirm(warning)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/crm/actions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId: action.id }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível excluir a ação."));
      setSelected(null);
      setActions((current) => current.filter((item) => item.id !== action.id));
      setPeople((current) => current.filter((person) => person.actionId !== action.id));
      setSuccess("Ação excluída.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir a ação.");
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

  const openParticipant = (action: Action, participant?: Participant) => {
    setError("");
    setParticipantDraft(participant ? { ...participant } : initialParticipant(action));
    setAddingParticipant(true);
  };

  const saveParticipant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!participantDraft) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/crm/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "participant", record: participantDraft }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível salvar o participante."));
      setAddingParticipant(false);
      setParticipantDraft(null);
      setSuccess("Participante cadastrado na ação. Ele ainda não entrou no CRM.");
      try {
        await load();
      } catch {
        setError("O participante foi salvo, mas a tela não conseguiu atualizar. Recarregue a página para visualizá-lo.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o participante.");
    } finally {
      setSaving(false);
    }
  };

  const saveActionMetrics = async () => {
    if (!selected) return;
    setSavingMetrics(true);
    setError("");
    try {
      const response = await fetch("/api/crm/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "action", record: selected }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível salvar os números da ação."));
      setActions((current) => current.map((action) => action.id === selected.id ? selected : action));
      setSuccess("Números gerais da ação atualizados.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar os números da ação.");
    } finally {
      setSavingMetrics(false);
    }
  };

  const deleteParticipant = async (participant: Participant) => {
    if (!confirm(`Excluir ${participant.name} desta ação? Se essa pessoa já estiver no CRM, o lead não será apagado.`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/crm/actions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: participant.id }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível excluir o participante."));
      setPeople((current) => current.filter((person) => person.id !== participant.id));
      setAddingParticipant(false);
      setParticipantDraft(null);
      setSuccess("Participante removido da ação.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o participante.");
    } finally {
      setSaving(false);
    }
  };

  const participantCount = (actionId: string) => people.filter((person) => person.actionId === actionId).length;
  const waitingCount = (actionId: string) => people.filter((person) => person.actionId === actionId && person.crmStatus === "Aguardando liberação").length;
  const selectedPeople = selected ? people.filter((person) => person.actionId === selected.id) : [];
  const buyers = selectedPeople.filter((person) => Boolean(person.boughtProduct) || Number(person.saleAmount) > 0);
  const ticketRevenue = selectedPeople.filter((person) => person.paymentStatus === "Recebido").reduce((total, person) => total + Number(person.ticketAmount || 0), 0);
  const salesRevenue = buyers.reduce((total, person) => total + Number(person.saleAmount || 0), 0);

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
              <div><span>AÇÃO COMERCIAL</span><h2>{editingAction ? "Editar ação" : "Nova ação"}</h2><p>{editingAction ? "Atualize as informações desta ação." : "Cadastre o planejamento. Nenhum participante será enviado ao CRM agora."}</p></div>
              <button type="button" aria-label="Fechar" onClick={() => { setAdding(false); setEditingAction(false); }}>×</button>
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
            <footer><button type="button" onClick={() => { setAdding(false); setEditingAction(false); }} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Salvando..." : editingAction ? "Salvar alterações" : "Salvar ação"}</button></footer>
          </form>
        </div>
      )}

      {selected && (
        <div className={styles.backdrop} onMouseDown={() => setSelected(null)}>
          <section className={`${styles.modal} ${styles.actionDetail}`} onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>{selected.status}</span><h2>{selected.name}</h2><p>{formatShortDate(selected.startsOn)} · {selected.accessType}{selected.ticketValue ? ` · ${money.format(selected.ticketValue)}` : ""}</p></div>
              <div className={styles.actionDetailActions}><button type="button" onClick={() => openEditAction(selected)}>Editar</button><button type="button" className={styles.actionDeleteButton} onClick={() => deleteAction(selected)} disabled={saving}>Excluir</button><button type="button" aria-label="Fechar" onClick={() => setSelected(null)}>×</button></div>
            </header>
            {selected.description && <p className={styles.actionDetailDescription}>{selected.description}</p>}
            <div className={styles.actionSummary}>
              <article><span>Cadastrados</span><b>{selectedPeople.length}</b><small>participantes na ação</small></article>
              <article><span>Confirmados</span><b>{selected.confirmedCount}</b><small>número geral informado</small></article>
              <article><span>Participaram</span><b>{selected.attendedCount}</b><small>{selected.confirmedCount ? `${(selected.attendedCount / selected.confirmedCount * 100).toFixed(1)}% dos confirmados` : "Sem confirmados informados"}</small></article>
              <article><span>Compraram</span><b>{buyers.length}</b><small>{selected.attendedCount ? `${(buyers.length / selected.attendedCount * 100).toFixed(1)}% dos participantes` : "Sem participantes informados"}</small></article>
              <article><span>Aguardando CRM</span><b>{waitingCount(selected.id)}</b><small>liberação manual</small></article>
              <article><span>Ingressos recebidos</span><b>{money.format(ticketRevenue)}</b><small>pagamentos recebidos</small></article>
              <article><span>Vendas da oferta</span><b>{money.format(salesRevenue)}</b><small>{buyers.length} compra{buyers.length === 1 ? "" : "s"}</small></article>
            </div>
            <section className={styles.actionGeneralMetrics}>
              <div><span>NÚMEROS GERAIS DA AÇÃO</span><p>Informe apenas os totais. Nenhuma presença será atribuída a uma pessoa específica.</p></div>
              <label><span>Confirmados</span><input type="number" min="0" step="1" value={selected.confirmedCount} onChange={(event) => setSelected({ ...selected, confirmedCount: Number(event.target.value) })} /></label>
              <label><span>Participaram</span><input type="number" min="0" step="1" value={selected.attendedCount} onChange={(event) => setSelected({ ...selected, attendedCount: Number(event.target.value) })} /></label>
              <button type="button" onClick={saveActionMetrics} disabled={savingMetrics}>{savingMetrics ? "Salvando..." : "Salvar números"}</button>
            </section>
            <section className={styles.actionParticipants}>
              <header><div><span>PARTICIPANTES</span><h3>Pessoas vinculadas a esta ação</h3></div><button type="button" onClick={() => openParticipant(selected)}>+ Cadastrar participante</button></header>
              <div>
                {selectedPeople.map((person) => (
                  <button type="button" key={person.id} onClick={() => openParticipant(selected, person)}>
                    <span><b>{person.name}</b><small>{person.email || person.phone || "Contato não informado"}</small></span>
                    <span><small>Ingresso</small><b>{person.ticketType} · {money.format(person.ticketAmount)}</b></span>
                    <span><small>Resultado</small><b>{person.boughtProduct || "Não comprou"}</b></span>
                    <strong>{person.crmStatus}</strong>
                  </button>
                ))}
                {!selectedPeople.length && <p>Nenhum participante cadastrado nesta ação.</p>}
              </div>
            </section>
            <footer><button type="button" onClick={() => setSelected(null)}>Fechar</button><button type="button" onClick={() => release(selected)} disabled={waitingCount(selected.id) === 0}>Liberar pendentes para o CRM</button></footer>
          </section>
        </div>
      )}

      {addingParticipant && participantDraft && selected && (
        <div className={`${styles.backdrop} ${styles.participantBackdrop}`}>
          <form className={`${styles.modal} ${styles.participantModal}`} onSubmit={saveParticipant}>
            <header><div><span>PARTICIPANTE</span><h2>{people.some((person) => person.id === participantDraft.id) ? "Editar participante" : "Novo participante"}</h2><p>{selected.name} · permanece fora do CRM até a liberação.</p></div><button type="button" onClick={() => setAddingParticipant(false)}>×</button></header>
            <div className={styles.participantForm}>
              <label className={styles.participantWide}><span>Nome</span><input required value={participantDraft.name} onChange={(event) => setParticipantDraft({ ...participantDraft, name: event.target.value })} /></label>
              <label><span>Telefone</span><input value={participantDraft.phone} onChange={(event) => setParticipantDraft({ ...participantDraft, phone: event.target.value })} /></label>
              <label><span>E-mail</span><input type="email" value={participantDraft.email} onChange={(event) => setParticipantDraft({ ...participantDraft, email: event.target.value })} /></label>
              <label><span>Origem</span><input value={participantDraft.source} onChange={(event) => setParticipantDraft({ ...participantDraft, source: event.target.value })} placeholder="Tráfego, indicação, Instagram..." /></label>
              <label><span>Tipo de ingresso</span><select value={participantDraft.ticketType} onChange={(event) => setParticipantDraft({ ...participantDraft, ticketType: event.target.value })}><option>Gratuito</option><option>Pago</option><option>Cortesia</option></select></label>
              <label><span>Valor do ingresso</span><input type="number" min="0" step="0.01" value={participantDraft.ticketAmount} onChange={(event) => setParticipantDraft({ ...participantDraft, ticketAmount: Number(event.target.value) })} /></label>
              <label><span>Status do pagamento</span><select value={participantDraft.paymentStatus} onChange={(event) => setParticipantDraft({ ...participantDraft, paymentStatus: event.target.value })}><option>Pendente</option><option>Recebido</option><option>Atrasado</option><option>Cancelado</option></select></label>
              <label><span>Data do pagamento</span><input type="date" value={dateKey(participantDraft.paymentDate)} onChange={(event) => setParticipantDraft({ ...participantDraft, paymentDate: event.target.value })} /></label>
              <label><span>Produto comprado</span><select value={participantDraft.boughtProduct || ""} onChange={(event) => setParticipantDraft({ ...participantDraft, boughtProduct: event.target.value })}><option value="">Não comprou</option>{products.map((product) => <option key={product.name}>{product.name}</option>)}</select></label>
              <label><span>Valor da venda</span><input type="number" min="0" step="0.01" value={participantDraft.saleAmount} onChange={(event) => setParticipantDraft({ ...participantDraft, saleAmount: Number(event.target.value) })} /></label>
              <label><span>Data da venda</span><input type="date" value={dateKey(participantDraft.saleDate)} onChange={(event) => setParticipantDraft({ ...participantDraft, saleDate: event.target.value })} /></label>
            </div>
            {error && <p className={styles.actionModalError}>{error}</p>}
            <footer>{people.some((person) => person.id === participantDraft.id) && <button type="button" className={styles.participantDeleteButton} onClick={() => deleteParticipant(participantDraft)} disabled={saving}>Excluir participante</button>}<button type="button" onClick={() => setAddingParticipant(false)} disabled={saving}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar participante"}</button></footer>
          </form>
        </div>
      )}
    </div>
  );
}
