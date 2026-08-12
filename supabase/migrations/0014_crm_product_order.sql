begin;

alter table public.crm_products
  add column if not exists position integer not null default 0;

with ordered as (
  select id, row_number() over (order by gross_price, created_at) - 1 as new_position
  from public.crm_products
)
update public.crm_products p set position = ordered.new_position
from ordered where ordered.id = p.id;

commit;
