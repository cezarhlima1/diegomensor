begin;

alter table public.crm_expenses
  add column if not exists is_fixed boolean not null default false;

update public.crm_expenses
set is_fixed = true
where category in ('Equipe', 'Ferramentas', 'Operacional')
  and is_fixed = false;

comment on column public.crm_expenses.is_fixed is
  'Despesas fixas são projetadas automaticamente nos meses posteriores ao primeiro vencimento.';

commit;
