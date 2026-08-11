begin;

create extension if not exists pgcrypto;

create table if not exists public.crm_products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  gross_price numeric(14,2) not null default 0 check (gross_price >= 0),
  net_price numeric(14,2) not null default 0 check (net_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_product_price_history (
  id text primary key,
  product_id uuid not null references public.crm_products(id) on delete cascade,
  previous_gross_price numeric(14,2) not null,
  previous_net_price numeric(14,2) not null,
  gross_price numeric(14,2) not null,
  net_price numeric(14,2) not null,
  changed_at timestamptz not null
);

create table if not exists public.crm_lead_sources (
  name text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_leads (
  id text primary key,
  name text not null,
  company text not null default '',
  phone text not null default '',
  email text not null default '',
  source text not null default 'Cadastro',
  product text,
  stage text not null check (stage in ('Novo lead','Contato feito','Em conversação','Reunião agendada','Proposta','Fechado')),
  gross_value numeric(14,2) not null default 0,
  net_value numeric(14,2),
  temperature text not null check (temperature in ('Quente','Morno','Frio')),
  next_action text not null default '',
  display_date text not null default '',
  created_at timestamptz,
  conversation_at timestamptz,
  meeting_at timestamptz,
  proposal_at timestamptz,
  closed_at timestamptz,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists crm_leads_email_unique on public.crm_leads (lower(email)) where email <> '';
create index if not exists crm_leads_phone_idx on public.crm_leads (phone) where phone <> '';
create index if not exists crm_leads_created_at_idx on public.crm_leads (created_at);
create index if not exists crm_leads_closed_at_idx on public.crm_leads (closed_at);

create table if not exists public.crm_purchases (
  id text primary key,
  lead_id text not null references public.crm_leads(id) on delete cascade,
  product text not null,
  gross_value numeric(14,2) not null default 0,
  net_value numeric(14,2) not null default 0,
  closed_at timestamptz not null,
  is_repurchase boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists crm_purchases_lead_idx on public.crm_purchases (lead_id);
create index if not exists crm_purchases_closed_idx on public.crm_purchases (closed_at);

create table if not exists public.crm_traffic_campaigns (
  id text primary key,
  campaign_date date not null,
  month text not null,
  status text not null default 'Em andamento' check (status in ('Em andamento','Fechada')),
  name text not null,
  product text not null,
  investment numeric(14,2) not null default 0,
  clicks integer not null default 0,
  page_views integer not null default 0,
  checkouts integer not null default 0,
  sales integer not null default 0,
  gross_revenue numeric(14,2) not null default 0,
  net_revenue numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_traffic_campaign_date_idx on public.crm_traffic_campaigns (campaign_date);

create table if not exists public.crm_monthly_goals (
  month text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  amount numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_message_templates (
  id text primary key,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_products enable row level security;
alter table public.crm_product_price_history enable row level security;
alter table public.crm_lead_sources enable row level security;
alter table public.crm_leads enable row level security;
alter table public.crm_purchases enable row level security;
alter table public.crm_traffic_campaigns enable row level security;
alter table public.crm_monthly_goals enable row level security;
alter table public.crm_message_templates enable row level security;

commit;
