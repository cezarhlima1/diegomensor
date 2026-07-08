-- ============================================================================
-- Migration 0004: calc_config — markup de peças e sufixo do orçamento
--
-- Diferente de calc_passo1 (admin-only): estes dados são usados e editados
-- nos Passos 2-3 por QUALQUER membro da empresa (admin ou funcionário) — a
-- leitura/escrita não é restrita por papel, só por vínculo com a empresa.
--
-- markup_tiers: um número (%) por faixa de custo, na MESMA ordem/quantidade
-- de DEFAULT_MARKUP_TIERS em calcLogic.ts — o app é a fonte dos rótulos e
-- limites das faixas; o banco só guarda os percentuais editados.
-- sufixo_orcamento: texto livre anexado ao final da mensagem de orçamento
-- (WhatsApp/copiar). Default é o texto padrão de formas de pagamento/validade.
-- ============================================================================

create table public.calc_config (
  empresa_id       uuid primary key references public.empresas (id) on delete cascade,
  markup_tiers     jsonb not null default '[200, 100, 80, 70, 65]'::jsonb,
  sufixo_orcamento text  not null default $$Valores sujeito a alteração

💰 Formas de pagamento:
➡️ Cartões de crédito e débito (pagamento em até ?? x sem juros nos cartões de crédito, ou em até ??x com acréscimo da encargos da máquina de cartão)
➡️ CDC Viacredi (consulte simulação)

Orçamentos possui validade de 7 dias.

Equipe???
Excelência em qualidade e atendimento$$,
  updated_at       timestamptz not null default now()
);

create trigger calc_config_updated_at
  before update on public.calc_config
  for each row execute function public.atualizar_updated_at();

alter table public.calc_config enable row level security;

-- calc_config: qualquer membro da empresa lê (admin ou funcionário usam os
-- Passos 2-3). Escrita só via service role (server action salvarPasso2Config),
-- como as demais tabelas desta migration.
create policy "calc_config: select se membro"
  on public.calc_config for select
  to authenticated
  using (empresa_id in (select public.minhas_empresas()));
