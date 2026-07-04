"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Resultado padrão das actions de auth ({ ok, error } — convenção do projeto). */
export type ResultadoAuth = { ok: true } | { ok: false; error: string };

/** Tamanho mínimo da senha (inclusive) exigido no registro. */
const SENHA_MIN = 8;

const ERRO_GENERICO =
  "Não foi possível concluir o cadastro. Tente novamente em instantes.";

/**
 * Traduz erros do registro para mensagens pt-BR amigáveis.
 * Os tokens LIMITE_/FUNCIONARIO_ vêm do trigger check_limites (migration 0001)
 * e têm prefixo estável justamente para este mapeamento não parsear texto livre.
 */
function mapearErroRegistro(mensagem: string): string {
  if (/already.*(registered|exists)|email_exists/i.test(mensagem)) {
    return "Este e-mail já está cadastrado. Faça login para continuar.";
  }
  if (mensagem.includes("LIMITE_MAX_EMPRESAS")) {
    return "Limite de empresas atingido — contrate uma licença adicional.";
  }
  if (mensagem.includes("LIMITE_MAX_USUARIOS")) {
    return "Limite de usuários atingido — contrate uma licença adicional.";
  }
  return ERRO_GENERICO;
}

/**
 * Registra o primeiro admin de uma empresa:
 *  1. valida os campos;
 *  2. cria o usuário no Supabase Auth (e-mail já confirmado; o trigger
 *     on_auth_user_created cria o profile);
 *  3. cria empresa + vínculo admin em UMA transação via RPC
 *     criar_admin_com_empresa (migration 0002).
 * Se o passo 3 falhar, o usuário recém-criado é apagado (compensação) —
 * nunca fica usuário sem empresa. A sessão NÃO é criada aqui: o client
 * faz signInWithPassword após o ok (fluxo único de login).
 */
export async function registrarAdmin(dados: {
  nome: string;
  email: string;
  senha: string;
  nomeEmpresa: string;
}): Promise<ResultadoAuth> {
  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  const senha = dados.senha;
  const nomeEmpresa = dados.nomeEmpresa.trim();

  if (!nome || !email || !senha || !nomeEmpresa) {
    return { ok: false, error: "Preencha todos os campos." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (senha.length < SENHA_MIN) {
    return {
      ok: false,
      error: `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`,
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (erroUsuario || !criado?.user) {
    return { ok: false, error: mapearErroRegistro(erroUsuario?.message ?? "") };
  }

  const { error: erroEmpresa } = await admin.rpc("criar_admin_com_empresa", {
    p_user_id: criado.user.id,
    p_nome_empresa: nomeEmpresa,
  });
  if (erroEmpresa) {
    // Compensação: desfaz a criação do usuário para não deixar estado
    // parcial (usuário sem empresa). Se a própria compensação falhar,
    // loga para o operador — o retry do usuário verá "e-mail já cadastrado".
    const { error: erroCompensacao } = await admin.auth.admin.deleteUser(
      criado.user.id
    );
    if (erroCompensacao) {
      console.error(
        `registrarAdmin: falha ao desfazer usuário ${criado.user.id} após erro no RPC:`,
        erroCompensacao.message
      );
    }
    return { ok: false, error: mapearErroRegistro(erroEmpresa.message) };
  }

  return { ok: true };
}

/**
 * Encerra a sessão (limpa os cookies de auth) e volta para /login.
 * Usada como action do <form> do botão Sair no HeaderLogado.
 */
export async function sair(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
