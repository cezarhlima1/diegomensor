export type Activity = { id: string; kind: 'activity'; at: string; actorId: string; actions: string[]; stage?: string; previousStage?: string };
// Compare persisted records, never client-supplied activity or timestamps.
export function auditLeadChange(before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined, actorId: string): Activity | null {
  if (!after || !actorId) return null;
  const actions: string[] = [];
  if (!before) actions.push('Lead cadastrado');
  else {
    if (before.stage !== after.stage) actions.push('Mudança de etapa');
    const oldContacts = Array.isArray(before.contact_checkpoints) ? before.contact_checkpoints : [];
    if ((Array.isArray(after.contact_checkpoints) ? after.contact_checkpoints : []).some(at => !oldContacts.includes(at))) actions.push('Contato registrado');
    if (before.meeting_scheduled_for !== after.meeting_scheduled_for) actions.push('Agendamento atualizado');
    if (before.meeting_outcome !== after.meeting_outcome) actions.push(`Reunião: ${after.meeting_outcome || 'Sem resultado'}`);
    if (before.follow_up_at && !after.follow_up_at) actions.push('Retorno concluído ou removido');
    else if (before.follow_up_at !== after.follow_up_at) actions.push('Retorno agendado');
    if (['notes', 'next_action', 'temperature', 'tags', 'product', 'name', 'company', 'phone', 'email', 'source'].some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))) actions.push('Cadastro atualizado');
  }
  if (!actions.length) return null;
  const at = new Date().toISOString();
  return { id: `activity:${crypto.randomUUID()}`, kind: 'activity', at, actorId, actions, stage: String(after.stage || ''), previousStage: before ? String(before.stage || '') : undefined };
}
export function monitoringRange(period: string, date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return null;
  const end = new Date(day);
  if (period === 'week') { day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7); end.setTime(day.getTime()); end.setUTCDate(end.getUTCDate() + 6); }
  else if (period === 'month') { day.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1, 0); }
  else if (period !== 'day') return null;
  return { start: day.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export type MonitoringCloser = { id: string; name: string };
export function closerSelection(closers: MonitoringCloser[], selected: string) {
  if (closers.some(closer => closer.id === selected)) return selected;
  return closers.length === 1 ? closers[0].id : 'closers';
}
export function closerPerformance(
  closers: MonitoringCloser[],
  events: { leadId: string; event: { actorId: string } }[],
  sales: { actorId?: string; gross: number }[],
  selected: string,
) {
  return closers.filter(closer => selected === 'closers' || closer.id === selected).map(closer => {
    const activity = events.filter(row => row.event.actorId === closer.id);
    const closings = sales.filter(row => row.actorId === closer.id);
    return { id: closer.id, name: closer.name, leads: new Set(activity.map(row => row.leadId)).size, movements: activity.length, sales: closings.length, gross: closings.reduce((sum, row) => sum + Number(row.gross), 0) };
  }).sort((a, b) => b.movements - a.movements || b.gross - a.gross || a.name.localeCompare(b.name, 'pt-BR'));
}
