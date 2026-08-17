alter table public.crm_leads
  add column if not exists application jsonb;

comment on column public.crm_leads.application is
  'Aplicação estruturada enviada por formulários, incluindo respostas e atribuição UTM.';
