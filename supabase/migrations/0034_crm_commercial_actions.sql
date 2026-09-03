-- Agenda comercial e participantes ficam isolados da pipeline até liberação explícita.
create table if not exists public.crm_commercial_actions (
  id text primary key,
  name text not null,
  starts_on date not null,
  ends_on date,
  description text not null default '',
  offered_product text,
  access_type text not null default 'Gratuita' check (access_type in ('Gratuita','Paga','Mista')),
  ticket_value numeric(14,2) not null default 0 check (ticket_value >= 0),
  status text not null default 'Planejada' check (status in ('Planejada','Em andamento','Finalizada','Cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_action_participants (
  id text primary key,
  action_id text not null references public.crm_commercial_actions(id) on delete cascade,
  lead_id text references public.crm_leads(id) on delete set null,
  name text not null,
  phone text not null default '',
  email text not null default '',
  source text not null default '',
  ticket_type text not null default 'Gratuito' check (ticket_type in ('Gratuito','Pago','Cortesia')),
  ticket_amount numeric(14,2) not null default 0 check (ticket_amount >= 0),
  payment_status text not null default 'Pendente' check (payment_status in ('Pendente','Recebido','Atrasado','Cancelado')),
  payment_date date,
  bought_product text,
  sale_amount numeric(14,2) not null default 0 check (sale_amount >= 0),
  sale_date date,
  crm_status text not null default 'Aguardando liberação' check (crm_status in ('Aguardando liberação','Liberado para o CRM','Conflito')),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_traffic_campaigns add column if not exists commercial_action_id text references public.crm_commercial_actions(id) on delete set null;
create index if not exists crm_actions_date_idx on public.crm_commercial_actions(starts_on);
create index if not exists crm_action_participants_action_idx on public.crm_action_participants(action_id,crm_status);
create unique index if not exists crm_action_participants_email_unique on public.crm_action_participants(action_id,lower(email)) where email<>'';
