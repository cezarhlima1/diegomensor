-- Configuração das closers e fotografia da comissão em cada fechamento.
-- Todos os campos são opcionais/default zero para preservar integralmente
-- usuários e compras já existentes.
alter table public.profiles
  add column if not exists crm_is_closer boolean not null default false,
  add column if not exists crm_commission_rate numeric(7,4) not null default 0
    check (crm_commission_rate >= 0 and crm_commission_rate <= 100);

-- Sem FK: crm_purchases vive no banco do CRM, profiles vive no banco principal.
alter table public.crm_purchases
  add column if not exists closer_user_id uuid,
  add column if not exists closer_name text,
  add column if not exists commission_rate numeric(7,4) not null default 0
    check (commission_rate >= 0 and commission_rate <= 100),
  add column if not exists commission_basis text not null default 'received'
    check (commission_basis in ('received'));

create index if not exists crm_purchases_closer_user_idx
  on public.crm_purchases (closer_user_id);

