// Lógica pura do cadastro público de teste grátis (/teste-gratis):
// duração do teste, validação de telefone e mensagens de erro. Fica fora de
// actions.ts porque arquivos "use server" só podem exportar funções async —
// constantes e funções síncronas moram aqui (mesmo padrão de authLogic.ts).

import { MSG_EMAIL_JA_CADASTRADO, mapearErroBanco, ERRO_GENERICO } from "@/components/auth/authLogic";

/** Duração do teste grátis, em dias, aplicada a `profiles.license_expiry_at`. */
export const TESTE_DIAS = 3;

/**
 * Valida telefone pelo mesmo critério do funil de leads (components/Cadastro.tsx):
 * pelo menos 10 dígitos após remover tudo que não for dígito (DDD + número).
 */
export function telefoneValido(telefone: string): boolean {
  return telefone.replace(/\D/g, "").length >= 10;
}

/**
 * Calcula o instante (ISO 8601) em que o teste grátis vence: `agora + TESTE_DIAS`
 * dias. `agora` é parâmetro (default `new Date()`) para o cálculo ficar puro e
 * verificável — sem depender do relógio do sistema no momento da chamada.
 */
export function calcularVencimentoTeste(agora: Date = new Date()): string {
  const vencimento = new Date(agora.getTime() + TESTE_DIAS * 24 * 60 * 60 * 1000);
  return vencimento.toISOString();
}

/**
 * Traduz erros do Supabase Auth/RPC para pt-BR amigável (reaproveitando
 * mapearErroBanco), acrescentando a dica de login quando o e-mail já existe.
 * A dica só faz sentido NESTE fluxo (autocadastro) — por isso não entra na
 * constante MSG_EMAIL_JA_CADASTRADO compartilhada, que também é usada nas
 * telas do admin (onde "faça login" não se aplica).
 */
export function mensagemErroCadastro(mensagemBanco: string): string {
  const mensagem = mapearErroBanco(mensagemBanco, ERRO_GENERICO);
  if (mensagem === MSG_EMAIL_JA_CADASTRADO) {
    return `${MSG_EMAIL_JA_CADASTRADO} Faça login.`;
  }
  return mensagem;
}
