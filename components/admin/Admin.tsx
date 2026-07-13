"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Papel } from "@/lib/db/types";
import { ERRO_GENERICO } from "@/components/auth/authLogic";
import {
  adicionarUsuarioEmpresa,
  atualizarEmpresa,
  atualizarUsuarioEmpresa,
  criarEmpresaComAdmin,
  excluirEmpresa,
  excluirUsuarioEmpresa,
  type EmpresaAdmin,
  type MembroAdmin,
} from "./actions";

const PAPEL_LABEL: Record<Papel, string> = {
  admin: "Admin",
  funcionario: "Funcionário",
};

/** Gera uma senha forte aleatória para preencher os forms de criação. */
function gerarSenha(): string {
  const alfabeto =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => alfabeto[n % alfabeto.length]).join("");
}

/** Status derivado de license_expiry_at para o selo visual. */
function statusLicenca(licencaAte: string | null): { label: string; classe: string } {
  if (!licencaAte) return { label: "Nunca expira", classe: "licenca-badge--eterna" };
  const data = new Date(licencaAte);
  const dataFmt = data.toLocaleDateString("pt-BR");
  const venceu = data.getTime() < Date.now();
  return venceu
    ? { label: `Expirada em ${dataFmt}`, classe: "licenca-badge--expirada" }
    : { label: `Ativa até ${dataFmt}`, classe: "licenca-badge--ativa" };
}

/** Converte um valor de license_expiry_at (ISO) para o formato do <input type="date">. */
function paraInputDate(licencaAte: string | null): string {
  if (!licencaAte) return "";
  return licencaAte.slice(0, 10);
}

/**
 * Painel de admin geral: cria empresas com seu primeiro admin, adiciona
 * usuários a empresas existentes e edita a data de vencimento da licença
 * de qualquer pessoa. Toda regra de negócio é validada nas server actions
 * (components/admin/actions.ts) — este componente só orquestra forms e
 * feedback, seguindo o mesmo padrão de components/conta/Conta.tsx.
 */
export default function Admin({ empresas }: { empresas: EmpresaAdmin[] }) {
  const router = useRouter();

  // --- form "criar empresa + admin" ---------------------------------------
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [nomeAdmin, setNomeAdmin] = useState("");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [senhaAdmin, setSenhaAdmin] = useState("");
  const [licencaAdmin, setLicencaAdmin] = useState("");
  const [erroCriacao, setErroCriacao] = useState<string | null>(null);
  const [okCriacao, setOkCriacao] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (criando) return;
    setErroCriacao(null);
    setOkCriacao(null);
    setCriando(true);
    try {
      const resultado = await criarEmpresaComAdmin({
        nomeEmpresa,
        nomeAdmin,
        emailAdmin,
        senhaAdmin,
        licencaAte: licencaAdmin || null,
      });
      if (!resultado.ok) {
        setErroCriacao(resultado.error);
        return;
      }
      setOkCriacao(
        `Empresa "${nomeEmpresa}" criada. Senha do admin: ${senhaAdmin} — copie agora, ela não será mostrada de novo.`
      );
      setNomeEmpresa("");
      setNomeAdmin("");
      setEmailAdmin("");
      setSenhaAdmin("");
      setLicencaAdmin("");
      router.refresh();
    } catch (err) {
      console.error("Admin: falha inesperada ao criar empresa:", err);
      setErroCriacao(ERRO_GENERICO);
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="calc-card cta-reveal" aria-labelledby="admin-criar">
        <p className="calc-card-kicker">Novo cliente</p>
        <h2 id="admin-criar" className="calc-card-title">
          Criar empresa e admin
        </h2>
        <p className="calc-card-sub">
          Cria a empresa e o primeiro administrador. Deixe a licença em
          branco para nunca expirar.
        </p>

        <form onSubmit={criar} className="grid gap-4 mt-6" noValidate>
          <div className="calc-grid-2">
            <label className="grid gap-1.5">
              <span className="quiz-label">Nome da empresa</span>
              <input
                type="text"
                className="quiz-input"
                placeholder="ex.: Oficina do João"
                value={nomeEmpresa}
                onChange={(e) => setNomeEmpresa(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">Nome do admin</span>
              <input
                type="text"
                className="quiz-input"
                placeholder="ex.: João da Silva"
                value={nomeAdmin}
                onChange={(e) => setNomeAdmin(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">E-mail do admin</span>
              <input
                type="email"
                autoComplete="off"
                className="quiz-input"
                placeholder="joao@suaoficina.com.br"
                value={emailAdmin}
                onChange={(e) => setEmailAdmin(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">Senha do admin</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  className="quiz-input"
                  placeholder="Mínimo de 8 caracteres"
                  value={senhaAdmin}
                  onChange={(e) => setSenhaAdmin(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="conta-acao"
                  onClick={() => setSenhaAdmin(gerarSenha())}
                >
                  Gerar
                </button>
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">Licença até (opcional)</span>
              <input
                type="date"
                className="quiz-input"
                value={licencaAdmin}
                onChange={(e) => setLicencaAdmin(e.target.value)}
              />
            </label>
          </div>

          {erroCriacao && (
            <p className="auth-erro" role="alert">
              {erroCriacao}
            </p>
          )}
          {okCriacao && (
            <p className="auth-ok" role="status">
              {okCriacao}
            </p>
          )}

          <button type="submit" className="btn btn--wide" disabled={criando}>
            {criando ? "Criando…" : "Criar empresa"}
          </button>
        </form>
      </section>

      {empresas.length === 0 ? (
        <p className="calc-card-sub" role="status">
          Nenhuma empresa cadastrada ainda. Crie a primeira acima.
        </p>
      ) : (
        empresas.map((empresa) => (
          <EmpresaCard key={empresa.id} empresa={empresa} onMudou={() => router.refresh()} />
        ))
      )}
    </div>
  );
}

function EmpresaCard({
  empresa,
  onMudou,
}: {
  empresa: EmpresaAdmin;
  onMudou: () => void;
}) {
  const [formAberto, setFormAberto] = useState(false);
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState(empresa.nome);
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [excluindoEmpresa, setExcluindoEmpresa] = useState(false);
  const [erroEmpresa, setErroEmpresa] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("funcionario");
  const [licenca, setLicenca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  const cheia = empresa.membros.length >= empresa.maxUsuarios;

  async function salvarEmpresa(e: React.FormEvent) {
    e.preventDefault();
    if (salvandoEmpresa) return;
    setErroEmpresa(null);
    setSalvandoEmpresa(true);
    try {
      const resultado = await atualizarEmpresa(empresa.id, nomeEmpresa);
      if (!resultado.ok) {
        setErroEmpresa(resultado.error);
        return;
      }
      setEditandoEmpresa(false);
      onMudou();
    } catch (err) {
      console.error("EmpresaCard: falha ao editar empresa:", err);
      setErroEmpresa(ERRO_GENERICO);
    } finally {
      setSalvandoEmpresa(false);
    }
  }

  async function removerEmpresa() {
    if (excluindoEmpresa) return;
    const confirmou = window.confirm(
      `Excluir a empresa "${empresa.nome}" e todos os seus dados? Os usuários sem outro vínculo também perderão o acesso.`
    );
    if (!confirmou) return;

    setErroEmpresa(null);
    setExcluindoEmpresa(true);
    try {
      const resultado = await excluirEmpresa(empresa.id);
      if (!resultado.ok) {
        setErroEmpresa(resultado.error);
        return;
      }
      onMudou();
    } catch (err) {
      console.error("EmpresaCard: falha ao excluir empresa:", err);
      setErroEmpresa(ERRO_GENERICO);
    } finally {
      setExcluindoEmpresa(false);
    }
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (adicionando) return;
    setErro(null);
    setOk(null);
    setAdicionando(true);
    try {
      const resultado = await adicionarUsuarioEmpresa({
        empresaId: empresa.id,
        nome,
        email,
        senha,
        papel,
        licencaAte: licenca || null,
      });
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }
      setOk("Usuário adicionado.");
      setNome("");
      setEmail("");
      setSenha("");
      setPapel("funcionario");
      setLicenca("");
      onMudou();
    } catch (err) {
      console.error("EmpresaCard: falha inesperada ao adicionar usuário:", err);
      setErro(ERRO_GENERICO);
    } finally {
      setAdicionando(false);
    }
  }

  return (
    <section className="calc-card cta-reveal" aria-labelledby={`empresa-${empresa.id}`}>
      <div className="conta-card-head">
        <div>
          <p className="calc-card-kicker">Empresa</p>
          <h2 id={`empresa-${empresa.id}`} className="calc-card-title">
            {empresa.nome}
          </h2>
        </div>
        <div className="admin-company-tools">
          <span className={`conta-contagem${cheia ? " is-cheia" : ""}`}>
            {empresa.membros.length}/{empresa.maxUsuarios} usuários
          </span>
          <button
            type="button"
            className="conta-acao"
            onClick={() => {
              setNomeEmpresa(empresa.nome);
              setEditandoEmpresa((aberto) => !aberto);
            }}
          >
            {editandoEmpresa ? "Cancelar" : "Editar"}
          </button>
          <button type="button" className="conta-acao conta-acao--remover" onClick={removerEmpresa} disabled={excluindoEmpresa}>
            {excluindoEmpresa ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>

      {editandoEmpresa && (
        <form onSubmit={salvarEmpresa} className="admin-edit-form" noValidate>
          <label className="grid gap-1.5">
            <span className="quiz-label">Nome da empresa</span>
            <input className="quiz-input" value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} required />
          </label>
          <button type="submit" className="conta-acao" disabled={salvandoEmpresa}>
            {salvandoEmpresa ? "Salvando…" : "Salvar empresa"}
          </button>
        </form>
      )}

      {erroEmpresa && <p className="auth-erro mt-4" role="alert">{erroEmpresa}</p>}

      <ul className="conta-lista">
        {empresa.membros.map((membro) => (
          <LinhaMembro key={membro.userId} membro={membro} onMudou={onMudou} />
        ))}
      </ul>

      <div className="calc-divider" />

      <button
        type="button"
        className="admin-toggle"
        onClick={() => setFormAberto((v) => !v)}
      >
        {formAberto ? "Fechar" : "+ Adicionar usuário"}
      </button>

      {formAberto && (
        <form onSubmit={adicionar} className="grid gap-4 mt-4" noValidate>
          <div className="calc-grid-2">
            <label className="grid gap-1.5">
              <span className="quiz-label">Nome</span>
              <input
                type="text"
                className="quiz-input"
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">Senha</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoComplete="off"
                  className="quiz-input"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="conta-acao"
                  onClick={() => setSenha(gerarSenha())}
                >
                  Gerar
                </button>
              </div>
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
            <label className="grid gap-1.5">
              <span className="quiz-label">Licença até (opcional)</span>
              <input
                type="date"
                className="quiz-input"
                value={licenca}
                onChange={(e) => setLicenca(e.target.value)}
              />
            </label>
          </div>

          {erro && (
            <p className="auth-erro" role="alert">
              {erro}
            </p>
          )}
          {ok && (
            <p className="auth-ok" role="status">
              {ok}
            </p>
          )}

          <button type="submit" className="btn btn--wide" disabled={adicionando}>
            {adicionando ? "Adicionando…" : "Adicionar usuário"}
          </button>
        </form>
      )}
    </section>
  );
}

function LinhaMembro({
  membro,
  onMudou,
}: {
  membro: MembroAdmin;
  onMudou: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(membro.nome ?? "");
  const [email, setEmail] = useState(membro.email);
  const [senha, setSenha] = useState("");
  const [data, setData] = useState(paraInputDate(membro.licencaAte));
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const status = statusLicenca(membro.licencaAte);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      const resultado = await atualizarUsuarioEmpresa({
        userId: membro.userId,
        nome,
        email,
        senha,
        licencaAte: data || null,
      });
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }
      setSenha("");
      setEditando(false);
      onMudou();
    } catch (err) {
      console.error("LinhaMembro: falha inesperada ao editar usuário:", err);
      setErro(ERRO_GENERICO);
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (excluindo) return;
    if (!window.confirm(`Excluir o acesso de ${membro.nome ?? membro.email}? Esta ação não pode ser desfeita.`)) return;

    setErro(null);
    setExcluindo(true);
    try {
      const resultado = await excluirUsuarioEmpresa(membro.userId);
      if (!resultado.ok) {
        setErro(resultado.error);
        return;
      }
      onMudou();
    } catch (err) {
      console.error("LinhaMembro: falha inesperada ao excluir usuário:", err);
      setErro(ERRO_GENERICO);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <li className="admin-item">
      <div className="conta-item-info">
        <span className="conta-item-nome">{membro.nome ?? membro.email}</span>
        <span className="conta-item-sub">{membro.email}</span>
      </div>
      <span className={`conta-papel conta-papel--${membro.papel}`}>
        {PAPEL_LABEL[membro.papel]}
      </span>
      <span className={`licenca-badge ${status.classe}`}>{status.label}</span>
      <div className="admin-member-actions">
        <button
          type="button"
          className="conta-acao"
          onClick={() => {
            setNome(membro.nome ?? "");
            setEmail(membro.email);
            setData(paraInputDate(membro.licencaAte));
            setSenha("");
            setEditando((aberto) => !aberto);
          }}
        >
          {editando ? "Cancelar" : "Editar"}
        </button>
        <button type="button" className="conta-acao conta-acao--remover" onClick={remover} disabled={excluindo}>
          {excluindo ? "Excluindo…" : "Excluir"}
        </button>
      </div>
      {editando && (
        <form onSubmit={salvar} className="admin-member-form" noValidate>
          <div className="calc-grid-2">
            <label className="grid gap-1.5">
              <span className="quiz-label">Nome</span>
              <input className="quiz-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">E-mail</span>
              <input type="email" className="quiz-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">Nova senha (opcional)</span>
              <input type="text" className="quiz-input" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={8} />
            </label>
            <label className="grid gap-1.5">
              <span className="quiz-label">Licença até (opcional)</span>
              <input type="date" className="quiz-input" value={data} onChange={(e) => setData(e.target.value)} />
            </label>
          </div>
          <button type="submit" className="conta-acao" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </form>
      )}
      {erro && (
        <p className="auth-erro w-full" role="alert">
          {erro}
        </p>
      )}
    </li>
  );
}
