begin;

update public.crm_purchases
set gross_value = greatest(gross_value, 0),
    net_value = least(greatest(net_value, 0), greatest(gross_value, 0));

update public.crm_traffic_campaigns
set investment = greatest(investment, 0),
    sales = greatest(sales, 0),
    gross_revenue = greatest(gross_revenue, 0),
    net_revenue = case when net_revenue is null then null else least(greatest(net_revenue, 0), greatest(gross_revenue, 0)) end;

update public.crm_products
set gross_price = greatest(gross_price, 0),
    net_price = least(greatest(net_price, 0), greatest(gross_price, 0));

alter table public.crm_purchases
  drop constraint if exists crm_purchases_values_check,
  add constraint crm_purchases_values_check check (gross_value >= 0 and net_value >= 0 and net_value <= gross_value);

alter table public.crm_traffic_campaigns
  drop constraint if exists crm_traffic_values_check,
  add constraint crm_traffic_values_check check (investment >= 0 and sales >= 0 and gross_revenue >= 0 and (net_revenue is null or (net_revenue >= 0 and net_revenue <= gross_revenue)));

alter table public.crm_products
  drop constraint if exists crm_products_net_check,
  add constraint crm_products_net_check check (net_price <= gross_price);

commit;
