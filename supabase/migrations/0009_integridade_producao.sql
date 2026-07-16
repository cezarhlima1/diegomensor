-- Troca o valor hora padrão de forma atômica. A validação da empresa e do
-- registro acontece na mesma transação que rebaixa o padrão anterior.
create function public.definir_valor_hora_padrao(
  p_empresa_id uuid,
  p_registro_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1
    from public.empresas
   where id = p_empresa_id
     for update;

  if not exists (
    select 1
      from public.valor_hora_historico
     where id = p_registro_id
       and empresa_id = p_empresa_id
  ) then
    raise exception 'VALOR_HORA_NAO_ENCONTRADO';
  end if;

  update public.valor_hora_historico
     set status = 'ativo'
   where empresa_id = p_empresa_id
     and status = 'padrao'
     and id <> p_registro_id;

  update public.valor_hora_historico
     set status = 'padrao'
   where id = p_registro_id
     and empresa_id = p_empresa_id;
end;
$$;

revoke execute on function public.definir_valor_hora_padrao(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.definir_valor_hora_padrao(uuid, uuid)
  to service_role;

-- Backstop de integridade para escritas futuras fora da aplicação.
alter table public.orcamentos
  add constraint orcamentos_valores_nao_negativos
  check (
    valor_hora >= 0 and horas >= 0 and mao_de_obra >= 0
    and valor_peca >= 0 and total >= 0
  );

alter table public.valor_hora_historico
  add constraint valor_hora_historico_valor_positivo
  check (valor_hora > 0);
