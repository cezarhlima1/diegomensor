"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registrarAdmin } from "./actions";

/**
 * Cadastro do admin + criação da 1ª empresa.
 * A escrita acontece na server action registrarAdmin (service role +
 * transação SQL); com o ok, este componente faz signInWithPassword no
 * browser e navega para /calculadora — mesmo caminho de sessão do login.
 */
export default function Registrar() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (carregando) return;
    setErro(null);
    setCarregando(true);
    try {
      const resultado = await registrarAdmin({ nome, email, senha, nomeEmpresa });
      if (!resultado.ok) {
        setErro(resultado.error);
        setCarregando(false);
        return;
      }

      // Conta e empresa criadas — loga com as mesmas credenciais.
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (error) {
        // Conta existe e está íntegra; só o login automático falhou.
        setErro("Conta criada! Não foi possível entrar automaticamente — faça login.");
        setCarregando(false);
        return;
      }
      window.location.assign("/calculadora");
    } catch {
      setErro("Não foi possível concluir o cadastro. Tente novamente em instantes.");
      setCarregando(false);
    }
  }

  return (
    <div className="calc-card cta-reveal">
      <p className="calc-card-kicker">Área do cliente</p>
      <h1 className="calc-card-title">Criar conta</h1>
      <p className="calc-card-sub">
        Cadastre-se como administrador e crie a sua empresa para usar a
        calculadora de precificação.
      </p>

      <form onSubmit={cadastrar} className="grid gap-4 mt-6" noValidate>
        <label className="grid gap-1.5">
          <span className="quiz-label">Seu nome</span>
          <input
            type="text"
            autoComplete="name"
            className="quiz-input"
            placeholder="ex.: Diego Mensor"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>

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
            autoComplete="new-password"
            className="quiz-input"
            placeholder="Mínimo de 8 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="quiz-label">Nome da empresa</span>
          <input
            type="text"
            autoComplete="organization"
            className="quiz-input"
            placeholder="ex.: Oficina do Diego"
            value={nomeEmpresa}
            onChange={(e) => setNomeEmpresa(e.target.value)}
            required
          />
        </label>

        {erro && (
          <p className="auth-erro" role="alert">
            {erro}
          </p>
        )}

        <button type="submit" className="btn btn--wide" disabled={carregando}>
          {carregando ? "Criando conta…" : "Criar conta"}
        </button>
      </form>

      <p className="auth-alt">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </div>
  );
}
