-- Mantém separadas a data em que a reunião foi agendada e a data marcada
-- para ela acontecer. A coluna é opcional e não altera registros existentes.
alter table public.crm_leads
  add column if not exists meeting_scheduled_for timestamptz;

comment on column public.crm_leads.meeting_scheduled_for is
  'Data marcada para a reunião; meeting_at continua sendo a data do agendamento.';

create index if not exists crm_leads_meeting_scheduled_for_idx
  on public.crm_leads (meeting_scheduled_for)
  where meeting_scheduled_for is not null;
