begin;

alter table public.crm_purchases
  add column if not exists purchase_source text;

update public.crm_purchases purchase
set purchase_source = case
  when purchase.purchase_origin = 'campaign' then 'Tráfego'
  else lead.source
end
from public.crm_leads lead
where lead.id = purchase.lead_id
  and (purchase.purchase_source is null or btrim(purchase.purchase_source) = '');

create index if not exists crm_purchases_source_closed_idx
  on public.crm_purchases(purchase_source, closed_at);

commit;
