"use client";
import { useEffect, useId, useMemo, useState } from 'react';
import { closerSelection, closerPerformance, type Activity, type MonitoringCloser } from '@/lib/crm-monitoring';
import styles from './monitoring.module.css';
type Event = { leadId: string; leadName: string; event: Activity };
type Sale = { id: string; leadId: string; leadName: string; actorId?: string; closerName?: string; gross: number; net: number; received: number };
type Data = { range: { start: string; end: string }; closers: MonitoringCloser[]; events: Event[]; sales: Sale[] };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const dateLabel = (date: string) => date.split('-').reverse().join('/');
export default function Monitoring() {
  const [period, setPeriod] = useState('week');
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
      .then(body => {
        if (controller.signal.aborted) return;
        setData(body);
        setActor(selected => closerSelection(body.closers, selected));
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message || 'Falha de conexão.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, date, revision]);
  const report = useMemo(() => {
    if (!data) return null;
    const closerIds = new Set(data.closers.map(user => user.id));
    const matches = (id?: string) => !!id && closerIds.has(id) && (actor === 'closers' || id === actor);
    const events = data.events.filter(row => matches(row.event.actorId));
    const sales = data.sales.filter(row => matches(row.actorId));
    const actions = new Map<string, number>();
    const stages = new Map<string, number>();
    for (const row of events) {
      for (const action of row.event.actions) actions.set(action, (actions.get(action) || 0) + 1);
      if (row.event.actions.includes('Mudança de etapa')) stages.set(row.event.stage || 'Sem etapa', (stages.get(row.event.stage || 'Sem etapa') || 0) + 1);
    }
    return { events, sales, actions: [...actions], stages: [...stages], leads: new Set(events.map(row => row.leadId)).size, gross: sales.reduce((sum, row) => sum + Number(row.gross), 0), net: sales.reduce((sum, row) => sum + Number(row.net), 0), received: sales.reduce((sum, row) => sum + Number(row.received), 0) };
  }, [data, actor]);
  const name = (id?: string) => data?.closers.find(user => user.id === id)?.name || 'Usuário não disponível';
  const ranking = data && report ? closerPerformance(data.closers, report.events, report.sales, actor) : [];
  const actionTotal = report?.actions.reduce((sum, [, count]) => sum + count, 0) || 0;
  let angle = 0;
  const slices = (report?.actions || []).map(([label, count], index) => {
    const start = angle; angle += count / actionTotal * 100;
    return `${colors[index % colors.length]} ${start}% ${angle}%`;
  });
  return <div className={styles.monitoring}>
    <header className={styles.intro}>
      <div><span className={styles.eyebrow}>PAINEL DE PERFORMANCE</span><h2>{data?.closers.find(closer => closer.id === actor)?.name || 'Performance das closers'}</h2><p>Atividades vinculadas à conta de cada closer cadastrada no CRM.</p></div>
      <button className={styles.refresh} onClick={() => setRevision(value => value + 1)} disabled={loading}><Icon kind="refresh" />Atualizar dados</button>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.segments} role="group" aria-label="Período">{[['day', 'Dia'], ['week', 'Semana'], ['month', 'Mês']].map(([value, label]) => <button key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}</div>
      <label><span>Referência</span><input aria-label="Data de referência" type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label>
      <label className={styles.personFilter}><span>Closer</span><select aria-label="Closer" value={actor} onChange={event => setActor(event.target.value)}><option value="closers">Todas as closers</option>{data?.closers.map(closer => <option key={closer.id} value={closer.id}>{closer.name}</option>)}</select></label>
      <span className={styles.range}>{data && !loading ? `${dateLabel(data.range.start)} — ${dateLabel(data.range.end)}` : 'Consultando período…'}</span>
    </div>
    {loading ? <div className={styles.loading} role="status"><div /><span>Carregando os números da equipe…</span></div> : error ? <div className={styles.empty} role="alert"><Icon kind="activity" /><h3>Não foi possível carregar os dados</h3><p>{error}</p><button onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div> : data && report && <>
      <div className={styles.kpis}>{[
        { label: 'Leads trabalhados', value: report.leads.toLocaleString('pt-BR'), hint: 'Contatos únicos no período', icon: 'people', accent: 'blue' },
        { label: 'Movimentações', value: report.events.length.toLocaleString('pt-BR'), hint: 'Atividades salvas no CRM', icon: 'activity', accent: 'violet' },
        { label: 'Vendas fechadas', value: report.sales.length.toLocaleString('pt-BR'), hint: 'Fechamentos atribuídos', icon: 'sale', accent: 'green' },
        { label: 'Faturamento bruto', value: money.format(report.gross), hint: 'Gerado nos fechamentos do período', icon: 'money', accent: 'gold' },
      ].map(card => <article className={styles.kpi} data-accent={card.accent} key={card.label}><div className={styles.kpiTop}><span>{card.label}</span><i><Icon kind={card.icon} /></i></div><strong>{card.value}</strong><small>{card.hint}</small></article>)}</div>
      <div className={styles.mainGrid}>
        <section className={styles.panel}><PanelHeading label="VOLUME DE TRABALHO" title="Ritmo de movimentação"><span className={styles.legend}><i />Movimentações</span></PanelHeading><ActivityChart events={report.events} start={data.range.start} end={data.range.end} hourly={period === 'day'} /><div className={styles.chartFooter}><span><b>{report.events.length}</b> movimentações no período</span><span><b>{report.leads}</b> leads únicos trabalhados</span></div></section>
        <section className={styles.panel}><PanelHeading label="DISTRIBUIÇÃO" title="O que a equipe fez" /><div className={styles.donutWrap}><div className={styles.donut} role="img" aria-label={`${actionTotal} ações registradas por tipo`} style={{ background: slices.length ? `conic-gradient(${slices.join(',')})` : 'var(--monitor-line)' }}><div><strong>{actionTotal}</strong><span>ações registradas</span></div></div></div><div className={styles.actionLegend}>{report.actions.length ? report.actions.map(([label, count], index) => <div key={label}><i style={{ background: colors[index % colors.length] }} /><span>{label}</span><b>{count}</b><small>{Math.round(count / actionTotal * 100)}%</small></div>) : <p className={styles.noData}>As atividades aparecerão aqui assim que forem registradas.</p>}</div></section>
      </div>
      <div className={styles.bottomGrid}>
        <section className={styles.panel}><PanelHeading label="PIPELINE" title="Movimentações por etapa"><span className={styles.badge}>{report.stages.reduce((sum, [, count]) => sum + count, 0)} mudanças</span></PanelHeading><div className={styles.stageBars}>{report.stages.length ? [...report.stages].sort((a, b) => b[1] - a[1]).map(([stage, count], index) => <div key={stage}><div><span>{stage}</span><b>{count}</b></div><div className={styles.track}><i style={{ width: `${count / Math.max(...report.stages.map(([, value]) => value)) * 100}%`, background: colors[index % colors.length] }} /></div></div>) : <div className={styles.emptyChart}><Icon kind="activity" /><b>Nenhuma mudança de etapa</b><p>Os movimentos do pipeline aparecerão neste gráfico.</p></div>}</div><small className={styles.caption}>Contagem de mudanças por etapa de destino, incluindo retornos.</small></section>
        <section className={styles.panel}><PanelHeading label="EQUIPE" title="Desempenho por closer"><span className={styles.badge}>Por atividade</span></PanelHeading><div className={styles.ranking}>{ranking.length ? ranking.map((row, index) => <article key={row.id}><span className={styles.rankNumber}>{String(index + 1).padStart(2, '0')}</span><span className={styles.avatar} style={{ color: colors[index % colors.length] }}>{row.name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('')}</span><div className={styles.rankPerson}><b>{row.name}</b><span>{row.leads} leads · {row.movements} movimentações</span><div className={styles.rankTrack}><i style={{ width: `${row.movements / Math.max(1, ...ranking.map(item => item.movements)) * 100}%`, background: colors[index % colors.length] }} /></div></div><div className={styles.rankResult}><b>{money.format(row.gross)}</b><span>{row.sales} vendas</span></div></article>) : <div className={styles.emptyChart}><Icon kind="people" /><b>Aguardando os primeiros resultados</b><p>Cadastre uma usuária como closer na aba ADM para acompanhar seu desempenho.</p></div>}</div></section>
      </div>
      <section className={styles.financial}><div><span className={styles.eyebrow}>RESULTADO FINANCEIRO</span><h3>Resultados do período</h3><p>Valores das vendas fechadas no período selecionado.</p></div><div><span>Ticket médio bruto</span><strong>{money.format(report.sales.length ? report.gross / report.sales.length : 0)}</strong><small>Faturamento ÷ vendas</small></div><div><span>Valor líquido</span><strong>{money.format(report.net)}</strong><small>Dos fechamentos do período</small></div><div><span>Já recebido</span><strong>{money.format(report.received)}</strong><small>Recebimentos dessas vendas, em qualquer data</small></div></section>
      <details className={styles.details}><summary><span>Explorar os registros</span><small>Movimentações e fechamentos do período</small><b>+</b></summary><div className={styles.table}><h3>Últimas movimentações</h3><table><thead><tr><th>Quando</th><th>Responsável</th><th>Lead</th><th>Atividade</th><th>Etapa</th></tr></thead><tbody>{report.events.slice(0, 100).map(row => <tr key={row.event.id}><td>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.event.at))}</td><td>{name(row.event.actorId)}</td><td>{row.leadName}</td><td>{row.event.actions.join(' · ')}</td><td>{row.event.stage}</td></tr>)}</tbody></table>{!report.events.length && <p>Nenhuma movimentação registrada.</p>}<small>Até 100 registros recentes. Os indicadores incluem todo o período.</small><h3>Fechamentos</h3><table><thead><tr><th>Lead</th><th>Closer</th><th>Bruto</th><th>Líquido</th></tr></thead><tbody>{report.sales.map(sale => <tr key={sale.id}><td>{sale.leadName}</td><td>{sale.closerName || (sale.actorId ? name(sale.actorId) : 'Sem responsável')}</td><td>{money.format(Number(sale.gross))}</td><td>{money.format(Number(sale.net))}</td></tr>)}</tbody></table>{!report.sales.length && <p>Nenhum fechamento no período.</p>}</div></details>
      <p className={styles.footnote}>Movimentações vinculadas ao ID da conta que realizou a atividade, disponíveis a partir da implantação do monitoramento. Uma movimentação pode conter várias ações. Vendas atribuídas à responsável indicada no fechamento.</p>
    </>}
  </div>;
}

const colors = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf72', '#f472b6', '#7dd3c4', '#818cf8'];
function PanelHeading({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return <header className={styles.panelHeading}><div><span className={styles.eyebrow}>{label}</span><h3>{title}</h3></div>{children}</header>;
}
function Icon({ kind }: { kind: string }) {
  const paths: Record<string, React.ReactNode> = {
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /><circle cx="9" cy="7" r="4" /></>,
    activity: <path d="M3 17l5-5 4 3 8-10m-6 0h6v6" />,
    sale: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 5V3m8 2V3m-8 9 3 3 5-5" /></>,
    money: <><rect x="2" y="5" width="20" height="14" rx="3" /><circle cx="12" cy="12" r="3" /><path d="M6 12h.01M18 12h.01" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind] || paths.activity}</svg>;
}
function ActivityChart({ events, start, end, hourly }: { events: Event[]; start: string; end: string; hourly: boolean }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const bins: { label: string; value: number }[] = [];
  if (hourly) for (let hour = 0; hour < 24; hour++) bins.push({ label: `${String(hour).padStart(2, '0')}h`, value: 0 });
  else for (let day = new Date(`${start}T12:00:00Z`); day.toISOString().slice(0, 10) <= end; day.setUTCDate(day.getUTCDate() + 1)) bins.push({ label: day.toISOString().slice(0, 10), value: 0 });
  for (const row of events) {
    const date = new Date(row.event.at);
    const index = hourly ? Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(date)) : bins.findIndex(bin => bin.label === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date));
    if (bins[index]) bins[index].value++;
  }
  const max = Math.max(4, Math.ceil(Math.max(...bins.map(bin => bin.value)) / 4) * 4);
  const x = (index: number) => 48 + index * 672 / Math.max(1, bins.length - 1);
  const y = (value: number) => 212 - value / max * 176;
  const points = bins.map((bin, index) => `${x(index)},${y(bin.value)}`).join(' ');
  const selected = hover !== null && bins[hover] ? hover : null;
  const label = (value: string) => hourly ? value : `${value.slice(8, 10)}/${value.slice(5, 7)}`;
  return <div className={styles.chart}>
    <svg viewBox="0 0 752 260" role="img" aria-label={`Movimentações ${hourly ? 'por hora' : 'por dia'}: ${bins.map(bin => `${label(bin.label)}: ${bin.value}`).join('; ')}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity=".25" /><stop offset="100%" stopColor="#38bdf8" stopOpacity=".01" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="48" x2="720" y1={y(max * tick / 4)} y2={y(max * tick / 4)} className={styles.gridLine} /><text x="30" y={y(max * tick / 4) + 4} textAnchor="end">{max * tick / 4}</text></g>)}
      <polygon points={`48,212 ${points} 720,212`} fill={`url(#${id})`} /><polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {bins.map((bin, index) => <g key={bin.label}>{(index % Math.max(1, Math.ceil(bins.length / 8)) === 0 || index === bins.length - 1) && <text x={x(index)} y="244" textAnchor="middle">{label(bin.label)}</text>}<circle cx={x(index)} cy={y(bin.value)} r={selected === index ? 5 : 3} fill="#38bdf8" /><rect x={x(index) - 672 / Math.max(1, bins.length - 1) / 2} y="20" width={672 / Math.max(1, bins.length - 1)} height="200" fill="transparent" tabIndex={0} aria-label={`${label(bin.label)}: ${bin.value} movimentações`} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(index)} onBlur={() => setHover(null)}><title>{`${label(bin.label)}: ${bin.value} movimentações`}</title></rect></g>)}
      {selected !== null && <g pointerEvents="none"><line x1={x(selected)} x2={x(selected)} y1="28" y2="212" stroke="#38bdf8" strokeDasharray="4 4" opacity=".45" /><rect x={Math.max(48, Math.min(570, x(selected) - 75))} y="2" width="150" height="27" rx="6" className={styles.tooltipBox} /><text x={Math.max(123, Math.min(645, x(selected)))} y="20" textAnchor="middle" className={styles.tooltipText}>{label(bins[selected].label)} · {bins[selected].value} movimentos</text></g>}
    </svg>
    {!events.length && <span className={styles.chartEmpty}>Nenhuma movimentação neste período</span>}
  </div>;
}
