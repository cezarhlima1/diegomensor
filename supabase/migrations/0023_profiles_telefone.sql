-- ============================================================================
-- Migration 0021: adiciona coluna telefone em profiles
--
-- telefone: número de telefone do usuário (opcional).
-- NULL significa campo não preenchido — é o valor padrão para usuários
-- existentes (não alterados). Preenchido apenas em novos cadastros
-- via /teste-gratis ou edição manual em /admin.
-- ============================================================================

alter table public.profiles
  add column telefone text;
