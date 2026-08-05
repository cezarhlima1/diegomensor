-- Catálogo de nomes e custos de peças por empresa.
-- A leitura passa por RLS; a escrita é feita pelas server actions, que
-- validam o cadastro piloto antes de usar a service role.
create table public.pecas_catalogo (
  id               uuid primary key default gen_random_uuid(),
  empresa_id       uuid not null references public.empresas (id) on delete cascade,
  nome             text not null,
  nome_normalizado text not null,
  custo            numeric not null check (custo > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (empresa_id, nome_normalizado)
);

create trigger pecas_catalogo_updated_at
  before update on public.pecas_catalogo
  for each row execute function public.atualizar_updated_at();

alter table public.pecas_catalogo enable row level security;

create policy "pecas_catalogo: select se membro"
  on public.pecas_catalogo for select
  to authenticated
  using (empresa_id in (select public.minhas_empresas()));
