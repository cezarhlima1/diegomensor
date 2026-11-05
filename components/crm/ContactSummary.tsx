"use client";
import { useEffect, useRef, useState } from 'react';
import { contactDay, contactedOn, phoneEnding, matchesContactListFilters, type ContactSummaryLead } from '@/lib/crm-contact-summary';
import styles from './crm.module.css';

export default function ContactSummary({ title, mode, leads, today, close, openLead, complete, whatsapp, activateLead, covered = false }: {
  title: string; mode: 'followups' | 'returns'; leads: ContactSummaryLead[]; today: string;
  close: () => void; openLead: (id: string) => void;
  complete: (id: string, mode: 'followups' | 'returns') => Promise<void>;
  whatsapp: (lead: ContactSummaryLead) => string;
  activateLead?: (id: string) => void; covered?: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const lastOpened = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { if (!covered) lastOpened.current?.focus({ preventScroll: true }); }, [covered]);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => {
    if (!confirmed) return;
    const timer = window.setTimeout(() => setConfirmed(null), 800);
    return () => window.clearTimeout(timer);
  }, [confirmed]);
  const completed = (lead: ContactSummaryLead) => contactedOn(lead, today) && (mode === 'followups' || !lead.followUpAt);
  const doneCount = leads.filter(completed).length;
  const tagOptions = [...new Set(leads.flatMap(lead => lead.tags || []))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const rows = leads.filter(lead => matchesContactListFilters(lead, search, tags) && (status === 'all' || (status === 'done' ? completed(lead) : !completed(lead) || lead.id === pending || lead.id === confirmed)));
  const hasFilters = !!search || !!tags.length || status !== 'all';
  async function check(id: string) {
    if (pending || confirmed) return;
    const wasDone = leads.some(lead => lead.id === id && completed(lead));
    setPending(id); setMessage('');
    try { await complete(id, mode); if (!wasDone) setConfirmed(id); setMessage(mode === 'returns' ? 'Retorno registrado. A data agendada foi concluída.' : 'Histórico de contato atualizado.'); }
    catch { setMessage('Não foi possível salvar. O contato continua pendente; tente novamente.'); }
    finally { setPending(null); }
  }
  async function copy(lead: ContactSummaryLead) {
    try { await navigator.clipboard.writeText(phoneEnding(lead.phone)); setCopied(lead.id); setMessage('Últimos 4 dígitos copiados.'); }
    catch { setMessage('Não foi possível copiar. Selecione os últimos 4 dígitos no telefone e copie manualmente.'); }
  }
  return <div className={styles.contactSummaryBackdrop} inert={covered} aria-hidden={covered || undefined} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className={styles.contactSummary} role="dialog" aria-modal={!covered} aria-label={`Contatos de ${title}`} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, summary') || []);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <header><div><h2 ref={heading} tabIndex={-1}>{title}</h2><span>{rows.length} de {leads.length} contatos · {leads.length - doneCount} pendentes</span></div><button type="button" onClick={close} aria-label="Fechar lista de contatos">×</button></header>
    <div className={styles.contactListToolbar}>
      <label className={styles.contactListSearch}><span>Buscar contato</span><input type="search" placeholder="Nome, oficina ou telefone…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <details className={styles.contactListTagFilter}><summary>Etiquetas{tags.length ? ` · ${tags.length}` : ''}<span>⌄</span></summary><div><small>Mostrar qualquer uma das selecionadas</small>{tagOptions.length ? tagOptions.map(tag => <label key={tag}><input type="checkbox" checked={tags.includes(tag)} onChange={event => setTags(current => event.target.checked ? [...current, tag] : current.filter(value => value !== tag))} /><span>{tag}</span></label>) : <p>Nenhuma etiqueta nesta etapa.</p>}</div></details>
      <label className={styles.contactListStatus}><span>Situação</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos os contatos</option><option value="pending">Somente pendentes</option><option value="done">Feitos hoje</option></select></label>
      {hasFilters && <button type="button" className={styles.contactListClear} onClick={() => { setSearch(''); setTags([]); setStatus('all'); }}>Limpar filtros</button>}
    </div>
    {tags.length > 0 && <div className={styles.contactListSelectedTags}>{tags.map(tag => <button type="button" key={tag} onClick={() => setTags(current => current.filter(value => value !== tag))} aria-label={`Remover filtro ${tag}`}>{tag}<span>×</span></button>)}</div>}
    <p role="status" aria-live="polite" className={styles.contactSummaryMessage}>{message}</p>
    <div className={styles.contactListColumns} aria-hidden="true"><span /><span>Contato / oficina</span><span>Etiquetas / produto</span><span>Telefone</span><span>Atendimento</span></div>
    <div className={styles.contactSummaryRows}>{rows.map(lead => {
      const done = completed(lead), ending = phoneEnding(lead.phone);
      return <article key={lead.id} className={done ? styles.contactSummaryDone : undefined}>
        <button type="button" className={styles.contactSummaryCheck} aria-label={`${done ? 'Desfazer contato de hoje de' : 'Marcar contato feito com'} ${lead.name}`} aria-pressed={done} disabled={!!pending || !!confirmed || (mode === 'returns' && done)} onClick={() => void check(lead.id)}>{done ? '✓' : pending === lead.id ? '…' : ''}</button>
        <div><button type="button" className={styles.contactSummaryName} onClick={event => { lastOpened.current = event.currentTarget; openLead(lead.id); }}>{lead.name}<span aria-hidden="true">↗</span></button><small>{lead.company || 'Oficina não informada'}</small></div>
        <div className={styles.contactListLeadTags}>{lead.tags?.length ? <div>{lead.tags.map(tag => <span key={tag}>{tag}</span>)}</div> : <small>Sem etiqueta</small>}{lead.product && <small>{lead.product}</small>}</div>
        <div><strong className={styles.contactSummaryPhone}>{lead.phone || 'Telefone não informado'}</strong>{ending && <button type="button" onClick={() => void copy(lead)}>{copied === lead.id ? '✓ Copiado' : `Copiar final ${ending}`}</button>}</div>
        <div>{lead.followUpAt ? <time className={contactDay(lead.followUpAt) < today ? styles.contactSummaryLate : undefined} dateTime={lead.followUpAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(lead.followUpAt))}</time> : mode === 'returns' ? <span>Sem data agendada</span> : <span>{done ? 'Feito hoje' : 'Pendente hoje'}</span>}{lead.phone && <a href={whatsapp(lead)} onClick={() => activateLead?.(lead.id)} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}</div>
      </article>;
    })}</div>
    {!rows.length && <p className={styles.contactSummaryEmpty}>Nenhum contato encontrado com os filtros selecionados.</p>}
  </section></div>;
}
