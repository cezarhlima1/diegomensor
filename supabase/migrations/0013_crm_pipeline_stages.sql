begin;

alter table public.crm_leads drop constraint if exists crm_leads_stage_check;
update public.crm_leads set stage = 'Primeiro contato' where stage = 'Contato feito';

create table if not exists public.crm_pipeline_stages (
  name text primary key,
  position integer not null,
  created_at timestamptz not null default now()
);

insert into public.crm_pipeline_stages(name, position) values
  ('Novo lead', 0), ('Primeiro contato', 1), ('Em conversação', 2),
  ('Reunião agendada', 3), ('Proposta', 4), ('Fechado', 5)
on conflict do nothing;

alter table public.crm_pipeline_stages enable row level security;
commit;
