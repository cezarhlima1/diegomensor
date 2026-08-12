begin;

alter table public.crm_leads
  add column if not exists traffic_campaign_id text references public.crm_traffic_campaigns(id) on delete set null;

alter table public.crm_purchases
  add column if not exists external_sale_code text;

create unique index if not exists crm_purchases_external_sale_unique
  on public.crm_purchases(external_sale_code) where external_sale_code is not null;
create index if not exists crm_leads_traffic_campaign_idx
  on public.crm_leads(traffic_campaign_id) where traffic_campaign_id is not null;

commit;
