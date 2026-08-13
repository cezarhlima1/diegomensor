begin;

create or replace function public.crm_normalized_phone(value text)
returns text
language sql
immutable
as $$
  select case
    when regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g') ~ '^55[0-9]{10,11}$'
      then substring(regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g') from 3)
    else regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g')
  end;
$$;

create or replace function public.crm_prevent_duplicate_lead_phone()
returns trigger
language plpgsql
as $$
declare
  normalized text := public.crm_normalized_phone(new.phone);
begin
  if normalized <> '' and (tg_op = 'INSERT' or new.phone is distinct from old.phone) and exists (
    select 1
    from public.crm_leads existing
    where existing.id <> new.id
      and public.crm_normalized_phone(existing.phone) = normalized
  ) then
    raise exception 'crm_duplicate_lead_phone' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists crm_leads_unique_phone_guard on public.crm_leads;
create trigger crm_leads_unique_phone_guard
before insert or update of phone on public.crm_leads
for each row execute function public.crm_prevent_duplicate_lead_phone();

commit;
