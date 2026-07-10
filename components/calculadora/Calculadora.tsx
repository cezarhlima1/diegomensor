"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import type { Papel } from "@/lib/db/types";
import {
  DEFAULT_SUFIXO_ORCAMENTO,
  MARKUP_MIN,
  MARKUP_MAX,
  brl,
  buildOrcamentoMsg,
  clearInputs,
  formatData,
  formatMoneyBlur,
  loadInputs,
  maoDeObraPeca,
  markupDaPeca,
  maskIntTyping,
  maskMoneyTyping,
  novaPeca,
  parseNum,
  precoPecaItem,
  quantidadePeca,
  saveInputs,
  somaMaoDeObra,
  somaPecas,
  tierForCost,
  tiersFromMarkups,
  type MarkupTier,
  type Orcamento,
  type Passo1Dados,
  type Passo2ConfigDados,
  type Peca,
  type StatusOrcamento,
} from "./calcLogic";
import { AnimatedBRL, MoneyField, usePulse } from "./calcUi";
import {
  atualizarStatusOrcamento,
  criarOrcamento,
  excluirOrcamento,
  salvarPasso2Config,
} from "./actions";

/** Espera após a última edição antes de persistir no banco (ms). */
const DEBOUNCE_SALVAR_MS = 800;

/** Estado do save debounced da config do Passo 2-3 — falha nunca é silenciosa. */
type SalvamentoConfig = "ocioso" | "salvando" | "salvo" | "erro";

// Passo 1 é admin-only e carregado sob demanda: o chunk com o form dos
// custos gerenciais nunca é servido quando a página renderiza para
// funcionário (DW-4.1). Os VALORES, por sua vez, só chegam via prop
// passo1Inicial — que a page só consulta/passa para admin.
const Passo1 = nextDynamic(() => import("./Passo1"));

type View = "calc" | "hist";
type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "Custo da hora",
  2: "Valor da peça",
  3: "Orçamento",
};

export default function Calculadora({
  papel,
  empresaId,
  valorHoraInicial,
  passo1Inicial,
  passo2ConfigInicial,
  orcamentosIniciais,
  nomeEmpresa,
}: {
  /** Papel do usuário na empresa ativa — gate do Passo 1. */
  papel: Papel;
  /** Empresa ativa: namespace do localStorage e destino de salvarPasso1. */
  empresaId: string;
  /** empresas.valor_hora do servidor — única fonte p/ funcionário. */
  valorHoraInicial: number;
  /** Insumos do Passo 1 (presente APENAS para admin; nunca p/ funcionário). */
  passo1Inicial?: Passo1Dados;
  /** Markup por faixa + sufixo do orçamento (calc_config) — qualquer membro. */
  passo2ConfigInicial?: Passo2ConfigDados;
  /** Histórico de orçamentos da empresa (banco, tabela orcamentos), mais recente primeiro. */
  orcamentosIniciais: Orcamento[];
  /** Nome da empresa ativa — texto da trava do valor da hora p/ funcionário. */
  nomeEmpresa: string;
}) {
  const ehAdmin = papel === "admin";
  const [view, setView] = useState<View>("calc");
  // Funcionário não tem Passo 1: começa direto no valor da peça.
  const [step, setStep] = useState<Step>(ehAdmin ? 1 : 2);

  // Valor da hora: admin recebe atualizações ao vivo do Passo1 (banco);
  // funcionário usa o consolidado do servidor (empresas.valor_hora) e só.
  const [valorHora, setValorHora] = useState(valorHoraInicial);

  // Passo #02 — markup por faixa: vem do banco (calc_config), qualquer
  // membro lê/edita e reutiliza os valores que a empresa definiu.
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [expandedId, setExpandedId] = useState<string>("");
  const [tiers, setTiers] = useState<MarkupTier[]>(() =>
    tiersFromMarkups(passo2ConfigInicial?.markupTiers ?? []),
  );

  // Passo #03 — sufixo do orçamento: também vem do banco (calc_config).
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeCarro, setNomeCarro] = useState("");
  const [placa, setPlaca] = useState("");
  const [sufixoOrcamento, setSufixoOrcamento] = useState(
    passo2ConfigInicial?.sufixoOrcamento ?? DEFAULT_SUFIXO_ORCAMENTO,
  );
  const [salvamentoConfig, setSalvamentoConfig] =
    useState<SalvamentoConfig>("ocioso");

  // Histórico — vem do banco (tabela orcamentos), compartilhado entre os
  // membros da empresa; o estado local só reflete as mudanças desta sessão.
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(orcamentosIniciais);
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false);
  const [erroOrcamento, setErroOrcamento] = useState("");
  const [atualizandoStatusId, setAtualizandoStatusId] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // só persiste depois de reidratar (evita sobrescrever o salvo com o estado inicial vazio)
  const [hydrated, setHydrated] = useState(false);

  // hidrata o rascunho (Passos 2-3) do localStorage no cliente (evita
  // mismatch de SSR); as chaves têm namespace por empresa — dados de outra
  // empresa não vazam. O histórico de orçamentos já chega pronto do
  // servidor via orcamentosIniciais (banco), não precisa hidratar aqui.
  useEffect(() => {
    const saved = loadInputs(empresaId);
    // reaplica a máscara de moeda aos valores salvos
    const pecasFmt = saved.pecas.map((p) => ({
      ...p,
      custo: formatMoneyBlur(p.custo),
    }));
    setPecas(pecasFmt);
    setExpandedId(pecasFmt[pecasFmt.length - 1]?.id ?? "");
    setNomeCliente(saved.nomeCliente);
    setNomeCarro(saved.nomeCarro);
    setPlaca(saved.placa);
    setHydrated(true);
  }, [empresaId]);

  // markup por faixa + sufixo do orçamento: persistidos no banco
  // (calc_config), com debounce — o estado inicial JÁ é o que está salvo
  // (veio via prop passo2ConfigInicial), então não salva na montagem.
  const montadoConfigRef = useRef(false);
  const seqConfigRef = useRef(0);
  useEffect(() => {
    if (!montadoConfigRef.current) {
      montadoConfigRef.current = true;
      return;
    }
    setSalvamentoConfig("salvando");
    const seq = ++seqConfigRef.current;
    const id = window.setTimeout(() => {
      salvarPasso2Config(empresaId, {
        markupTiers: tiers.map((t) => t.markup),
        sufixoOrcamento,
      })
        .then((r) => {
          if (seq !== seqConfigRef.current) return;
          setSalvamentoConfig(r.ok ? "salvo" : "erro");
        })
        .catch(() => {
          if (seq === seqConfigRef.current) setSalvamentoConfig("erro");
        });
    }, DEBOUNCE_SALVAR_MS);
    return () => window.clearTimeout(id);
  }, [empresaId, tiers, sufixoOrcamento]);

  // persiste os dados digitados pelo usuário (Passos 2-3; o Passo 1 mora
  // no banco e nunca entra neste payload)
  useEffect(() => {
    if (!hydrated) return;
    saveInputs({ pecas, nomeCliente, nomeCarro, placa }, empresaId);
  }, [hydrated, pecas, nomeCliente, nomeCarro, placa, empresaId]);

  /* ---------- derivados ---------- */
  const pecasTotal = useMemo(() => somaPecas(pecas, tiers), [pecas, tiers]);

  const expandedPeca = pecas.find((p) => p.id === expandedId) ?? pecas[0];
  const expandedCustoNum = expandedPeca ? parseNum(expandedPeca.custo) : 0;
  const expandedTier = useMemo(
    () => tierForCost(expandedCustoNum, tiers),
    [expandedCustoNum, tiers],
  );
  const expandedMarkup = expandedPeca
    ? markupDaPeca(expandedPeca, tiers)
    : expandedTier.markup;

  const pecasValidas = useMemo(
    () => pecas.filter((p) => parseNum(p.custo) > 0),
    [pecas],
  );
  const maoDeObraTotal = useMemo(
    () => somaMaoDeObra(pecasValidas, valorHora),
    [pecasValidas, valorHora],
  );
  const totalOrcamento = maoDeObraTotal + pecasTotal;

  const pulsePeca = usePulse(Math.round(pecasTotal));
  const pulseTotal = usePulse(Math.round(totalOrcamento));

  // Totais do histórico por status — soma o valor total de cada orçamento
  // conforme está aguardando aprovação ou já foi aprovado.
  const totalPendente = useMemo(
    () =>
      orcamentos
        .filter((o) => o.status === "Aguardando aprovação")
        .reduce((acc, o) => acc + o.total, 0),
    [orcamentos],
  );
  const totalAprovado = useMemo(
    () =>
      orcamentos
        .filter((o) => o.status === "Aprovado")
        .reduce((acc, o) => acc + o.total, 0),
    [orcamentos],
  );

  /* ---------- navegação ---------- */
  function goToStep(next: Step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Limpa os Passos 2-3 (peças, cliente, rascunho local). O botão fica no
  // Passo 1: o componente Passo1 limpa os próprios campos e chama isto.
  function limparResto() {
    const p = novaPeca();
    setPecas([p]);
    setExpandedId(p.id);
    setNomeCliente("");
    setNomeCarro("");
    setPlaca("");
    clearInputs(empresaId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setTierMarkup(index: number, value: string) {
    const n = parseNum(value);
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, markup: n } : t)),
    );
  }

  /* ---------- peças ---------- */
  function setPecaField(
    id: string,
    field: "nome" | "custo" | "quantidade" | "horas",
    value: string,
  ) {
    setPecas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  }

  function setPecaMarkup(id: string, value: number) {
    const clamped = Math.max(MARKUP_MIN, Math.min(MARKUP_MAX, value));
    setPecas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, markup: clamped } : p)),
    );
  }

  function addPeca() {
    const p = novaPeca();
    setPecas((prev) => [...prev, p]);
    setExpandedId(p.id);
  }

  function removePeca(id: string) {
    setPecas((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const list = next.length > 0 ? next : [novaPeca()];
      if (id === expandedId) setExpandedId(list[list.length - 1].id);
      return list;
    });
  }

  function pecasResumo() {
    return pecasValidas.map((p) => ({
      nome: p.nome.trim() || "Peça",
      quantidade: quantidadePeca(p),
      valor: precoPecaItem(p, tiers),
      maoDeObra: maoDeObraPeca(p, valorHora),
    }));
  }

  function mensagemOrcamento(): string {
    return buildOrcamentoMsg({
      nomeCliente,
      nomeCarro,
      pecas: pecasResumo(),
      maoDeObra: maoDeObraTotal,
      total: totalOrcamento,
      sufixo: sufixoOrcamento,
    });
  }

  async function copiarOrcamento() {
    try {
      await navigator.clipboard.writeText(mensagemOrcamento());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard indisponível: ignora
    }
  }

  function enviarWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(mensagemOrcamento())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function salvarOrcamento() {
    setSalvandoOrcamento(true);
    setErroOrcamento("");
    const resultado = await criarOrcamento(empresaId, {
      nomeCliente: nomeCliente.trim(),
      nomeCarro: nomeCarro.trim() || "Sem nome",
      placa: placa.trim(),
      valorHora,
      horas: pecasValidas.reduce((acc, p) => acc + parseNum(p.horas), 0),
      maoDeObra: maoDeObraTotal,
      pecas: pecasResumo(),
      valorPeca: pecasTotal,
      total: totalOrcamento,
    });
    setSalvandoOrcamento(false);
    if (!resultado.ok) {
      setErroOrcamento(resultado.error);
      return;
    }
    setOrcamentos((prev) => [resultado.orcamento, ...prev]);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2600);
  }

  function novoOrcamento() {
    setNomeCliente("");
    setNomeCarro("");
    setPlaca("");
    setPecas((prev) => prev.map((p) => ({ ...p, horas: "" })));
    setView("calc");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reenviarWhatsApp(o: Orcamento) {
    const msg = buildOrcamentoMsg({
      nomeCliente: o.nomeCliente,
      nomeCarro: o.nomeCarro,
      pecas: o.pecas ?? [],
      maoDeObra: o.maoDeObra ?? o.valorHora ?? 0,
      total: o.total,
      sufixo: sufixoOrcamento,
    });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function removerOrcamento(id: string) {
    const anterior = orcamentos;
    setOrcamentos((prev) => prev.filter((o) => o.id !== id));
    const resultado = await excluirOrcamento(empresaId, id);
    if (!resultado.ok) setOrcamentos(anterior);
  }

  async function aprovarOrcamento(id: string) {
    const anterior = orcamentos;
    setAtualizandoStatusId(id);
    setOrcamentos((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Aprovado" as StatusOrcamento } : o)),
    );
    const resultado = await atualizarStatusOrcamento(empresaId, id, "Aprovado");
    setAtualizandoStatusId("");
    if (!resultado.ok) setOrcamentos(anterior);
  }

  // Passos exibidos: funcionário não tem o Passo 1; a numeração da UI é o
  // índice na lista (1..n), então para ele "Valor da peça" vira o Passo 1.
  const stepsVisiveis: Step[] = ehAdmin ? [1, 2, 3] : [2, 3];

  return (
    <section className="relative min-h-[100svh] py-20 sm:py-24">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[920px]">
        {/* ---------- cabeçalho ---------- */}
        <header className="text-center mb-9">
          <span className="tag">Ferramenta de precificação</span>
          <h1 className="section-title mt-5">
            Calculadora de <span className="text-blue">Precificação</span>
          </h1>
          <p className="lead mt-4 max-w-[560px] mx-auto">
            Descubra o custo real da sua hora, precifique peças com o markup
            certo e monte orçamentos em segundos.
          </p>
        </header>

        {/* ---------- alternância calculadora / histórico ---------- */}
        <div className="calc-tabs mb-8">
          <button
            className={`calc-tab ${view === "calc" ? "is-active" : ""}`}
            onClick={() => setView("calc")}
          >
            Calculadora
          </button>
          <button
            className={`calc-tab ${view === "hist" ? "is-active" : ""}`}
            onClick={() => setView("hist")}
          >
            Histórico
            {orcamentos.length > 0 && (
              <span className="calc-tab-badge">{orcamentos.length}</span>
            )}
          </button>
        </div>

        {view === "calc" && (
          <>
            {/* stepper */}
            <div className="calc-steps mb-9">
              {stepsVisiveis.map((n, i) => (
                <button
                  key={n}
                  className={`calc-step-pill ${step === n ? "is-active" : ""} ${
                    step > n ? "is-done" : ""
                  }`}
                  onClick={() => goToStep(n)}
                >
                  <span className="calc-step-num">{i + 1}</span>
                  <span className="calc-step-label">{STEP_LABELS[n]}</span>
                </button>
              ))}
            </div>

            {/* ============ PASSO 2 ============ */}
            {step === 2 && (
              <div className="cta-reveal">
                <div className="calc-card">
                  <p className="calc-card-kicker">
                    Passo {ehAdmin ? "02" : "01"} — Valor da peça
                  </p>
                  <h2 className="calc-card-title">Precificação das peças</h2>
                  <p className="calc-card-sub">
                    Adicione as peças do orçamento. O markup é aplicado
                    automaticamente conforme a faixa — e você pode ajustar na
                    régua.
                  </p>

                  {/* lista de peças (acordeão) */}
                  <div className="calc-pecas mt-6">
                    {pecas.map((p, i) => {
                      const custoNum = parseNum(p.custo);
                      const valor = precoPecaItem(p, tiers);
                      const isOpen = p.id === expandedId;
                      const mk = markupDaPeca(p, tiers);
                      return (
                        <div
                          key={p.id}
                          className={`calc-peca ${isOpen ? "is-open" : ""}`}
                        >
                          <button
                            type="button"
                            className="calc-peca-head"
                            onClick={() => setExpandedId(isOpen ? "" : p.id)}
                          >
                            <span className="calc-peca-idx">{i + 1}</span>
                            <span className="calc-peca-name">
                              {p.nome.trim() || "Nova peça"}
                            </span>
                            <span className="calc-peca-val">
                              {custoNum > 0 ? brl(valor) : "—"}
                            </span>
                            <span className="calc-peca-chev" aria-hidden="true">
                              ⌄
                            </span>
                          </button>

                          {isOpen && (
                            <div className="calc-peca-body">
                              <div className="calc-peca-row">
                                <label className="grid gap-1.5">
                                  <span className="quiz-label">Nome da peça</span>
                                  <input
                                    type="text"
                                    className="quiz-input"
                                    placeholder="ex.: Pastilha de freio"
                                    value={p.nome}
                                    onChange={(e) =>
                                      setPecaField(p.id, "nome", e.target.value)
                                    }
                                  />
                                </label>
                                <label className="grid gap-1.5 calc-qtd">
                                  <span className="quiz-label">Qtd.</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    className="quiz-input"
                                    placeholder="1"
                                    value={p.quantidade}
                                    onChange={(e) =>
                                      setPecaField(
                                        p.id,
                                        "quantidade",
                                        maskIntTyping(e.target.value),
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <MoneyField
                                label="Custo real da peça"
                                value={p.custo}
                                onChange={(v) => setPecaField(p.id, "custo", v)}
                              />

                              {/* régua de ajuste do markup */}
                              <div className="calc-mult">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <span className="quiz-label">
                                    Markup da peça
                                  </span>
                                  <span className="calc-mult-value">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={String(mk)}
                                      onChange={(e) =>
                                        setPecaMarkup(
                                          p.id,
                                          Number(e.target.value.replace(/\D/g, "")) || 0,
                                        )
                                      }
                                    />
                                    %
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  className="calc-range"
                                  min={MARKUP_MIN}
                                  max={MARKUP_MAX}
                                  step={1}
                                  value={mk}
                                  onChange={(e) =>
                                    setPecaMarkup(p.id, Number(e.target.value))
                                  }
                                />
                                <p className="calc-warn">
                                  <span aria-hidden="true">⚠</span> Ajuste entre{" "}
                                  <b>{MARKUP_MIN}%</b> e <b>{MARKUP_MAX}%</b>.
                                  Sugestão da faixa:{" "}
                                  <b className="calc-suggestion">
                                    {tierForCost(custoNum, tiers).markup}%
                                  </b>
                                  .
                                </p>
                              </div>

                              {pecas.length > 1 && (
                                <button
                                  type="button"
                                  className="calc-peca-del"
                                  onClick={() => removePeca(p.id)}
                                >
                                  Remover peça
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" className="calc-add" onClick={addPeca}>
                    + Adicionar peça
                  </button>

                  {/* tabela de markup editável */}
                  <div className="calc-divider" />
                  <p className="quiz-label mb-3">
                    Sugestão de markup em peças{" "}
                    <span className="calc-edit-hint">(edite os % se quiser)</span>
                  </p>
                  <div className="calc-tiers">
                    {tiers.map((t, i) => {
                      const active =
                        expandedCustoNum > 0 && t === expandedTier;
                      return (
                        <div
                          key={t.label}
                          className={`calc-tier ${active ? "is-active" : ""}`}
                        >
                          <span className="calc-tier-range">{t.label}</span>
                          <span className="calc-tier-input">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={String(t.markup)}
                              onChange={(e) => setTierMarkup(i, e.target.value)}
                            />
                            <span>%</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`calc-readout mt-6 ${pulsePeca ? "is-pulsing" : ""}`}>
                  <div className="calc-readout-breakdown">
                    <div>
                      <span className="calc-readout-k">Peças</span>
                      <span className="calc-readout-v">
                        {pecas.filter((p) => parseNum(p.custo) > 0).length}
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Markup da peça atual</span>
                      <span className="calc-readout-v">
                        {expandedCustoNum > 0 ? `${expandedMarkup}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="calc-readout-main">
                    <span className="calc-readout-main-k">Total em peças</span>
                    <span className="calc-readout-num">
                      <AnimatedBRL value={pecasTotal} />
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-7">
                  {ehAdmin ? (
                    <button className="calc-back" onClick={() => goToStep(1)}>
                      ← Voltar
                    </button>
                  ) : (
                    <span />
                  )}
                  <button className="btn" onClick={() => goToStep(3)}>
                    Montar orçamento →
                  </button>
                </div>
              </div>
            )}

            {/* ============ PASSO 3 ============ */}
            {step === 3 && (
              <div className="cta-reveal">
                <div className="calc-card">
                  <p className="calc-card-kicker">
                    Passo {ehAdmin ? "03" : "02"} — Orçamento
                  </p>
                  <h2 className="calc-card-title">Cliente, hora técnica e peças</h2>
                  <p className="calc-card-sub">
                    Informe o cliente e as horas de serviço de cada peça.{" "}
                    {ehAdmin
                      ? "O valor da hora vem do Passo 01 e fica travado."
                      : "O valor da hora é definido pela sua oficina e fica travado."}
                  </p>

                  <div className="grid gap-4 mt-6">
                    <div className="calc-grid-2">
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Nome do cliente</span>
                        <input
                          type="text"
                          className="quiz-input"
                          placeholder="ex.: João Silva"
                          value={nomeCliente}
                          onChange={(e) => setNomeCliente(e.target.value)}
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Veículo</span>
                        <input
                          type="text"
                          className="quiz-input"
                          placeholder="ex.: Onix 1.4"
                          value={nomeCarro}
                          onChange={(e) => setNomeCarro(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="calc-grid-2">
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Placa do veículo</span>
                        <input
                          type="text"
                          className="quiz-input"
                          placeholder="ex.: ABC1D23"
                          value={placa}
                          maxLength={8}
                          onChange={(e) =>
                            setPlaca(e.target.value.toUpperCase())
                          }
                        />
                      </label>
                      <label className="grid gap-1.5">
                        <span className="quiz-label">
                          Valor da hora{" "}
                          <span className="calc-lock-tag">
                            🔒 {ehAdmin ? "definido no Passo 01" : `definido por ${nomeEmpresa}`}
                          </span>
                        </span>
                        <span className="calc-money calc-money--locked">
                          <span className="calc-money-prefix">R$</span>
                          <input
                            type="text"
                            readOnly
                            tabIndex={-1}
                            value={valorHora.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          />
                        </span>
                      </label>
                    </div>
                  </div>

                  {pecasValidas.length > 0 && (
                    <>
                      <div className="calc-divider" />
                      <p className="quiz-label mb-3">
                        Horas de serviço por peça
                      </p>
                      <div className="calc-pecas-horas">
                        {pecasValidas.map((p) => (
                          <div key={p.id} className="calc-ph">
                            <div className="calc-ph-info">
                              <span className="calc-ph-name">
                                {p.nome.trim() || "Peça"}
                                {quantidadePeca(p) > 1 && (
                                  <span className="calc-ph-qtd">
                                    ×{quantidadePeca(p)}
                                  </span>
                                )}
                              </span>
                              <span className="calc-ph-val">
                                {brl(precoPecaItem(p, tiers))}
                              </span>
                            </div>
                            <label className="calc-ph-hours">
                              <span className="quiz-label">Horas</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                className="quiz-input"
                                placeholder="ex.: 2 ou 1,5"
                                value={p.horas}
                                onChange={(e) =>
                                  setPecaField(
                                    p.id,
                                    "horas",
                                    maskMoneyTyping(e.target.value),
                                  )
                                }
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="calc-divider" />
                  <label className="grid gap-1.5">
                    <span className="quiz-label">
                      Mensagem final do orçamento{" "}
                      <span className="calc-edit-hint">
                        (aparece no fim da mensagem copiada/enviada)
                      </span>
                    </span>
                    <textarea
                      className="quiz-input calc-sufixo"
                      rows={6}
                      value={sufixoOrcamento}
                      onChange={(e) => setSufixoOrcamento(e.target.value)}
                    />
                  </label>
                  {salvamentoConfig !== "ocioso" && (
                    <p
                      className={`mt-2 ${
                        salvamentoConfig === "erro" ? "calc-warn" : "calc-saved"
                      }`}
                      role="status"
                    >
                      {salvamentoConfig === "salvando" && "Salvando…"}
                      {salvamentoConfig === "salvo" &&
                        "✓ Mensagem e markup salvos para a empresa."}
                      {salvamentoConfig === "erro" &&
                        "⚠ Não foi possível salvar. Altere um campo para tentar de novo."}
                    </p>
                  )}
                </div>

                <div
                  className={`calc-readout calc-readout--total mt-6 ${
                    pulseTotal ? "is-pulsing" : ""
                  }`}
                >
                  {pecasValidas.length > 0 && (
                    <div className="calc-resumo">
                      {pecasValidas.map((p) => (
                        <div key={p.id} className="calc-resumo-row">
                          <span className="calc-resumo-name">
                            {p.nome.trim() || "Peça"}
                            {quantidadePeca(p) > 1 && (
                              <i>×{quantidadePeca(p)}</i>
                            )}
                          </span>
                          <span className="calc-resumo-vals">
                            <span>
                              <em>Peça</em>
                              {brl(precoPecaItem(p, tiers))}
                            </span>
                            <span>
                              <em>Hora técnica</em>
                              {brl(maoDeObraPeca(p, valorHora))}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="calc-readout-breakdown">
                    <div>
                      <span className="calc-readout-k">Total hora técnica</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={maoDeObraTotal} />
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Total peças</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={pecasTotal} />
                      </span>
                    </div>
                  </div>
                  <div className="calc-readout-main calc-readout-main--solo">
                    <span className="calc-readout-main-k">Total do orçamento</span>
                    <span className="calc-readout-num calc-readout-num--xl">
                      <AnimatedBRL value={totalOrcamento} />
                    </span>
                  </div>
                </div>

                {(copied || justSaved) && (
                  <p className="calc-saved cta-reveal mt-4">
                    {copied
                      ? "✓ Orçamento copiado."
                      : "✓ Orçamento salvo no histórico."}
                  </p>
                )}
                {erroOrcamento && (
                  <p className="calc-warn cta-reveal mt-4">
                    <span aria-hidden="true">⚠</span> {erroOrcamento}
                  </p>
                )}

                <div className="calc-actions mt-6">
                  <button
                    className="btn btn--ghost"
                    onClick={copiarOrcamento}
                  >
                    Copiar orçamento
                  </button>
                  <button className="btn btn--wa" onClick={enviarWhatsApp}>
                    Enviar no WhatsApp
                  </button>
                  <button
                    className="btn"
                    onClick={salvarOrcamento}
                    disabled={salvandoOrcamento}
                  >
                    {salvandoOrcamento ? "Salvando…" : "Salvar orçamento"}
                  </button>
                </div>

                <div className="mt-6">
                  <button className="calc-back" onClick={() => goToStep(2)}>
                    ← Voltar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============ PASSO 1 (admin-only) ============
            Fica MONTADO o tempo todo (oculto por CSS fora do passo 1):
            desmontar perderia edições ainda não salvas pelo debounce e
            remontaria com o snapshot antigo do servidor. Para funcionário
            este branch simplesmente não existe — nem o chunk é carregado. */}
        {ehAdmin && (
          <div
            className={
              view === "calc" && step === 1 ? "cta-reveal" : "hidden"
            }
          >
            <Passo1
              empresaId={empresaId}
              inicial={passo1Inicial}
              onValorHora={setValorHora}
              onAvancar={() => goToStep(2)}
              onLimparResto={limparResto}
            />
          </div>
        )}

        {/* ============ HISTÓRICO ============ */}
        {view === "hist" && (
          <div className="cta-reveal">
            {orcamentos.length === 0 ? (
              <div className="calc-empty">
                <p className="calc-empty-num">0</p>
                <p className="calc-empty-title">Nenhum orçamento salvo ainda</p>
                <p className="calc-card-sub">
                  Monte um orçamento na calculadora e ele aparece aqui.
                </p>
                <button className="btn mt-6" onClick={novoOrcamento}>
                  Criar orçamento
                </button>
              </div>
            ) : (
              <>
                <div className="calc-totais">
                  <div className="calc-totais-item calc-totais-item--pendente">
                    <span className="calc-totais-k">Total pendente</span>
                    <span className="calc-totais-v">{brl(totalPendente)}</span>
                  </div>
                  <div className="calc-totais-item calc-totais-item--aprovado">
                    <span className="calc-totais-k">Total aprovado</span>
                    <span className="calc-totais-v">{brl(totalAprovado)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <p className="quiz-label">
                    {orcamentos.length}{" "}
                    {orcamentos.length === 1
                      ? "orçamento salvo"
                      : "orçamentos salvos"}
                  </p>
                  <button className="btn" onClick={novoOrcamento}>
                    Novo orçamento
                  </button>
                </div>
                <div className="grid gap-3">
                  {orcamentos.map((o) => (
                    <div key={o.id} className="calc-hist">
                      <div className="calc-hist-main">
                        <span className="calc-hist-name">
                          <span className="calc-hist-name-text">
                            {o.nomeCliente || o.nomeCarro}
                          </span>
                          {o.placa && (
                            <span className="calc-hist-placa">{o.placa}</span>
                          )}
                        </span>
                        <span className="calc-hist-date">
                          {o.nomeCliente ? `${o.nomeCarro} · ` : ""}
                          {formatData(o.data)}
                        </span>
                      </div>
                      <div className="calc-hist-vals">
                        <span>
                          <i>Hora técnica</i> {brl(o.maoDeObra ?? o.valorHora ?? 0)}
                        </span>
                        <span>
                          <i>Peças</i> {brl(o.valorPeca)}
                        </span>
                        <span className="calc-hist-total">
                          <i>Total</i> {brl(o.total)}
                        </span>
                      </div>
                      {o.status === "Aprovado" ? (
                        <span className="calc-hist-status calc-hist-status--aprovado">
                          Aprovado
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="calc-hist-status calc-hist-status--pendente"
                          onClick={() => aprovarOrcamento(o.id)}
                          disabled={atualizandoStatusId === o.id}
                          aria-label={`Aprovar orçamento ${o.nomeCarro}`}
                        >
                          {atualizandoStatusId === o.id
                            ? "Aprovando…"
                            : "Aguardando aprovação"}
                        </button>
                      )}
                      <button
                        className="calc-hist-wa"
                        onClick={() => reenviarWhatsApp(o)}
                        aria-label={`Enviar orçamento ${o.nomeCarro} no WhatsApp`}
                      >
                        WhatsApp
                      </button>
                      <button
                        className="calc-hist-del"
                        onClick={() => removerOrcamento(o.id)}
                        aria-label={`Remover orçamento ${o.nomeCarro}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
