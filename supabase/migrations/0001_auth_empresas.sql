-- ============================================================================
-- Migration 0001: fundação de auth, empresas e cálculo (Passo 1)
--
-- Modelo de segurança:
--   * ESCRITA: apenas via service role (server actions no Next.js). Nenhuma
--     policy de INSERT/UPDATE/DELETE é criada para o papel `authenticated`,
--     portanto qualquer escrita direta pelo client é negada pelo RLS.
--   * LEITURA: via RLS, com policies de SELECT mínimas por tabela.
--   * LIMITES DE LICENÇA: garantidos no banco por triggers (backstop),
--     independentemente da validação feita na aplicação.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabela: profiles
-- Espelho 1:1 de auth.users. O e-mail é denormalizado aqui porque auth.users
-- não é legível via RLS por outros membros, e a listagem de membros de uma
-- empresa precisa exibir o e-mail de cada um.
-- max_empresas: limite de licença de empresas por admin; o dono do produto
-- aumenta manualmente no banco quando o cliente contrata licença adicional.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  nome         text,
  email        text not null,
  max_empresas int  not null default 1,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabela: empresas
-- max_usuarios: limite de licença de usuários por empresa (default 2);
-- aumentado manualmente no banco mediante licença adicional.
-- valor_hora: resultado do Passo 1 (custoFinal). Fica aqui — e não em
-- calc_passo1 — porque QUALQUER membro (inclusive funcionário) pode lê-lo,
-- enquanto os insumos gerenciais do Passo 1 são restritos a admins.
-- ----------------------------------------------------------------------------
create table public.empresas (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  max_usuarios int  not null default 2,
  valor_hora   numeric not null default 0,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Tabela: empresa_usuarios
-- Vínculo N:N entre empresas e usuários, com papel por vínculo.
-- Regras de negócio (garantidas pelo trigger check_limites, abaixo):
--   * uma empresa não pode exceder empresas.max_usuarios membros;
--   * funcionário pertence a exatamente UMA empresa;
--   * admin não pode ser admin de mais empresas que profiles.max_empresas.
-- ----------------------------------------------------------------------------
create table public.empresa_usuarios (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  papel      text not null check (papel in ('admin', 'funcionario')),
  created_at timestamptz not null default now(),
  primary key (empresa_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Tabela: calc_passo1
-- Insumos gerenciais do Passo 1 da calculadora, por empresa (1:1).
-- custos: mapa { chaveDoCusto: valorMascarado } exatamente como o app usa
-- (strings pt-BR mascaradas, ex.: "1.500,00") — o cálculo é feito no app
-- por calcLogic.ts, fonte única da fórmula.
-- horas_mes / mecanicos: strings mascaradas de inteiros, como no app.
-- Leitura restrita a ADMINS da empresa: funcionário nunca vê estes insumos,
-- apenas o resultado (empresas.valor_hora).
-- ----------------------------------------------------------------------------
create table public.calc_passo1 (
  empresa_id    uuid primary key references public.empresas (id) on delete cascade,
  custos        jsonb not null default '{}',
  horas_mes     text,
  mecanicos     text,
  multiplicador numeric not null default 2,
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- Trigger: criação automática de profile ao criar usuário no Supabase Auth
-- ============================================================================

-- Insere o profile espelho quando um usuário é criado em auth.users.
-- nome vem de raw_user_meta_data.nome (definido no signup / auth.admin.createUser);
-- e-mail vem de auth.users.email (denormalizado — ver comentário de profiles).
-- security definer: roda com privilégios do dono para poder escrever em
-- public.profiles a partir do schema auth; search_path fixo evita hijack.
create function public.criar_profile_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (new.id, new.raw_user_meta_data ->> 'nome', new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_profile_novo_usuario();

-- ============================================================================
-- Trigger: check_limites — backstop dos limites de licença
-- ============================================================================

-- Valida, ANTES de inserir um vínculo em empresa_usuarios, as três regras de
-- licença. Os SELECT ... FOR UPDATE travam a linha da empresa/do profile para
-- serializar inserções concorrentes — sem o lock, duas inserções simultâneas
-- poderiam ambas passar na contagem e estourar o limite.
-- As mensagens têm prefixo estável (TOKEN:) para a aplicação mapear cada erro
-- para uma mensagem pt-BR amigável sem depender do texto completo.
create function public.check_limites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_usuarios int;
  v_max_empresas int;
begin
  -- Regra (a): a empresa não pode exceder max_usuarios membros.
  -- Lock na linha da empresa serializa inserções concorrentes na mesma empresa.
  select max_usuarios into v_max_usuarios
    from empresas
   where id = new.empresa_id
     for update;

  if (select count(*) from empresa_usuarios where empresa_id = new.empresa_id) >= v_max_usuarios then
    raise exception 'LIMITE_MAX_USUARIOS: a empresa % ja atingiu o limite de % usuario(s)',
      new.empresa_id, v_max_usuarios;
  end if;

  -- Lock na linha do profile do usuário, ANTES das regras (b) e (c):
  -- serializa todas as inserções de vínculo do MESMO usuário, em qualquer
  -- empresa. Sem ele, duas transações concorrentes inserindo o mesmo usuário
  -- em empresas DIFERENTES travariam apenas linhas diferentes de `empresas`,
  -- nenhuma veria o insert não-commitado da outra (READ COMMITTED) e ambas
  -- commitariam — funcionário em 2 empresas ou admin acima de max_empresas.
  perform 1 from profiles where id = new.user_id for update;

  -- Regra (b): funcionário pertence a exatamente UMA empresa.
  -- Qualquer vínculo pré-existente (em outra empresa; na mesma empresa a PK
  -- já bloqueia duplicata) impede vincular o usuário como funcionário.
  if new.papel = 'funcionario' then
    if exists (select 1 from empresa_usuarios where user_id = new.user_id) then
      raise exception 'FUNCIONARIO_JA_VINCULADO: o usuario % ja pertence a uma empresa', new.user_id;
    end if;
  end if;

  -- Regra (c): admin não pode ser admin de mais empresas que profiles.max_empresas.
  -- Validada aqui (e não em INSERT de empresas) porque é o vínculo admin↔empresa
  -- que consome a licença. O lock no profile já foi adquirido acima.
  if new.papel = 'admin' then
    select max_empresas into v_max_empresas
      from profiles
     where id = new.user_id;

    if (select count(*) from empresa_usuarios where user_id = new.user_id and papel = 'admin') >= v_max_empresas then
      raise exception 'LIMITE_MAX_EMPRESAS: o usuario % ja atingiu o limite de % empresa(s)',
        new.user_id, v_max_empresas;
    end if;
  end if;

  return new;
end;
$$;

create trigger check_limites_empresa_usuarios
  before insert on public.empresa_usuarios
  for each row execute function public.check_limites();

-- ============================================================================
-- Trigger: updated_at automático em calc_passo1
-- ============================================================================

-- Mantém updated_at correto em qualquer UPDATE, sem depender da aplicação.
create function public.atualizar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger calc_passo1_updated_at
  before update on public.calc_passo1
  for each row execute function public.atualizar_updated_at();

-- ============================================================================
-- RLS — Row Level Security
-- ============================================================================

-- Função auxiliar para as policies de membership.
-- POR QUE ELA EXISTE: uma policy de SELECT em empresa_usuarios que consultasse
-- a própria empresa_usuarios dispararia recursão infinita de RLS (erro 42P17).
-- Como security definer, esta função consulta a tabela SEM passar pelo RLS,
-- quebrando o ciclo. Retorna as empresas do usuário autenticado; com
-- p_papel = 'admin', apenas as empresas onde ele é admin.
create function public.minhas_empresas(p_papel text default null)
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select empresa_id
    from empresa_usuarios
   where user_id = auth.uid()
     and (p_papel is null or papel = p_papel);
$$;

-- RLS habilitado em TODAS as tabelas. Como não existe nenhuma policy de
-- INSERT/UPDATE/DELETE, toda escrita pelo papel authenticated/anon é negada;
-- apenas o service role (que ignora RLS) escreve — via server actions.
alter table public.profiles        enable row level security;
alter table public.empresas        enable row level security;
alter table public.empresa_usuarios enable row level security;
alter table public.calc_passo1     enable row level security;

-- profiles: cada usuário lê apenas o próprio profile.
create policy "profiles: select do proprio usuario"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- empresas: membro (admin ou funcionário) lê as empresas às quais pertence —
-- inclui valor_hora, que é o único dado do cálculo visível ao funcionário.
create policy "empresas: select se membro"
  on public.empresas for select
  to authenticated
  using (id in (select public.minhas_empresas()));

-- empresa_usuarios: membro lê os vínculos das empresas às quais pertence
-- (necessário para listar os membros da empresa). Usa minhas_empresas()
-- para evitar a recursão de RLS descrita acima.
create policy "empresa_usuarios: select das minhas empresas"
  on public.empresa_usuarios for select
  to authenticated
  using (empresa_id in (select public.minhas_empresas()));

-- calc_passo1: SOMENTE admins da empresa leem os insumos gerenciais do
-- Passo 1. Funcionário não tem nenhum canal de leitura destes dados —
-- ele recebe apenas o resultado consolidado (empresas.valor_hora).
create policy "calc_passo1: select apenas admin da empresa"
  on public.calc_passo1 for select
  to authenticated
  using (empresa_id in (select public.minhas_empresas('admin')));
