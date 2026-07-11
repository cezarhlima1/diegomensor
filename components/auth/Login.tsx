"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Formulário de login (signInWithPassword no browser client).
 * Sucesso => navegação completa para /calculadora (garante que o middleware
 * e os server components vejam os cookies novos). Erro => mensagem pt-BR
 * inline, propositalmente genérica (não revela qual campo errou).
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setErro(null);
    setCarregando(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (error) {
        setErro("E-mail ou senha inválidos.");
        setCarregando(false);
        return;
      }
      // Admin geral não pertence a nenhuma empresa — /calculadora e /conta
      // exigem uma empresa (getSessaoComEmpresa) e o mandariam de volta pro
      // login. O destino depende do papel de quem acabou de entrar.
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", data.user.id)
        .single();
      window.location.assign(profile?.is_super_admin ? "/admin" : "/calculadora");
    } catch (err) {
      // Ex.: env do Supabase ausente ou falha de rede.
      console.error("Login: falha inesperada ao entrar:", err);
      setErro("Não foi possível entrar. Tente novamente em instantes.");
      setCarregando(false);
    }
  }

  return (
    <div className="calc-card cta-reveal">
      <p className="calc-card-kicker">Área do cliente</p>
      <h1 className="calc-card-title">Entrar</h1>
      <p className="calc-card-sub">
        Acesse a calculadora de precificação da sua oficina.
      </p>

      <form onSubmit={entrar} className="grid gap-4 mt-6" noValidate>
        <label className="grid gap-1.5">
          <span className="quiz-label">E-mail</span>
          <input
            type="email"
            autoComplete="email"
            className="quiz-input"
            placeholder="voce@suaoficina.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="grid gap-1.5">
          <span className="quiz-label">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            className="quiz-input"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="btn btn--wide" disabled={carregando}>
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
