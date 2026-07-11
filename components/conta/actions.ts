"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSessaoComEmpresa, type SessaoComEmpresa } from "@/lib/auth/sessao";
import type { Papel } from "@/lib/db/types";
import type { ResultadoAuth } from "@/components/auth/actions";
import {
  ERRO_GENERICO,
  MSG_LIMITE_EMPRESAS,
  MSG_LIMITE_USUARIOS,
  SENHA_MIN,
  emailValido,
  mapearErroBanco,
} from "@/components/auth/authLogic";

/**
 * Resolve a sessão e exige papel ADMIN na empresa ativa. Toda action de
 * gestão passa por aqui ANTES de qualquer leitura/escrita privilegiada —
 * a validação é no servidor (cookies da sessão), nunca só na UI.
 * Retorna null quando o chamador não pode gerenciar (sem sessão ou
 * funcionário); o chamador da função devolve o erro padrão.
 */
async function exigirAdminDaEmpresaAtiva(): Promise<SessaoComEmpresa | null> {
  const sessao = await getSessaoComEmpresa();
  if (!sessao || sessao.empresaAtiva.papel !== "admin") return null;
  return sessao;
}

const ERRO_SEM_PERMISSAO =
  "Você não tem permissão para gerenciar esta empresa.";

/**
 * Cria um usuário (admin ou funcionário) na empresa ativa do chamador.
 * Ordem de segurança do fluxo (DW-3.1):
 *  1. valida papel admin do CHAMADOR no servidor;
 *  2. valida o limite max_usuarios ANTES de criar no Auth — exceder o
 *     limite não cria nada em lugar nenhum;
 *  3. cria o usuário no Auth (e-mail já confirmado) e insere o vínculo;
 *     se o vínculo falhar (ex.: trigger de limite em corrida), o usuário
 *     do Auth é apagado (compensação).
 */
export async function adicionarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
}): Promise<ResultadoAuth> {
  const sessao = await exigirAdminDaEmpresaAtiva();
  if (!sessao) return { ok: false, error: ERRO_SEM_PERMISSAO };
  const empresaId = sessao.empresaAtiva.id;

  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  const senha = dados.senha;
  const papel = dados.papel;

  if (!nome || !email || !senha) {
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
  if (papel !== "admin" && papel !== "funcionario") {
    return { ok: false, error: "Papel inválido." };
  }

  const admin = createSupabaseAdminClient();

  // Limite ANTES de criar no Auth: exceder max_usuarios não cria nada.
  // O trigger check_limites continua como backstop para corridas.
  const { data: empresa, error: erroEmpresa } = await admin
    .from("empresas")
    .select("max_usuarios")
    .eq("id", empresaId)
    .single();
  const { count: totalMembros, error: erroContagem } = await admin
    .from("empresa_usuarios")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId);
  // Licença do admin que está criando o usuário: o novo usuário herda a
  // mesma data de vencimento (DW da licença por pessoa) — só o super admin
  // define expiração "do zero"; quem cria dentro de uma empresa propaga a
  // que já existe para o próprio admin.
  const { data: adminProfile, error: erroAdminProfile } = await admin
    .from("profiles")
    .select("license_expiry_at")
    .eq("id", sessao.userId)
    .single();
  if (
    erroEmpresa ||
    erroContagem ||
    !empresa ||
    totalMembros === null ||
    erroAdminProfile ||
    !adminProfile
  ) {
    return { ok: false, error: ERRO_GENERICO };
  }
  if (totalMembros >= empresa.max_usuarios) {
    return { ok: false, error: MSG_LIMITE_USUARIOS };
  }

  // E-mail já registrado (ex.: funcionário de outra empresa) falha aqui —
  // é o caminho normal do DW-3.2, mapeado para mensagem clara.
  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (erroUsuario || !criado?.user) {
    return {
      ok: false,
      error: mapearErroBanco(erroUsuario?.message ?? "", ERRO_GENERICO),
    };
  }

  const { error: erroVinculo } = await admin.from("empresa_usuarios").insert({
    empresa_id: empresaId,
    user_id: criado.user.id,
    papel,
  });
  if (erroVinculo) {
    // Compensação: sem vínculo o usuário não pode existir no Auth.
    const { error: erroCompensacao } = await admin.auth.admin.deleteUser(
      criado.user.id
    );
    if (erroCompensacao) {
      console.error(
        `adicionarUsuario: falha ao desfazer usuário ${criado.user.id} após erro no vínculo:`,
        erroCompensacao.message
      );
    }
    return { ok: false, error: mapearErroBanco(erroVinculo.message, ERRO_GENERICO) };
  }

  if (adminProfile.license_expiry_at) {
    const { error: erroLicenca } = await admin
      .from("profiles")
      .update({ license_expiry_at: adminProfile.license_expiry_at })
      .eq("id", criado.user.id);
    if (erroLicenca) {
      console.error(
        `adicionarUsuario: usuário criado, mas falhou propagar a licença para ${criado.user.id}:`,
        erroLicenca.message
      );
    }
  }

  revalidatePath("/conta");
  return { ok: true };
}

/**
 * Remove um membro da empresa ativa do chamador.
 * Regras: chamador precisa ser admin da empresa; o ÚLTIMO admin não pode
 * ser removido (na prática só acontece na auto-remoção — se o alvo fosse
 * OUTRO admin, haveria pelo menos dois).
 * Usuário Auth órfão (decisão da fase): se após remover o vínculo o
 * usuário não pertence a NENHUMA empresa, ele é apagado do Auth (o profile
 * cai por cascade) — conta sem empresa não consegue usar o produto e só
 * ocuparia o e-mail. Falha nessa limpeza não desfaz a remoção: é logada
 * para o operador.
 */
export async function removerUsuario(userIdAlvo: string): Promise<ResultadoAuth> {
  const sessao = await exigirAdminDaEmpresaAtiva();
  if (!sessao) return { ok: false, error: ERRO_SEM_PERMISSAO };
  const empresaId = sessao.empresaAtiva.id;

  const admin = createSupabaseAdminClient();

  const { data: vinculo, error: erroVinculo } = await admin
    .from("empresa_usuarios")
    .select("papel")
    .eq("empresa_id", empresaId)
    .eq("user_id", userIdAlvo)
    .maybeSingle();
  if (erroVinculo) return { ok: false, error: ERRO_GENERICO };
  if (!vinculo) {
    return { ok: false, error: "Usuário não encontrado nesta empresa." };
  }

  if (vinculo.papel === "admin") {
    const { count: totalAdmins, error: erroAdmins } = await admin
      .from("empresa_usuarios")
      .select("*", { count: "exact", head: true })
      .eq("empresa_id", empresaId)
      .eq("papel", "admin");
    if (erroAdmins || totalAdmins === null) {
      return { ok: false, error: ERRO_GENERICO };
    }
    if (totalAdmins <= 1) {
      return {
        ok: false,
        error: "A empresa precisa de pelo menos um administrador.",
      };
    }
  }

  const { error: erroRemocao } = await admin
    .from("empresa_usuarios")
    .delete()
    .eq("empresa_id", empresaId)
    .eq("user_id", userIdAlvo);
  if (erroRemocao) return { ok: false, error: ERRO_GENERICO };

  // Limpeza do usuário órfão (sem nenhum vínculo restante).
  const { count: vinculosRestantes, error: erroRestantes } = await admin
    .from("empresa_usuarios")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userIdAlvo);
  if (erroRestantes) {
    console.error(
      `removerUsuario: falha ao verificar vínculos restantes de ${userIdAlvo}:`,
      erroRestantes.message
    );
  } else if (vinculosRestantes === 0) {
    const { error: erroExclusao } = await admin.auth.admin.deleteUser(userIdAlvo);
    if (erroExclusao) {
      console.error(
        `removerUsuario: vínculo removido, mas falhou apagar o usuário órfão ${userIdAlvo} do Auth:`,
        erroExclusao.message
      );
    }
  }

  revalidatePath("/conta");
  return { ok: true };
}

/**
 * Cria uma empresa adicional para o admin chamador (DW-3.3).
 * O limite profiles.max_empresas é lido do banco A CADA chamada — aumentar
 * o valor manualmente no banco libera a criação sem mudança de código.
 * A escrita reusa a RPC transacional criar_admin_com_empresa (migration
 * 0002): empresa + vínculo admin são atômicos e o trigger check_limites
 * é o backstop do limite em caso de corrida.
 */
export async function criarEmpresa(nomeEmpresa: string): Promise<ResultadoAuth> {
  const sessao = await exigirAdminDaEmpresaAtiva();
  if (!sessao) return { ok: false, error: ERRO_SEM_PERMISSAO };

  const nome = nomeEmpresa.trim();
  if (!nome) return { ok: false, error: "Informe o nome da empresa." };

  const admin = createSupabaseAdminClient();

  const { data: profile, error: erroProfile } = await admin
    .from("profiles")
    .select("max_empresas")
    .eq("id", sessao.userId)
    .single();
  const { count: empresasComoAdmin, error: erroContagem } = await admin
    .from("empresa_usuarios")
    .select("*", { count: "exact", head: true })
    .eq("user_id", sessao.userId)
    .eq("papel", "admin");
  if (erroProfile || erroContagem || !profile || empresasComoAdmin === null) {
    return { ok: false, error: ERRO_GENERICO };
  }
  if (empresasComoAdmin >= profile.max_empresas) {
    return { ok: false, error: MSG_LIMITE_EMPRESAS };
  }

  const { error: erroCriacao } = await admin.rpc("criar_admin_com_empresa", {
    p_user_id: sessao.userId,
    p_nome_empresa: nome,
  });
  if (erroCriacao) {
    return { ok: false, error: mapearErroBanco(erroCriacao.message, ERRO_GENERICO) };
  }

  revalidatePath("/conta");
  return { ok: true };
}
