"use client";
import { useEffect, useMemo, useState } from 'react';
import type { Activity } from '@/lib/crm-monitoring';
import styles from './monitoring.module.css';
type User = { id: string; name: string; isCloser: boolean };
type Event = { leadId: string; leadName: string; event: Activity };
type Sale = { id: string; leadId: string; leadName: string; actorId?: string; closerName?: string; gross: number; net: number; received: number };
type Data = { range: { start: string; end: string }; users: User[]; events: Event[]; sales: Sale[] };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dateLabel = (date: string) => date.split('-').reverse().join('/');
export default function Monitoring() {
  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(today);
  const [actor, setActor] = useState('closers');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/crm/monitoring?${new URLSearchParams({ period, date })}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error || 'Falha ao carregar.'); return body as Data; })
      .then(setData).catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Falha de conexão.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, date, revision]);
  const report = useMemo(() => {
    if (!data) return null;
    const closerIds = new Set(data.users.filter(user => user.isCloser).map(user => user.id));
    const matches = (id?: string) => actor === 'all' || (actor === 'closers' ? !!id && closerIds.has(id) : actor === 'unassigned' ? !id : id === actor);
    const events = data.events.filter(row => matches(row.event.actorId));
    const sales = data.sales.filter(row => matches(row.actorId));
    const actions = new Map<string, number>();
    const stages = new Map<string, number>();
    const days = new Map<string, { leads: Set<string>; movements: number }>();
    for (const row of events) {
      for (const action of row.event.actions) actions.set(action, (actions.get(action) || 0) + 1);
      if (row.event.actions.includes('Mudança de etapa')) stages.set(row.event.stage || 'Sem etapa', (stages.get(row.event.stage || 'Sem etapa') || 0) + 1);
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(row.event.at));
      const daily = days.get(day) || { leads: new Set<string>(), movements: 0 };
      daily.leads.add(row.leadId); daily.movements++; days.set(day, daily);
    }
    return { events, sales, actions: [...actions], stages: [...stages], days: [...days].sort(([a], [b]) => a.localeCompare(b)), leads: new Set(events.map(row => row.leadId)).size, gross: sales.reduce((sum, row) => sum + Number(row.gross), 0), net: sales.reduce((sum, row) => sum + Number(row.net), 0), received: sales.reduce((sum, row) => sum + Number(row.received), 0) };
  }, [data, actor]);
  const name = (id?: string) => data?.users.find(user => user.id === id)?.name || 'Usuário não disponível';
  return <div className={styles.monitoring}>
    <div className={styles.intro}><div><h2>Desempenho comercial</h2><p>Acompanhe o trabalho realizado e os resultados de cada closer.</p></div><button onClick={() => setRevision(value => value + 1)} disabled={loading}>Atualizar</button></div>
    <div className={styles.filters}>
      <label>Período<select value={period} onChange={event => setPeriod(event.target.value)}><option value="day">Dia</option><option value="week">Semana</option><option value="month">Mês</option></select></label>
      <label>Data de referência<input type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
      <label>Responsável<select value={actor} onChange={event => setActor(event.target.value)}><option value="closers">Todas as closers</option><option value="all">Toda a equipe</option>{data?.users.map(user => <option key={user.id} value={user.id}>{user.name || 'Sem nome'}{user.isCloser ? ' · Closer' : ''}</option>)}<option value="unassigned">Vendas sem responsável</option></select></label>
    </div>
    {loading ? <p role="status">Carregando monitoramento…</p> : error ? <div role="alert"><p>{error}</p><button onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div> : data && report && <>
      <p>{dateLabel(data.range.start)} até {dateLabel(data.range.end)}{period === 'week' ? ' · Segunda a domingo' : ''}</p>
      <div className={styles.cards}>{[
        ['Leads trabalhados', report.leads, 'Leads únicos com atividade registrada'],
        ['Movimentações', report.events.length, 'Alterações salvas; um lead pode aparecer várias vezes'],
        ['Vendas fechadas', report.sales.length, 'Fechamentos atribuídos no período'],
        ['Faturamento bruto', money.format(report.gross), 'Valor das vendas fechadas no período'],
        ['Valor líquido', money.format(report.net), 'Valor líquido dos mesmos fechamentos'],
        ['Recebido dessas vendas', money.format(report.received), 'Parcelas já recebidas, independentemente da data do pagamento'],
      ].map(([label, value, hint]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>)}</div>
      <p className={styles.note}>As atividades identificadas por usuário começam com a implantação deste monitoramento. O histórico anterior não permite atribuir quem fez cada alteração. Vendas usam a responsável indicada no fechamento. Cada salvamento conta uma movimentação e pode conter mais de um tipo de ação.</p>
      <div className={styles.grid}>
        <section><h3>Atividades por tipo</h3>{report.actions.length ? report.actions.map(([action, count]) => <div className={styles.row} key={action}><span>{action}</span><b>{count}</b></div>) : <p>Nenhuma atividade registrada neste período.</p>}</section>
        <section><h3>Movimentos por etapa de destino</h3>{report.stages.length ? report.stages.map(([stage, count]) => <div className={styles.row} key={stage}><span>{stage}</span><b>{count}</b></div>) : <p>Nenhuma mudança de etapa no período.</p>}</section>
      </div>
      <section><h3>Resultado por responsável</h3><div className={styles.table}><table><thead><tr><th>Responsável</th><th>Leads únicos</th><th>Movimentações</th><th>Vendas</th><th>Faturamento bruto</th></tr></thead><tbody>{[...new Set([...report.events.map(row => row.event.actorId), ...report.sales.map(row => row.actorId || '')])].map(id => {
        const events = report.events.filter(row => row.event.actorId === id);
        const sales = report.sales.filter(row => (row.actorId || '') === id);
        return <tr key={id}><td>{id ? name(id) : 'Sem responsável'}</td><td>{new Set(events.map(row => row.leadId)).size}</td><td>{events.length}</td><td>{sales.length}</td><td>{money.format(sales.reduce((sum, row) => sum + Number(row.gross), 0))}</td></tr>;
      })}</tbody></table></div></section>
      <section><h3>Ritmo diário</h3><div className={styles.table}><table><thead><tr><th>Dia</th><th>Leads únicos</th><th>Movimentações</th></tr></thead><tbody>{report.days.map(([day, row]) => <tr key={day}><td>{dateLabel(day)}</td><td>{row.leads.size}</td><td>{row.movements}</td></tr>)}</tbody></table></div>{!report.days.length && <p>Sem atividade no período selecionado.</p>}</section>
      <section><h3>Últimas movimentações</h3><div className={styles.table}><table><thead><tr><th>Quando</th><th>Responsável</th><th>Lead</th><th>Atividade</th><th>Etapa</th></tr></thead><tbody>{report.events.slice(0, 100).map(row => <tr key={row.event.id}><td>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.event.at))}</td><td>{name(row.event.actorId)}</td><td>{row.leadName}</td><td>{row.event.actions.join(' · ')}</td><td>{row.event.previousStage && row.event.previousStage !== row.event.stage ? `${row.event.previousStage} → ` : ''}{row.event.stage}</td></tr>)}</tbody></table></div><small>Exibindo até 100 registros recentes. Os totais incluem todo o período.</small></section>
      <section><h3>Fechamentos do período</h3><div className={styles.table}><table><thead><tr><th>Lead</th><th>Closer</th><th>Bruto</th><th>Líquido</th></tr></thead><tbody>{report.sales.map(sale => <tr key={sale.id}><td>{sale.leadName}</td><td>{sale.closerName || (sale.actorId ? name(sale.actorId) : 'Sem responsável')}</td><td>{money.format(Number(sale.gross))}</td><td>{money.format(Number(sale.net))}</td></tr>)}</tbody></table></div>{!report.sales.length && <p>Nenhuma venda atribuída neste período.</p>}</section>
    </>}
  </div>;
}
