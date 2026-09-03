-- Totais gerais da ação, sem atribuir presença a participantes individuais.
-- As colunas são aditivas e não alteram ações ou participantes já cadastrados.
alter table public.crm_commercial_actions
  add column if not exists confirmed_count integer not null default 0 check (confirmed_count >= 0),
  add column if not exists attended_count integer not null default 0 check (attended_count >= 0);
