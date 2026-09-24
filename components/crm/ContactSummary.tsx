"use client";
import { useEffect, useRef, useState } from 'react';
import { contactDay, contactedOn, phoneEnding, type ContactSummaryLead } from '@/lib/crm-contact-summary';
import styles from './crm.module.css';

export default function ContactSummary({ title, mode, leads, today, close, openLead, complete, whatsapp }: {
  title: string; mode: 'followups' | 'returns'; leads: ContactSummaryLead[]; today: string;
  close: () => void; openLead: (id: string) => void;
  complete: (id: string, mode: 'followups' | 'returns') => Promise<void>;
  whatsapp: (lead: ContactSummaryLead) => string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);
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
  const rows = onlyPending ? leads.filter(lead => !completed(lead) || lead.id === pending || lead.id === confirmed) : leads;
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
  return <div className={styles.contactSummaryBackdrop} onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <section ref={dialog} className={styles.contactSummary} role="dialog" aria-modal="true" aria-label={`Contatos de ${title}`} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key === 'Tab') {
        const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, summary') || []);
        const first = elements[0], last = elements.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
    <header><h2 ref={heading} tabIndex={-1}>{title} <small>{leads.length - doneCount} pendentes</small></h2><button type="button" onClick={close} aria-label="Fechar lista de contatos">×</button></header>
    <label className={styles.contactSummaryFilter}><input type="checkbox" checked={onlyPending} onChange={event => setOnlyPending(event.target.checked)} /> Mostrar somente pendentes</label>
    <p role="status" aria-live="polite" className={styles.contactSummaryMessage}>{message}</p>
    <div className={styles.contactSummaryRows}>{rows.map(lead => {
      const done = completed(lead), ending = phoneEnding(lead.phone);
      return <article key={lead.id} className={done ? styles.contactSummaryDone : undefined}>
        <button type="button" className={styles.contactSummaryCheck} aria-label={`${done ? 'Desfazer contato de hoje de' : 'Marcar contato feito com'} ${lead.name}`} aria-pressed={done} disabled={!!pending || !!confirmed || (mode === 'returns' && done)} onClick={() => void check(lead.id)}>{done ? '✓' : pending === lead.id ? '…' : ''}</button>
        <div><button type="button" className={styles.contactSummaryName} onClick={() => openLead(lead.id)}>{lead.name}</button><small>{lead.company || 'Oficina não informada'}</small>{(lead.product || lead.nextAction) && <details><summary>Ver contexto</summary>{lead.product && <span>{lead.product}</span>}{lead.nextAction && <p>{lead.nextAction}</p>}</details>}</div>
        <div><strong className={styles.contactSummaryPhone}>{lead.phone || 'Telefone não informado'}</strong>{ending && <button type="button" onClick={() => void copy(lead)}>{copied === lead.id ? '✓ Copiado' : `Copiar final ${ending}`}</button>}</div>
        <div>{lead.followUpAt ? <time className={contactDay(lead.followUpAt) < today ? styles.contactSummaryLate : undefined} dateTime={lead.followUpAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(lead.followUpAt))}</time> : mode === 'returns' ? <span>Sem data agendada</span> : <span>{done ? 'Feito hoje' : 'Pendente hoje'}</span>}{lead.phone && <a href={whatsapp(lead)} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}</div>
      </article>;
    })}</div>
    {!rows.length && <p className={styles.contactSummaryEmpty}>Nenhum contato pendente nesta visualização.</p>}
  </section></div>;
}
