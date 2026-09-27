-- ============================================================================
-- Migration 0040: origem do cadastro + marca de boas-vindas do teste grátis
--
-- origem: de onde veio o cadastro (ex.: 'teste_gratis'). Nulo para cadastros
-- anteriores a esta coluna e para os criados por admin/super admin (que não
-- passam pela página de teste grátis) — não há como inferir retroativamente
-- a origem de quem já estava cadastrado antes desta migration.
--
-- onboarding_video_visto_em: quando o vídeo de boas-vindas do teste grátis
-- foi mostrado na primeira visita à calculadora. Nulo = ainda não visto.
-- ============================================================================

begin;

alter table public.profiles add column if not exists origem text;
alter table public.profiles add column if not exists onboarding_video_visto_em timestamptz;

comment on column public.profiles.origem is
  'De onde veio o cadastro (ex.: teste_gratis). Nulo para cadastros anteriores a esta coluna ou criados por admin/super admin.';
comment on column public.profiles.onboarding_video_visto_em is
  'Quando o vídeo de boas-vindas do teste grátis foi exibido — marca "já visto" para não reexibir.';

commit;
