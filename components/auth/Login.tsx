"use client";

import { useState } from "react";
import { Eye, EyeOff } from "@/components/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Formulário de login (signInWithPassword no browser client).
 * Sucesso => navegação completa para /calculadora (garante que o middleware
 * e os server components vejam os cookies novos). Erro => mensagem pt-BR
 * inline, propositalmente genérica (não revela qual campo errou).
 */
export default function Login({ area = "calculadora" }: { area?: "calculadora" | "crm" }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setErro(null);
    setSucesso(null);
    setCarregando(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (area === "crm" && primeiroAcesso) {
        if (senha.length < 8) {
          setErro("A senha precisa ter pelo menos 8 caracteres.");
          setCarregando(false);
          return;
        }
        if (senha !== confirmacao) {
          setErro("As senhas não coincidem.");
          setCarregando(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/CRM` },
        });
        if (error) {
          setErro(error.message.toLowerCase().includes("already") ? "Este acesso já foi criado. Entre com sua senha ou use a recuperação de senha." : "Não foi possível criar o acesso. Tente novamente.");
          setCarregando(false);
          return;
        }
        if (data.session) {
          window.location.assign("/CRM");
          return;
        }
        setSucesso("Acesso criado. Confira seu e-mail para confirmar a conta e depois entre no CRM.");
        setPrimeiroAcesso(false);
        setSenha("");
        setConfirmacao("");
        setCarregando(false);
        return;
      }
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
      const destination = area === "crm" ? "/CRM" : profile?.is_super_admin ? "/admin" : "/calculadora";
      window.location.assign(destination);
    } catch (err) {
      // Ex.: env do Supabase ausente ou falha de rede.
      console.error("Login: falha inesperada ao entrar:", err);
      setErro("Não foi possível entrar. Tente novamente em instantes.");
      setCarregando(false);
    }
  }

  return (
    <div className="calc-card cta-reveal">
      <p className="calc-card-kicker">{area === "crm" ? "Mensor Treinamentos" : "Área do cliente"}</p>
      <h1 className="calc-card-title">{area === "crm" ? primeiroAcesso ? "Criar acesso ao CRM" : "Acesso ao CRM" : "Entrar"}</h1>
      <p className="calc-card-sub">
        {area === "crm" ? primeiroAcesso ? "Defina sua senha para o primeiro acesso." : "Entre com seu acesso administrativo para gerenciar o comercial." : "Acesse a calculadora de precificação da sua oficina."}
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
          <div className="password-field">
            <input
              type={senhaVisivel ? "text" : "password"}
              autoComplete={primeiroAcesso ? "new-password" : "current-password"}
              className="quiz-input"
              placeholder="Sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setSenhaVisivel((visivel) => !visivel)}
              aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={senhaVisivel}
            >
              {senhaVisivel ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </label>

        {area === "crm" && primeiroAcesso && (
          <label className="grid gap-1.5">
            <span className="quiz-label">Confirmar senha</span>
            <input
              type={senhaVisivel ? "text" : "password"}
              autoComplete="new-password"
              className="quiz-input"
              placeholder="Digite a senha novamente"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              required
            />
          </label>
        )}

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        {sucesso && <p className="auth-ok" role="status">{sucesso}</p>}

        <button type="submit" className="btn btn--wide" disabled={carregando}>
          {carregando ? primeiroAcesso ? "Criando…" : "Entrando…" : primeiroAcesso ? "Criar meu acesso" : "Entrar"}
        </button>

        {area === "crm" && (
          <button
            type="button"
            className="auth-nav-link"
            onClick={() => { setPrimeiroAcesso((atual) => !atual); setErro(null); setSucesso(null); setSenha(""); setConfirmacao(""); }}
          >
            {primeiroAcesso ? "Já tenho acesso" : "Primeiro acesso: criar minha senha"}
          </button>
        )}
      </form>
    </div>
  );
}
