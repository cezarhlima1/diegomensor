"use client";
import { useEffect, useRef, useState } from 'react';
import { contactedOn, phoneEnding, type ContactSummaryLead } from '@/lib/crm-contact-summary';
import styles from './crm.module.css';

export default function ContactSummary({ mode, leads, today, close, openLead, complete, whatsapp }: {
  mode: 'followups' | 'returns'; leads: ContactSummaryLead[]; today: string;
  close: () => void; openLead: (id: string) => void;
  complete: (id: string, mode: 'followups' | 'returns') => Promise<void>;
  whatsapp: (lead: ContactSummaryLead) => string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [onlyPending, setOnlyPending] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [mode]);
  const completed = (lead: ContactSummaryLead) => contactedOn(lead, today) && (mode === 'followups' || !lead.followUpAt);
  const doneCount = leads.filter(completed).length;
  const rows = onlyPending ? leads.filter(lead => !completed(lead)) : leads;
  async function check(id: string) {
    if (pending) return;
    setPending(id); setMessage('');
    try { await complete(id, mode); setMessage(mode === 'returns' ? 'Retorno registrado. A data agendada foi concluída.' : 'Histórico de contato atualizado.'); }
    catch { setMessage('Não foi possível salvar. O contato continua pendente; tente novamente.'); }
    finally { setPending(null); }
  }
  async function copy(lead: ContactSummaryLead) {
    try { await navigator.clipboard.writeText(phoneEnding(lead.phone)); setCopied(lead.id); setMessage('Últimos 4 dígitos copiados.'); }
    catch { setMessage('Não foi possível copiar. Selecione os últimos 4 dígitos no telefone e copie manualmente.'); }
  }
  return <section className={styles.contactSummary} aria-label={mode === 'returns' ? 'Resumo de retornos' : 'Resumo de follow-ups'}>
    <header><div><button type="button" onClick={close}>← Voltar à pipeline</button><h2 ref={heading} tabIndex={-1}>{mode === 'returns' ? 'Retornos agendados' : 'Follow-ups'}</h2><p>{mode === 'returns' ? 'Datas mais próximas primeiro, com atrasados no início. Marcar como feito conclui a data agendada e registra o contato.' : 'Faça os contatos e marque os concluídos hoje. O check fica salvo no histórico.'}</p></div><strong>{leads.length - doneCount} pendentes</strong></header>
    <label className={styles.contactSummaryFilter}><input type="checkbox" checked={onlyPending} onChange={event => setOnlyPending(event.target.checked)} /> Mostrar somente pendentes</label>
    <p role="status" aria-live="polite" className={styles.contactSummaryMessage}>{message}</p>
    <div className={styles.contactSummaryRows}>{rows.map(lead => {
      const done = completed(lead), ending = phoneEnding(lead.phone);
      return <article key={lead.id} className={done ? styles.contactSummaryDone : undefined}>
        <button type="button" className={styles.contactSummaryCheck} aria-label={`${done ? 'Desfazer contato de hoje de' : 'Marcar contato feito com'} ${lead.name}`} aria-pressed={done} disabled={!!pending || (mode === 'returns' && !lead.followUpAt)} onClick={() => void check(lead.id)}>{pending === lead.id ? '…' : done ? '✓' : ''}</button>
        <div><button type="button" className={styles.contactSummaryName} onClick={() => openLead(lead.id)}>{lead.name}</button><small>{lead.company || 'Oficina não informada'}</small><span>{lead.stage}{lead.product ? ` · ${lead.product}` : ''}</span>{lead.nextAction && <p>{lead.nextAction}</p>}</div>
        <div><strong className={styles.contactSummaryPhone}>{lead.phone || 'Telefone não informado'}</strong>{ending && <button type="button" onClick={() => void copy(lead)}>{copied === lead.id ? '✓ Copiado' : `Copiar final ${ending}`}</button>}</div>
        <div>{lead.followUpAt ? <time dateTime={lead.followUpAt}>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(new Date(lead.followUpAt))}</time> : mode === 'returns' ? <span>Sem data agendada</span> : <span>{done ? 'Feito hoje' : 'Pendente hoje'}</span>}{lead.phone && <a href={whatsapp(lead)} target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a>}<button type="button" onClick={() => openLead(lead.id)}>{mode === 'returns' ? 'Editar retorno' : 'Abrir cadastro'}</button></div>
      </article>;
    })}</div>
    {!rows.length && <p className={styles.contactSummaryEmpty}>Nenhum contato pendente nesta visualização.</p>}
  </section>;
}
