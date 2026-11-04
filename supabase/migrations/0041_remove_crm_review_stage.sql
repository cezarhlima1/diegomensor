begin;
select pg_advisory_xact_lock(hashtext('crm-pipeline-stages'));
lock table public.crm_leads in share row exclusive mode;
-- Retire this column only if it is genuinely empty. Never move its contacts.
delete from public.crm_pipeline_stages
where name='Revisar entrada'
  and not exists(select 1 from public.crm_leads where stage='Revisar entrada');
insert into public.crm_state(key,value)
select 'deleted_pipeline_stage:Revisar entrada','true'
where not exists(select 1 from public.crm_pipeline_stages where name='Revisar entrada')
  and not exists(select 1 from public.crm_leads where stage='Revisar entrada')
on conflict(key) do update set value=excluded.value,updated_at=now();
commit;
