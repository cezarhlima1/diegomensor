-- ============================================================================
-- Migration 0007: novo status "Não aprovado" em orcamentos
--
-- O histórico de orçamentos passa a ter três estados: "Aguardando aprovação"
-- (default na criação), "Aprovado" e "Não aprovado" (cliente recusou). O
-- CHECK continua sendo a fonte de verdade do conjunto — sem tabela de enum,
-- pelo mesmo motivo da migration 0005 (conjunto fixo e pequeno).
-- ============================================================================

alter table public.orcamentos
  drop constraint orcamentos_status_check;

alter table public.orcamentos
  add constraint orcamentos_status_check
  check (status in ('Aguardando aprovação', 'Aprovado', 'Não aprovado'));
