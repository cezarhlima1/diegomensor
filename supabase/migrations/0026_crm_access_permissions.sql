-- Acessos individuais do CRM, administrados dentro do próprio CRM.
alter table public.profiles
  add column if not exists crm_access boolean not null default false,
  add column if not exists crm_is_admin boolean not null default false,
  add column if not exists crm_permissions text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_crm_permissions_check;
alter table public.profiles add constraint profiles_crm_permissions_check check (
  crm_permissions <@ array[
    'geral','comercial','trafego','campanhas','pipeline','contatos',
    'financeiro','mensagens','admin'
  ]::text[]
);

create index if not exists profiles_crm_access_idx
  on public.profiles (crm_access)
  where crm_access = true;

