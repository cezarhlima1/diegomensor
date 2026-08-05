-- Campos experimentais de contato/origem do orçamento.
-- A interface é liberada inicialmente apenas para o login de teste.
alter table public.orcamentos
  add column if not exists contato_cliente text not null default '',
  add column if not exists origem text;

alter table public.orcamentos
  drop constraint if exists orcamentos_origem_check;

alter table public.orcamentos
  add constraint orcamentos_origem_check
  check (origem is null or origem in ('Ligação', 'WhatsApp', 'Pessoalmente'));
