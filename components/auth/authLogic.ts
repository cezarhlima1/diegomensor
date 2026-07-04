// Lógica pura compartilhada dos fluxos de auth e gestão de conta:
// validação de campos e tradução de erros do Supabase/triggers para pt-BR.
// Fica fora de actions.ts porque arquivos "use server" só podem exportar
// funções async — constantes e funções síncronas moram aqui.

/** Mensagem genérica de falha (rede, env ausente, erro inesperado). */
export const ERRO_GENERICO =
  "Não foi possível concluir a operação. Tente novamente em instantes.";

/** Tamanho mínimo da senha (inclusive) exigido ao criar qualquer usuário. */
export const SENHA_MIN = 8;

// Mensagens de limite de licença — usadas tanto na validação prévia das
// server actions (antes de escrever) quanto no mapeamento dos tokens dos
// triggers (backstop do banco), para o usuário ver SEMPRE o mesmo texto.
export const MSG_LIMITE_USUARIOS =
  "Limite de usuários atingido — contrate uma licença adicional.";
export const MSG_LIMITE_EMPRESAS =
  "Limite de empresas atingido — contrate uma licença adicional.";

/**
 * E-mail já existente no Auth. Neutra de contexto: no registro a action
 * acrescenta a dica de login; na gestão de conta ("adicionar usuário")
 * a dica não faria sentido para o admin.
 */
export const MSG_EMAIL_JA_CADASTRADO = "Este e-mail já está cadastrado.";

/** Valida o formato básico de e-mail (mesma regra do registro da Fase 2). */
export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Traduz erros do Supabase Auth e dos triggers do banco para mensagens
 * pt-BR amigáveis. Os tokens LIMITE_/FUNCIONARIO_ vêm do trigger
 * check_limites (migration 0001) e têm prefixo estável justamente para
 * este mapeamento não parsear texto livre. Erros desconhecidos caem em
 * `fallback` (o chamador escolhe a mensagem genérica do seu contexto).
 */
export function mapearErroBanco(mensagem: string, fallback: string): string {
  if (/already.*(registered|exists)|email_exists/i.test(mensagem)) {
    return MSG_EMAIL_JA_CADASTRADO;
  }
  if (mensagem.includes("LIMITE_MAX_EMPRESAS")) {
    return MSG_LIMITE_EMPRESAS;
  }
  if (mensagem.includes("LIMITE_MAX_USUARIOS")) {
    return MSG_LIMITE_USUARIOS;
  }
  if (mensagem.includes("FUNCIONARIO_JA_VINCULADO")) {
    return "Este usuário já pertence a outra empresa — funcionário pode estar vinculado a apenas uma.";
  }
  return fallback;
}
