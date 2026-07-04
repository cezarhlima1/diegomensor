"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ERRO_GENERICO,
  MSG_EMAIL_JA_CADASTRADO,
  SENHA_MIN,
  emailValido,
  mapearErroBanco,
} from "./authLogic";

/** Resultado padrão das actions de auth ({ ok, error } — convenção do projeto). */
export type ResultadoAuth = { ok: true } | { ok: false; error: string };

/**
 * No contexto do REGISTRO, e-mail duplicado ganha a dica de login (a pessoa
 * provavelmente já tem conta); nos demais contextos a mensagem fica neutra.
 */
function mapearErroRegistro(mensagem: string): string {
  const erro = mapearErroBanco(mensagem, ERRO_GENERICO);
  return erro === MSG_EMAIL_JA_CADASTRADO
    ? `${erro} Faça login para continuar.`
    : erro;
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
  if (!emailValido(email)) {
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
 * Falha do signOut é logada mas não bloqueia o redirect: o usuário pediu
 * para sair e a pior consequência é a sessão expirar sozinha depois.
 */
export async function sair(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("sair: falha no signOut do Supabase:", error.message);
  }
  redirect("/login");
}
