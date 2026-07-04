"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Membro, Papel } from "@/lib/db/types";
import { ERRO_GENERICO } from "@/components/auth/authLogic";
import { definirEmpresaAtiva } from "@/lib/auth/empresaAtiva";
import { adicionarUsuario, criarEmpresa, removerUsuario } from "./actions";

/** Resumo de uma empresa do usuário para o seletor de empresa ativa. */
type EmpresaResumo = { id: string; nome: string };

const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Admin",
  funcionario: "Funcionário",
};

/**
 * Gestão de conta do admin: membros da empresa ativa (listar, adicionar,
 * remover) e minhas empresas (listar, criar, trocar a ativa). Toda regra
 * de negócio (papel do chamador, limites de licença) é validada nas server
 * actions — este componente só orquestra forms, feedback e refresh.
 */
export default function Conta({
  userId,
  empresaAtiva,
  membros,
  maxUsuarios,
  empresas,
  maxEmpresas,
}: {
  /** Id do usuário logado — marca "você" na lista e trata auto-remoção. */
  userId: string;
  empresaAtiva: EmpresaResumo;
  /** Membros da empresa ativa (nome/e-mail vindos de profiles). */
  membros: Membro[];
  /** Limite de licença de usuários da empresa ativa (empresas.max_usuarios). */
  maxUsuarios: number;
  /** Todas as empresas do usuário (o seletor de ativa usa esta lista). */
  empresas: EmpresaResumo[];
  /** Limite de licença de empresas do usuário (profiles.max_empresas). */
  maxEmpresas: number;
}) {
  const router = useRouter();

  // --- form "adicionar usuário" -------------------------------------------
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("funcionario");
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);
  const [okEquipe, setOkEquipe] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [removendoId, setRemovendoId] = useState<string | null>(null);

  // --- form "criar empresa" ------------------------------------------------
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [erroEmpresas, setErroEmpresas] = useState<string | null>(null);
  const [okEmpresas, setOkEmpresas] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const equipeCheia = membros.length >= maxUsuarios;
  const empresasCheias = empresas.length >= maxEmpresas;

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (adicionando) return;
    setErroEquipe(null);
    setOkEquipe(null);
    setAdicionando(true);
    try {
      const resultado = await adicionarUsuario({ nome, email, senha, papel });
      if (!resultado.ok) {
        setErroEquipe(resultado.error);
        return;
      }
      setNome("");
      setEmail("");
      setSenha("");
      setPapel("funcionario");
      setOkEquipe("Usuário adicionado à empresa.");
      router.refresh();
    } catch (err) {
      console.error("Conta: falha inesperada ao adicionar usuário:", err);
      setErroEquipe(ERRO_GENERICO);
    } finally {
      setAdicionando(false);
    }
  }

  async function remover(membro: Membro) {
    if (removendoId) return;
    const alvo = membro.nome ?? membro.email;
    if (!window.confirm(`Remover ${alvo} da empresa?`)) return;
    setErroEquipe(null);
    setOkEquipe(null);
    setRemovendoId(membro.user_id);
    try {
      const resultado = await removerUsuario(membro.user_id);
      if (!resultado.ok) {
        setErroEquipe(resultado.error);
        return;
      }
      if (membro.user_id === userId) {
        // Removeu a si mesmo: a sessão precisa ser re-resolvida do zero
        // (outra empresa ativa ou logout) — navegação completa.
        window.location.assign("/calculadora");
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("Conta: falha inesperada ao remover usuário:", err);
      setErroEquipe(ERRO_GENERICO);
    } finally {
      setRemovendoId(null);
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (criando) return;
    setErroEmpresas(null);
    setOkEmpresas(null);
    setCriando(true);
    try {
      const resultado = await criarEmpresa(nomeEmpresa);
      if (!resultado.ok) {
        setErroEmpresas(resultado.error);
        return;
      }
      setNomeEmpresa("");
      setOkEmpresas("Empresa criada.");
      router.refresh();
    } catch (err) {
      console.error("Conta: falha inesperada ao criar empresa:", err);
      setErroEmpresas(ERRO_GENERICO);
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="grid gap-6">
      {/* ---------------- equipe da empresa ativa ---------------- */}
      <section className="calc-card cta-reveal" aria-labelledby="conta-equipe">
        <div className="conta-card-head">
          <div>
            <p className="calc-card-kicker">{empresaAtiva.nome}</p>
            <h2 id="conta-equipe" className="calc-card-title">
              Usuários
            </h2>
            <p className="calc-card-sub">
              Quem pode acessar a calculadora desta empresa.
            </p>
          </div>
          <span
            className={`conta-contagem${equipeCheia ? " is-cheia" : ""}`}
            title={`Licença atual: até ${maxUsuarios} usuário(s)`}
          >
            {membros.length}/{maxUsuarios} usuários
          </span>
        </div>

        <ul className="conta-lista">
          {membros.map((m) => (
            <li key={m.user_id} className="conta-item">
              <div className="conta-item-info">
                <span className="conta-item-nome">
                  {m.nome ?? m.email}
                  {m.user_id === userId ? " (você)" : ""}
                </span>
                <span className="conta-item-sub">{m.email}</span>
              </div>
              <span className={`conta-papel conta-papel--${m.papel}`}>
                {PAPEL_LABEL[m.papel]}
              </span>
              <button
                type="button"
                className="conta-acao conta-acao--remover"
                onClick={() => remover(m)}
                disabled={removendoId !== null}
              >
                {removendoId === m.user_id ? "Removendo…" : "Remover"}
              </button>
            </li>
          ))}
        </ul>

        <div className="calc-divider" />

        <h3 className="calc-card-kicker">Adicionar usuário</h3>
        <form onSubmit={adicionar} className="grid gap-4 mt-4" noValidate>
          <div className="calc-grid-2">
            <label className="grid gap-1.5">
              <span className="quiz-label">Nome</span>
              <input
                type="text"
                autoComplete="off"
                className="quiz-input"
                placeholder="ex.: João da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">E-mail</span>
              <input
                type="email"
                autoComplete="off"
                className="quiz-input"
                placeholder="joao@suaoficina.com.br"
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
              <span className="quiz-label">Papel</span>
              <select
                className="quiz-input"
                value={papel}
                onChange={(e) => setPapel(e.target.value as Papel)}
              >
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
          </div>

          {erroEquipe && (
            <p className="auth-erro" role="alert">
              {erroEquipe}
            </p>
          )}
          {okEquipe && (
            <p className="auth-ok" role="status">
              {okEquipe}
            </p>
          )}

          <button type="submit" className="btn btn--wide" disabled={adicionando}>
            {adicionando ? "Adicionando…" : "Adicionar usuário"}
          </button>
        </form>
      </section>

      {/* ---------------- minhas empresas ---------------- */}
      <section className="calc-card cta-reveal" aria-labelledby="conta-empresas">
        <div className="conta-card-head">
          <div>
            <p className="calc-card-kicker">Licença</p>
            <h2 id="conta-empresas" className="calc-card-title">
              Minhas empresas
            </h2>
            <p className="calc-card-sub">
              Cada empresa tem os próprios usuários e o próprio valor da hora.
            </p>
          </div>
          <span
            className={`conta-contagem${empresasCheias ? " is-cheia" : ""}`}
            title={`Licença atual: até ${maxEmpresas} empresa(s)`}
          >
            {empresas.length}/{maxEmpresas} empresas
          </span>
        </div>

        <ul className="conta-lista">
          {empresas.map((e) => (
            <li key={e.id} className="conta-item">
              <div className="conta-item-info">
                <span className="conta-item-nome">{e.nome}</span>
              </div>
              {e.id === empresaAtiva.id ? (
                <span className="conta-ativa">Ativa</span>
              ) : (
                <form action={definirEmpresaAtiva.bind(null, e.id, "/conta")}>
                  <button type="submit" className="conta-acao">
                    Usar
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <div className="calc-divider" />

        <h3 className="calc-card-kicker">Criar empresa</h3>
        <form onSubmit={criar} className="grid gap-4 mt-4" noValidate>
          <label className="grid gap-1.5">
            <span className="quiz-label">Nome da empresa</span>
            <input
              type="text"
              autoComplete="organization"
              className="quiz-input"
              placeholder="ex.: Oficina Matriz"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              required
            />
          </label>

          {erroEmpresas && (
            <p className="auth-erro" role="alert">
              {erroEmpresas}
            </p>
          )}
          {okEmpresas && (
            <p className="auth-ok" role="status">
              {okEmpresas}
            </p>
          )}

          <button type="submit" className="btn btn--wide" disabled={criando}>
            {criando ? "Criando…" : "Criar empresa"}
          </button>
        </form>
      </section>
    </div>
  );
}
