create table if not exists public.crm_closer_goals (
  closer_user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount numeric(14,2) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (closer_user_id, month)
);

alter table public.crm_closer_goals enable row level security;
