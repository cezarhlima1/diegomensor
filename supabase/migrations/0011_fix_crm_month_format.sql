begin;

alter table public.crm_monthly_goals
  drop constraint if exists crm_monthly_goals_month_check;

alter table public.crm_monthly_goals
  add constraint crm_monthly_goals_month_check
  check (month ~ '^[0-9]{4}-[0-9]{2}$');

commit;
