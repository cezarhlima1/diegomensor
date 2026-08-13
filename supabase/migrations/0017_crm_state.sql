begin;

create table if not exists public.crm_state (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.crm_state(key,value)
values ('leads_reset_at','2026-08-12T00:00:00.000Z')
on conflict(key) do update set value=excluded.value,updated_at=now();

commit;
