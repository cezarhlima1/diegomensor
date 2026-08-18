alter table public.crm_leads
  add column if not exists contact_checkpoints jsonb not null default '[]'::jsonb;

comment on column public.crm_leads.contact_checkpoints is
  'Histórico de datas e horários em que houve contato ou follow-up com o lead.';
