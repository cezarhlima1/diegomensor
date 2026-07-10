-- ============================================================================
-- Migration 0005: orcamentos — histórico de orçamentos por empresa
--
-- Antes desta migration os orçamentos ficavam só em localStorage (por
-- navegador/dispositivo). Passam a ficar no banco porque o fluxo de
-- aprovação (status) só faz sentido compartilhado entre os membros da
-- empresa — qualquer um precisa ver e, futuramente, aprovar o orçamento
-- criado por outro colega.
--
-- status: só duas opções, garantidas pelo CHECK — sem tabela de enum à
-- parte porque o conjunto é fixo e pequeno.
-- pecas: snapshot do resumo das peças no momento do salvamento (mesmo
-- formato de PecaResumo em calcLogic.ts) — não referencia calc_config, que
-- pode mudar depois sem afetar orçamentos já salvos.
-- ============================================================================

create table public.orcamentos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas (id) on delete cascade,
  nome_cliente text not null default '',
  nome_carro   text not null default '',
  placa        text not null default '',
  valor_hora   numeric not null default 0,
  horas        numeric not null default 0,
  mao_de_obra  numeric not null default 0,
  pecas        jsonb not null default '[]',
  valor_peca   numeric not null default 0,
  total        numeric not null default 0,
  status       text not null default 'Aguardando aprovação'
               check (status in ('Aguardando aprovação', 'Aprovado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger orcamentos_updated_at
  before update on public.orcamentos
  for each row execute function public.atualizar_updated_at();

alter table public.orcamentos enable row level security;

-- orcamentos: qualquer membro da empresa lê (admin ou funcionário criam e
-- acompanham orçamentos). Escrita só via service role (server actions),
-- como as demais tabelas desta base.
create policy "orcamentos: select se membro"
  on public.orcamentos for select
  to authenticated
  using (empresa_id in (select public.minhas_empresas()));
