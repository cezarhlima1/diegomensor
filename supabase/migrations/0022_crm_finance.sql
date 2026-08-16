begin;

alter table public.crm_purchases
  add column if not exists payment_method text,
  add column if not exists payment_provider text,
  add column if not exists payment_notes text not null default '';

create table if not exists public.crm_receivables (
  id text primary key,
  purchase_id text not null references public.crm_purchases(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'Previsto' check (status in ('Previsto','Recebido','Atrasado','Cancelado')),
  received_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_id, installment_number)
);
create index if not exists crm_receivables_due_date_idx on public.crm_receivables(due_date);
create index if not exists crm_receivables_purchase_idx on public.crm_receivables(purchase_id);

create table if not exists public.crm_expenses (
  id text primary key,
  description text not null,
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  due_date date not null,
  status text not null default 'Prevista' check (status in ('Prevista','Paga','Atrasada','Cancelada')),
  paid_at date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_expenses_due_date_idx on public.crm_expenses(due_date);

alter table public.crm_receivables enable row level security;
alter table public.crm_expenses enable row level security;

commit;
