-- Resultado efetivo da reunião, preenchido pela equipe após a data marcada.
alter table public.crm_leads
  add column if not exists meeting_outcome text;

alter table public.crm_leads
  drop constraint if exists crm_leads_meeting_outcome_check;

alter table public.crm_leads
  add constraint crm_leads_meeting_outcome_check
  check (meeting_outcome is null or meeting_outcome in ('Agendada', 'Realizada', 'No-show', 'Cancelada'));

comment on column public.crm_leads.meeting_outcome is
  'Resultado da reunião: Agendada, Realizada, No-show ou Cancelada.';

create index if not exists crm_leads_meeting_outcome_idx
  on public.crm_leads (meeting_outcome, meeting_scheduled_for)
  where meeting_outcome is not null;
