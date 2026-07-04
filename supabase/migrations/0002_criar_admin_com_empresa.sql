-- ============================================================================
-- Migration 0002: função criar_admin_com_empresa (registro do admin)
--
-- Usada pela server action registrarAdmin (Fase 2). Depois que o usuário é
-- criado no Supabase Auth (auth.admin.createUser — fora do Postgres), esta
-- função cria a empresa e o vínculo admin em UMA transação: é impossível
-- ficar empresa sem vínculo ou vínculo sem empresa. A única janela de estado
-- parcial que resta (usuário criado no Auth, esta função falhou) é compensada
-- na aplicação com auth.admin.deleteUser.
--
-- O trigger check_limites (migration 0001) dispara no INSERT de
-- empresa_usuarios dentro da mesma transação — o backstop de licenças
-- (LIMITE_MAX_EMPRESAS etc.) continua valendo também para o registro.
-- ============================================================================

-- security definer + search_path fixo: mesmo padrão das funções da 0001.
-- Retorna o id da empresa criada.
create function public.criar_admin_com_empresa(
  p_user_id      uuid,
  p_nome_empresa text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid;
begin
  insert into empresas (nome)
  values (p_nome_empresa)
  returning id into v_empresa_id;

  insert into empresa_usuarios (empresa_id, user_id, papel)
  values (v_empresa_id, p_user_id, 'admin');

  return v_empresa_id;
end;
$$;

-- Least privilege: o PostgREST expõe funções ao papel authenticated por
-- default. Esta função é exclusiva do service role (server actions) — sem o
-- revoke, qualquer usuário logado poderia criar empresas via RPC direto,
-- pulando a validação da aplicação.
revoke execute on function public.criar_admin_com_empresa(uuid, text)
  from public, anon, authenticated;
