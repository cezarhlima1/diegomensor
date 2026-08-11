begin;

alter table public.crm_leads
  add column if not exists notes text not null default '',
  add column if not exists tags text[] not null default '{}';

commit;
