"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ResultadoAuth } from "@/components/auth/actions";
import { ERRO_GENERICO, SENHA_MIN, emailValido } from "@/components/auth/authLogic";
import { calcularVencimentoTeste, mensagemErroCadastro, telefoneValido } from "./testeGratisLogic";

/**
 * Apaga o usuário recém-criado no Auth quando um passo POSTERIOR do fluxo
 * falha (RPC ou ativação da licença) — evita usuário órfão sem empresa ou
 * sem licença de teste válida. Cascade do banco (profiles/empresa_usuarios
 * referenciam auth.users.id on delete cascade) limpa o resto sozinho.
 * Helper privado: não exportado, então pode ser síncrono ou async livremente
 * mesmo em arquivo "use server" (a restrição vale só para exports).
 */
async function desfazerCriacao(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  contexto: string
): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error(
      `registrarTesteGratis: falha ao desfazer usuário ${userId} após ${contexto}:`,
      error.message
    );
  }
}

/**
 * Cadastro público de teste grátis: cria o usuário no Auth (já confirmado,
 * sem e-mail de verificação), a empresa e o vínculo admin (via RPC
 * transacional criar_admin_com_empresa), e ativa a licença de teste de
 * TESTE_DIAS dias. Espelha o padrão de criarEmpresaComAdmin
 * (components/admin/actions.ts), sem a checagem de super admin — é o
 * próprio lead se cadastrando, chamado por app/teste-gratis a partir de uma
 * página pública sem sessão.
 *
 * Diferença deliberada do padrão do admin: falha ao ativar a licença TAMBÉM
 * compensa apagando o usuário (o admin só loga e segue). Sem essa
 * compensação, uma falha nesse update deixaria license_expiry_at = null, que
 * pela semântica do produto significa "nunca expira" — acesso grátis
 * permanente sem nenhuma supervisão humana. Ver discovery da Fase 3.
 */
export async function registrarTesteGratis(dados: {
  nomeCompleto: string;
  nomeEmpresa: string;
  email: string;
  telefone: string;
  senha: string;
}): Promise<ResultadoAuth> {
  const nomeCompleto = dados.nomeCompleto.trim();
  const nomeEmpresa = dados.nomeEmpresa.trim();
  const email = dados.email.trim().toLowerCase();
  const telefone = dados.telefone.trim();
  const senha = dados.senha;

  if (!nomeCompleto || !nomeEmpresa || !email || !telefone || !senha) {
    return { ok: false, error: "Preencha todos os campos." };
  }
  if (!emailValido(email)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (!telefoneValido(telefone)) {
    return { ok: false, error: "Informe um telefone válido, com DDD." };
  }
  if (senha.length < SENHA_MIN) {
    return { ok: false, error: `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.` };
  }

  const admin = createSupabaseAdminClient();

  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nomeCompleto },
  });
  if (erroUsuario || !criado?.user) {
    return { ok: false, error: mensagemErroCadastro(erroUsuario?.message ?? "") };
  }

  const { error: erroRpc } = await admin.rpc("criar_admin_com_empresa", {
    p_user_id: criado.user.id,
    p_nome_empresa: nomeEmpresa,
  });
  if (erroRpc) {
    await desfazerCriacao(admin, criado.user.id, "erro na RPC criar_admin_com_empresa");
    return { ok: false, error: mensagemErroCadastro(erroRpc.message) };
  }

  const { error: erroLicenca } = await admin
    .from("profiles")
    .update({ license_expiry_at: calcularVencimentoTeste(), telefone })
    .eq("id", criado.user.id);
  if (erroLicenca) {
    await desfazerCriacao(admin, criado.user.id, "erro ao ativar a licença de teste");
    return { ok: false, error: ERRO_GENERICO };
  }

  return { ok: true };
}
