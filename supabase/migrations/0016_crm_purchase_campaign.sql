begin;

alter table public.crm_purchases
  add column if not exists traffic_campaign_id text references public.crm_traffic_campaigns(id) on delete set null;

create index if not exists crm_purchases_traffic_campaign_idx
  on public.crm_purchases(traffic_campaign_id) where traffic_campaign_id is not null;

commit;
