alter table public.crm_leads add column if not exists journey_history jsonb not null default '[]'::jsonb;
