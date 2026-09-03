-- Situação individual de presença em ações comerciais.
-- A coluna é aditiva e não altera os participantes já cadastrados.
alter table public.crm_action_participants
  add column if not exists participation_status text not null default 'Inscrito';

alter table public.crm_action_participants
  drop constraint if exists crm_action_participants_participation_status_check;

alter table public.crm_action_participants
  add constraint crm_action_participants_participation_status_check
  check (participation_status in ('Inscrito','Confirmado','Participou','Não compareceu','Cancelado'));
