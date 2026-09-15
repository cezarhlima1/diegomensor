begin;

-- INSERT triggers run before ON CONFLICT resolves an existing lead ID.
-- Editing an existing identity must not reject legacy duplicate phone records.
create or replace function public.crm_prevent_duplicate_lead_phone()
returns trigger
language plpgsql
as $$
declare
  normalized text := public.crm_normalized_phone(new.phone);
begin
  if normalized = '' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if normalized = public.crm_normalized_phone(old.phone) then
      return new;
    end if;
  elsif exists (
    select 1 from public.crm_leads existing
    where existing.id = new.id
      and public.crm_normalized_phone(existing.phone) = normalized
  ) then
    return new;
  end if;
  if exists (
    select 1 from public.crm_leads existing
    where existing.id <> new.id
      and public.crm_normalized_phone(existing.phone) = normalized
  ) then
    raise exception 'crm_duplicate_lead_phone' using errcode = '23505';
  end if;
  return new;
end;
$$;

commit;
