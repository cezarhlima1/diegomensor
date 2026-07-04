-- ============================================================================
-- Migration 0003: grant explícito de execute ao service_role
--
-- A migration 0002 revogou EXECUTE de criar_admin_com_empresa de public,
-- anon e authenticated, deixando o acesso do service_role dependente dos
-- DEFAULT PRIVILEGES padrão do Supabase (que concedem execute em funções de
-- public a postgres/anon/authenticated/service_role). Este grant torna a
-- permissão EXPLÍCITA: a função continua funcionando para as server actions
-- (registrarAdmin na Fase 2 e criarEmpresa na Fase 3) mesmo se os default
-- privileges do projeto forem alterados um dia.
--
-- Cleanup LOW herdado da revisão da Fase 2. Não altera comportamento hoje.
-- ============================================================================

grant execute on function public.criar_admin_com_empresa(uuid, text)
  to service_role;
