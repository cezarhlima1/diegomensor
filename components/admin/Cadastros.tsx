"use client";

import { useMemo, useState } from "react";
import type { CadastroAdmin } from "./actions";

type StatusFiltro = "Todos" | "Ativos" | "Inativos";
type OrigemFiltro = "Todos" | "Teste grátis" | "Outros";

/** Status derivado de license_expiry_at — mesmo critério usado no resto do admin (statusLicenca, em Admin.tsx). */
function ativo(licencaAte: string | null): boolean {
  return !licencaAte || new Date(licencaAte).getTime() >= Date.now();
}

function origemLabel(origem: string | null): "Teste grátis" | "Outros" {
  return origem === "teste_gratis" ? "Teste grátis" : "Outros";
}

function formatarData(data: string): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

/**
 * Aba "Histórico": lista somente-leitura de todos os cadastros (profiles) do
 * produto, com busca por nome/e-mail e filtro por status (ativo/inativo pela
 * licença, mesmo critério de statusLicenca em Admin.tsx) e por origem do
 * cadastro (teste grátis ou não). Clicar numa linha abre o detalhe completo
 * num modal — não há edição aqui, isso continua na aba "Criar novo cadastro".
 */
export default function Cadastros({ cadastros }: { cadastros: CadastroAdmin[] }) {
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("Todos");
  const [origemFiltro, setOrigemFiltro] = useState<OrigemFiltro>("Todos");
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<CadastroAdmin | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return cadastros.filter((cadastro) => {
      const cadastroAtivo = ativo(cadastro.licencaAte);
      if (statusFiltro === "Ativos" && !cadastroAtivo) return false;
      if (statusFiltro === "Inativos" && cadastroAtivo) return false;
      if (origemFiltro !== "Todos" && origemLabel(cadastro.origem) !== origemFiltro) return false;
      if (termo && !`${cadastro.nome ?? ""} ${cadastro.email}`.toLowerCase().includes(termo)) return false;
      return true;
    });
  }, [cadastros, statusFiltro, origemFiltro, busca]);

  return (
    <section className="calc-card cta-reveal" aria-labelledby="admin-cadastros">
      <p className="calc-card-kicker">Histórico</p>
      <h2 id="admin-cadastros" className="calc-card-title">
        Quem já está cadastrado
      </h2>
      <p className="calc-card-sub">
        Lista de todas as pessoas cadastradas no produto, só para consulta —
        para editar um acesso, use a aba &quot;Criar novo cadastro&quot;.
      </p>

      <div className="admin-cadastros-filtros">
        <label className="grid gap-1.5">
          <span className="quiz-label">Buscar por nome ou e-mail</span>
          <input
            type="text"
            className="quiz-input"
            placeholder="ex.: joão ou joao@oficina.com.br"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="quiz-label">Status</span>
          <select
            className="quiz-input"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
          >
            <option>Todos</option>
            <option>Ativos</option>
            <option>Inativos</option>
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="quiz-label">Origem</span>
          <select
            className="quiz-input"
            value={origemFiltro}
            onChange={(e) => setOrigemFiltro(e.target.value as OrigemFiltro)}
          >
            <option>Todos</option>
            <option>Teste grátis</option>
            <option>Outros</option>
          </select>
        </label>
        <span className="conta-contagem">
          {filtrados.length}/{cadastros.length} cadastros
        </span>
      </div>

      {filtrados.length === 0 ? (
        <p className="calc-card-sub" role="status">
          Nenhum cadastro encontrado com esse filtro.
        </p>
      ) : (
        <ul className="conta-lista">
          {filtrados.map((cadastro) => {
            const status = ativo(cadastro.licencaAte);
            return (
              <li key={cadastro.userId} className="conta-item">
                <button
                  type="button"
                  className="admin-cadastro-linha"
                  onClick={() => setSelecionado(cadastro)}
                >
                  <div className="conta-item-info">
                    <span className="conta-item-nome">
                      {cadastro.nome ?? cadastro.email}
                    </span>
                    <span className="conta-item-sub">{cadastro.email}</span>
                  </div>
                  <span className="conta-papel">{origemLabel(cadastro.origem)}</span>
                  <span
                    className={`licenca-badge ${status ? "licenca-badge--ativa" : "licenca-badge--expirada"}`}
                  >
                    {status ? "Ativo" : "Inativo"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selecionado && (
        <div
          className="calc-export-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelecionado(null);
          }}
        >
          <div
            className="calc-export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-cadastro-detalhe-titulo"
          >
            <div className="calc-export-cabecalho">
              <div>
                <p className="calc-card-kicker">Cadastro</p>
                <h2 id="admin-cadastro-detalhe-titulo">
                  {selecionado.nome ?? selecionado.email}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelecionado(null)}
                aria-label="Fechar detalhe do cadastro"
              >
                ×
              </button>
            </div>

            <ul className="admin-cadastro-detalhe">
              <li>
                <span>E-mail</span>
                <b>{selecionado.email}</b>
              </li>
              <li>
                <span>Telefone</span>
                <b>{selecionado.telefone || "Não informado"}</b>
              </li>
              <li>
                <span>Origem</span>
                <b>{origemLabel(selecionado.origem)}</b>
              </li>
              <li>
                <span>Cadastrado em</span>
                <b>{formatarData(selecionado.createdAt)}</b>
              </li>
              <li>
                <span>Licença</span>
                <b>
                  {selecionado.licencaAte
                    ? `${ativo(selecionado.licencaAte) ? "Ativa até" : "Expirada em"} ${formatarData(selecionado.licencaAte)}`
                    : "Nunca expira"}
                </b>
              </li>
            </ul>

            <div className="calc-divider" />
            <p className="calc-card-kicker">Empresas</p>
            {selecionado.empresas.length === 0 ? (
              <p className="calc-card-sub">Nenhuma empresa vinculada.</p>
            ) : (
              <ul className="conta-lista">
                {selecionado.empresas.map((empresa) => (
                  <li key={empresa.id} className="conta-item">
                    <div className="conta-item-info">
                      <span className="conta-item-nome">{empresa.nome}</span>
                    </div>
                    <span className={`conta-papel conta-papel--${empresa.papel}`}>
                      {empresa.papel === "admin" ? "Admin" : "Funcionário"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
