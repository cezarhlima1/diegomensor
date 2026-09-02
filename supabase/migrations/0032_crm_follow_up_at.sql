-- Data escolhida pela equipe para retomar o contato com o lead.
-- É independente da etapa atual e das datas da jornada comercial.
alter table public.crm_leads
  add column if not exists follow_up_at timestamptz;

comment on column public.crm_leads.follow_up_at is
  'Data planejada para o próximo retorno ao lead.';

create index if not exists crm_leads_follow_up_at_idx
  on public.crm_leads (follow_up_at)
  where follow_up_at is not null;
