-- ============================================================================
-- Migration 0008: valor_hora_historico — valores hora salvos por empresa
--
-- O admin pode salvar no Passo 1 "fotografias" do valor hora calculado, com
-- nome e status:
--   * padrao — o valor exibido por default no orçamento; no máximo UM por
--     empresa (garantido pelo índice único parcial abaixo);
--   * ativo  — selecionável no orçamento como alternativa ao padrão;
--   * inativo — mantido no histórico, mas não selecionável.
--
-- Leitura: qualquer membro (o funcionário precisa selecionar o valor no
-- orçamento). Escrita: só via service role (server actions), que valida o
-- papel admin — mesmo modelo das demais tabelas.
-- ============================================================================

create table public.valor_hora_historico (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome       text not null,
  valor_hora numeric not null default 0,
  status     text not null default 'ativo'
             check (status in ('ativo', 'inativo', 'padrao')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No máximo um registro 'padrao' por empresa.
create unique index valor_hora_historico_padrao_unico
  on public.valor_hora_historico (empresa_id)
  where status = 'padrao';

create trigger valor_hora_historico_updated_at
  before update on public.valor_hora_historico
  for each row execute function public.atualizar_updated_at();

alter table public.valor_hora_historico enable row level security;

create policy "valor_hora_historico: select se membro"
  on public.valor_hora_historico for select
  to authenticated
  using (empresa_id in (select public.minhas_empresas()));
