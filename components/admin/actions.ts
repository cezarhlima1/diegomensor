"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Papel } from "@/lib/db/types";
import type { ResultadoAuth } from "@/components/auth/actions";
import {
  ERRO_GENERICO,
  MSG_LIMITE_USUARIOS,
  SENHA_MIN,
  emailValido,
  mapearErroBanco,
} from "@/components/auth/authLogic";

const ERRO_SEM_PERMISSAO = "Você não tem permissão para acessar esta área.";

/**
 * Resolve a sessão e exige profiles.is_super_admin. Toda action deste
 * arquivo passa por aqui ANTES de qualquer leitura/escrita global — é a
 * mesma validação já feita pelo middleware, repetida no servidor porque a
 * action pode ser invocada independentemente da navegação de página.
 */
async function exigirSuperAdmin(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_super_admin) return null;

  return user.id;
}

/** Um membro (linha de empresa_usuarios) com os dados de licença da pessoa. */
export type MembroAdmin = {
  userId: string;
  nome: string | null;
  email: string;
  papel: Papel;
  licencaAte: string | null;
};

/** Empresa com todos os membros, para a listagem geral do admin. */
export type EmpresaAdmin = {
  id: string;
  nome: string;
  maxUsuarios: number;
  createdAt: string;
  membros: MembroAdmin[];
};

type ResultadoCriarEmpresa = ResultadoAuth & { cadastroExistente?: boolean };

/**
 * Lista TODAS as empresas do produto com seus membros e a licença de cada
 * pessoa — visão que nenhum admin de empresa tem (cada um só vê a própria
 * empresa). Usa o admin client porque atravessa o RLS de profiles/empresas
 * de propósito: esta é a tela que existe para ver tudo.
 */
export async function listarEmpresasAdmin(): Promise<EmpresaAdmin[] | null> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return null;

  const admin = createSupabaseAdminClient();

  const [empresasRes, vinculosRes] = await Promise.all([
    admin.from("empresas").select("id, nome, max_usuarios, created_at").order("created_at"),
    admin
      .from("empresa_usuarios")
      .select("empresa_id, user_id, papel, profiles ( nome, email, license_expiry_at )")
      .order("created_at"),
  ]);
  if (empresasRes.error || vinculosRes.error || !empresasRes.data || !vinculosRes.data) {
    console.error(
      "listarEmpresasAdmin: falha ao carregar dados",
      empresasRes.error?.message ?? vinculosRes.error?.message
    );
    return null;
  }

  const porEmpresa = new Map<string, EmpresaAdmin>();
  for (const e of empresasRes.data) {
    porEmpresa.set(e.id, {
      id: e.id,
      nome: e.nome,
      maxUsuarios: e.max_usuarios,
      createdAt: e.created_at,
      membros: [],
    });
  }

  for (const v of vinculosRes.data) {
    const empresa = porEmpresa.get(v.empresa_id);
    if (!empresa) continue;
    const p = v.profiles as unknown as {
      nome: string | null;
      email: string;
      license_expiry_at: string | null;
    } | null;
    if (!p) continue;
    empresa.membros.push({
      userId: v.user_id,
      nome: p.nome,
      email: p.email,
      papel: v.papel as Papel,
      licencaAte: p.license_expiry_at,
    });
  }

  return Array.from(porEmpresa.values());
}

/**
 * Cria uma empresa nova junto com seu primeiro admin (super admin criando
 * um cliente novo do zero). Reusa a mesma RPC transacional do fluxo de
 * autoatendimento (criar_admin_com_empresa, migration 0002) — empresa +
 * vínculo admin continuam atômicos. A diferença deste fluxo é que quem
 * está criando não é o próprio admin (é o super admin), e a licença
 * (license_expiry_at) é definida explicitamente aqui.
 */
export async function criarEmpresaComAdmin(dados: {
  nomeEmpresa: string;
  nomeAdmin: string;
  emailAdmin: string;
  senhaAdmin: string;
  licencaAte: string | null;
  usarEmailExistente: boolean;
}): Promise<ResultadoCriarEmpresa> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };

  const nomeEmpresa = dados.nomeEmpresa.trim();
  const nomeAdmin = dados.nomeAdmin.trim();
  const emailAdmin = dados.emailAdmin.trim().toLowerCase();
  const senhaAdmin = dados.senhaAdmin;

  if (!nomeEmpresa || !nomeAdmin || !emailAdmin) {
    return { ok: false, error: "Preencha todos os campos." };
  }
  if (!emailValido(emailAdmin)) {
    return { ok: false, error: "Informe um e-mail válido." };
  }
  if (dados.licencaAte && Number.isNaN(Date.parse(dados.licencaAte))) {
    return { ok: false, error: "Data de vencimento inválida." };
  }

  const admin = createSupabaseAdminClient();
  const { data: perfilExistente, error: erroPerfilExistente } = await admin
    .from("profiles")
    .select("id, max_empresas")
    .eq("email", emailAdmin)
    .maybeSingle();
  if (erroPerfilExistente) return { ok: false, error: ERRO_GENERICO };

  if (perfilExistente) {
    if (!dados.usarEmailExistente) {
      return {
        ok: false,
        error: "Este e-mail já está cadastrado. Marque a opção abaixo para vincular o mesmo acesso como administrador desta nova empresa.",
      };
    }

    const { count: empresasAdmin, error: erroContagem } = await admin
      .from("empresa_usuarios")
      .select("*", { count: "exact", head: true })
      .eq("user_id", perfilExistente.id)
      .eq("papel", "admin");
    if (erroContagem || empresasAdmin === null) return { ok: false, error: ERRO_GENERICO };

    if (empresasAdmin >= perfilExistente.max_empresas) {
      const { error: erroLimite } = await admin
        .from("profiles")
        .update({ max_empresas: empresasAdmin + 1 })
        .eq("id", perfilExistente.id);
      if (erroLimite) return { ok: false, error: ERRO_GENERICO };
    }

    const { data: empresa, error: erroEmpresa } = await admin
      .from("empresas")
      .insert({ nome: nomeEmpresa })
      .select("id")
      .single();
    if (erroEmpresa || !empresa) return { ok: false, error: mapearErroBanco(erroEmpresa?.message ?? "", ERRO_GENERICO) };

    const { error: erroVinculo } = await admin.from("empresa_usuarios").insert({
      empresa_id: empresa.id,
      user_id: perfilExistente.id,
      papel: "admin",
    });
    if (erroVinculo) {
      await admin.from("empresas").delete().eq("id", empresa.id);
      return { ok: false, error: mapearErroBanco(erroVinculo.message, ERRO_GENERICO) };
    }

    if (dados.licencaAte) {
      await admin
        .from("profiles")
        .update({ license_expiry_at: new Date(dados.licencaAte).toISOString() })
        .eq("id", perfilExistente.id);
    }

    revalidatePath("/admin");
    return { ok: true, cadastroExistente: true };
  }

  if (!senhaAdmin) return { ok: false, error: "Informe uma senha para o novo administrador." };
  if (senhaAdmin.length < SENHA_MIN) {
    return { ok: false, error: `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.` };
  }

  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email: emailAdmin,
    password: senhaAdmin,
    email_confirm: true,
    user_metadata: { nome: nomeAdmin },
  });
  if (erroUsuario || !criado?.user) {
    return {
      ok: false,
      error: mapearErroBanco(erroUsuario?.message ?? "", ERRO_GENERICO),
    };
  }

  const { error: erroRpc } = await admin.rpc("criar_admin_com_empresa", {
    p_user_id: criado.user.id,
    p_nome_empresa: nomeEmpresa,
  });
  if (erroRpc) {
    const { error: erroCompensacao } = await admin.auth.admin.deleteUser(criado.user.id);
    if (erroCompensacao) {
      console.error(
        `criarEmpresaComAdmin: falha ao desfazer usuário ${criado.user.id} após erro na RPC:`,
        erroCompensacao.message
      );
    }
    return { ok: false, error: mapearErroBanco(erroRpc.message, ERRO_GENERICO) };
  }

  if (dados.licencaAte) {
    const { error: erroLicenca } = await admin
      .from("profiles")
      .update({ license_expiry_at: new Date(dados.licencaAte).toISOString() })
      .eq("id", criado.user.id);
    if (erroLicenca) {
      console.error(
        `criarEmpresaComAdmin: empresa e admin criados, mas falhou setar a licença de ${criado.user.id}:`,
        erroLicenca.message
      );
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Adiciona um usuário (admin ou funcionário) a uma empresa JÁ existente,
 * com a licença definida explicitamente pelo super admin — mesma validação
 * de limite de adicionarUsuario (components/conta/actions.ts), repetida
 * aqui porque o chamador não é um admin da própria empresa, é o super
 * admin agindo em nome de qualquer empresa.
 */
export async function adicionarUsuarioEmpresa(dados: {
  empresaId: string;
  nome: string;
  email: string;
  senha: string;
  papel: Papel;
  licencaAte: string | null;
}): Promise<ResultadoAuth> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };

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
  if (dados.licencaAte && Number.isNaN(Date.parse(dados.licencaAte))) {
    return { ok: false, error: "Data de vencimento inválida." };
  }

  const admin = createSupabaseAdminClient();

  const { data: empresa, error: erroEmpresa } = await admin
    .from("empresas")
    .select("max_usuarios")
    .eq("id", dados.empresaId)
    .single();
  const { count: totalMembros, error: erroContagem } = await admin
    .from("empresa_usuarios")
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", dados.empresaId);
  if (erroEmpresa || erroContagem || !empresa || totalMembros === null) {
    return { ok: false, error: ERRO_GENERICO };
  }
  if (totalMembros >= empresa.max_usuarios) {
    return { ok: false, error: MSG_LIMITE_USUARIOS };
  }

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
    empresa_id: dados.empresaId,
    user_id: criado.user.id,
    papel,
  });
  if (erroVinculo) {
    const { error: erroCompensacao } = await admin.auth.admin.deleteUser(criado.user.id);
    if (erroCompensacao) {
      console.error(
        `adicionarUsuarioEmpresa: falha ao desfazer usuário ${criado.user.id} após erro no vínculo:`,
        erroCompensacao.message
      );
    }
    return { ok: false, error: mapearErroBanco(erroVinculo.message, ERRO_GENERICO) };
  }

  if (dados.licencaAte) {
    const { error: erroLicenca } = await admin
      .from("profiles")
      .update({ license_expiry_at: new Date(dados.licencaAte).toISOString() })
      .eq("id", criado.user.id);
    if (erroLicenca) {
      console.error(
        `adicionarUsuarioEmpresa: usuário criado, mas falhou setar a licença de ${criado.user.id}:`,
        erroLicenca.message
      );
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Atualiza a data de vencimento da licença de uma pessoa. `licencaAte: null`
 * remove a data (licença nunca expira) — usado tanto para editar quanto
 * para "limpar" a expiração de alguém.
 */
export async function atualizarLicenca(
  userId: string,
  licencaAte: string | null
): Promise<ResultadoAuth> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };

  if (licencaAte && Number.isNaN(Date.parse(licencaAte))) {
    return { ok: false, error: "Data de vencimento inválida." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ license_expiry_at: licencaAte ? new Date(licencaAte).toISOString() : null })
    .eq("id", userId);
  if (error) {
    return { ok: false, error: ERRO_GENERICO };
  }

  revalidatePath("/admin");
  return { ok: true };
}

/** Atualiza o nome de uma empresa existente. */
export async function atualizarEmpresa(
  empresaId: string,
  nome: string
): Promise<ResultadoAuth> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };

  const nomeEmpresa = nome.trim();
  if (!nomeEmpresa) return { ok: false, error: "Informe o nome da empresa." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("empresas").update({ nome: nomeEmpresa }).eq("id", empresaId);
  if (error) return { ok: false, error: ERRO_GENERICO };

  revalidatePath("/admin");
  return { ok: true };
}

/** Atualiza os dados cadastrais de um usuário/admin de uma empresa. */
export async function atualizarUsuarioEmpresa(dados: {
  userId: string;
  nome: string;
  email: string;
  senha: string;
  licencaAte: string | null;
}): Promise<ResultadoAuth> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };
  if (dados.userId === superAdminId) {
    return { ok: false, error: "O cadastro do super admin não pode ser alterado aqui." };
  }

  const nome = dados.nome.trim();
  const email = dados.email.trim().toLowerCase();
  if (!nome || !email) return { ok: false, error: "Preencha nome e e-mail." };
  if (!emailValido(email)) return { ok: false, error: "Informe um e-mail válido." };
  if (dados.senha && dados.senha.length < SENHA_MIN) {
    return { ok: false, error: `A nova senha precisa ter pelo menos ${SENHA_MIN} caracteres.` };
  }
  if (dados.licencaAte && Number.isNaN(Date.parse(dados.licencaAte))) {
    return { ok: false, error: "Data de vencimento inválida." };
  }

  const admin = createSupabaseAdminClient();
  const { error: erroAuth } = await admin.auth.admin.updateUserById(dados.userId, {
    email,
    ...(dados.senha ? { password: dados.senha } : {}),
    user_metadata: { nome },
  });
  if (erroAuth) return { ok: false, error: mapearErroBanco(erroAuth.message, ERRO_GENERICO) };

  const { error: erroProfile } = await admin
    .from("profiles")
    .update({
      nome,
      email,
      license_expiry_at: dados.licencaAte ? new Date(dados.licencaAte).toISOString() : null,
    })
    .eq("id", dados.userId);
  if (erroProfile) return { ok: false, error: ERRO_GENERICO };

  revalidatePath("/admin");
  return { ok: true };
}

/** Exclui um usuário e todos os vínculos dele, inclusive o acesso de login. */
export async function excluirUsuarioEmpresa(userId: string): Promise<ResultadoAuth> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };
  if (userId === superAdminId) {
    return { ok: false, error: "O super admin não pode ser excluído por esta tela." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: ERRO_GENERICO };

  revalidatePath("/admin");
  return { ok: true };
}

/** Exclui a empresa, seus dados da calculadora e os acessos sem outro vínculo. */
export async function excluirEmpresa(empresaId: string): Promise<ResultadoAuth> {
  const superAdminId = await exigirSuperAdmin();
  if (!superAdminId) return { ok: false, error: ERRO_SEM_PERMISSAO };

  const admin = createSupabaseAdminClient();
  const { data: vinculos, error: erroVinculos } = await admin
    .from("empresa_usuarios")
    .select("user_id")
    .eq("empresa_id", empresaId);
  if (erroVinculos) return { ok: false, error: ERRO_GENERICO };

  const { error: erroEmpresa } = await admin.from("empresas").delete().eq("id", empresaId);
  if (erroEmpresa) return { ok: false, error: ERRO_GENERICO };

  for (const vinculo of vinculos ?? []) {
    if (vinculo.user_id === superAdminId) continue;
    const { count, error: erroContagem } = await admin
      .from("empresa_usuarios")
      .select("*", { count: "exact", head: true })
      .eq("user_id", vinculo.user_id);
    if (erroContagem || count !== 0) continue;
    const { error: erroExcluirUsuario } = await admin.auth.admin.deleteUser(vinculo.user_id);
    if (erroExcluirUsuario) {
      console.error("excluirEmpresa: empresa removida, mas falhou ao remover usuário órfão:", erroExcluirUsuario.message);
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}
