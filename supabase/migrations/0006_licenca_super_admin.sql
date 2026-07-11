-- ============================================================================
-- Migration 0006: licença por usuário + super admin geral
--
-- license_expiry_at: data de vencimento da licença de um usuário (pessoa).
-- NULL significa "nunca expira" — é o valor de todos os usuários existentes
-- (mantidos sem data, conforme decisão do produto) e continua NULL por
-- padrão para novos registros feitos fora do fluxo de convite de equipe.
-- Quando um admin de empresa cria um novo usuário (adicionarUsuario), a
-- aplicação copia o valor do próprio admin para o novo usuário — não há
-- default de banco para isso, é responsabilidade da server action.
--
-- is_super_admin: marca o usuário que acessa a tela /admin (gestão geral de
-- empresas e licenças, fora do escopo de qualquer empresa). Não passa por
-- empresa_usuarios — é uma permissão global, não um papel de empresa.
-- ============================================================================

alter table public.profiles
  add column license_expiry_at timestamptz,
  add column is_super_admin boolean not null default false;
