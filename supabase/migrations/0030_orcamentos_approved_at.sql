-- Registra quando o orçamento efetivamente entrou no fechamento.
-- A coluna é aditiva e nullable: nenhum orçamento ou data existente é alterado.
alter table public.orcamentos
  add column if not exists approved_at timestamptz;

comment on column public.orcamentos.approved_at is
  'Data em que o status mudou para Aprovado; nula para aprovações históricas sem data confiável.';

create index if not exists orcamentos_approved_at_idx
  on public.orcamentos (empresa_id, approved_at)
  where approved_at is not null;
