begin;

alter table public.crm_purchases
  add column if not exists purchase_origin text not null default 'pipeline';

-- Vendas conciliadas por planilha continuam sendo de campanha mesmo quando a
-- campanha for excluída e a FK traffic_campaign_id virar null.
update public.crm_purchases
set purchase_origin = 'campaign'
where traffic_campaign_id is not null or external_sale_code is not null;

update public.crm_purchases
set purchase_origin = 'pipeline'
where purchase_origin <> 'campaign';

alter table public.crm_purchases
  drop constraint if exists crm_purchases_origin_check;

alter table public.crm_purchases
  add constraint crm_purchases_origin_check
  check (purchase_origin in ('campaign', 'pipeline'));

create index if not exists crm_purchases_origin_closed_idx
  on public.crm_purchases(purchase_origin, closed_at);

commit;
