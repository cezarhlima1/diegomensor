"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTO_FIELDS,
  MULT_DEFAULT,
  MULT_MIN,
  MULT_MAX,
  MARKUP_MIN,
  MARKUP_MAX,
  brl,
  buildOrcamentoMsg,
  calcCustoHora,
  clearInputs,
  formatData,
  formatMoneyBlur,
  loadInputs,
  loadOrcamentos,
  loadTiers,
  markupDaPeca,
  maskIntTyping,
  maskMoneyTyping,
  novaPeca,
  parseNum,
  precoPecaItem,
  saveInputs,
  saveOrcamentos,
  saveTiers,
  somaCustos,
  somaPecas,
  tierForCost,
  type MarkupTier,
  type Orcamento,
  type Peca,
} from "./calcLogic";

type View = "calc" | "hist";
type Step = 1 | 2 | 3;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* conta o número de forma animada até o alvo (easeOutCubic, via rAF) */
function useCountUp(target: number, duration = 650): number {
  const [display, setDisplay] = useState(target);
  const currentRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion() || duration <= 0) {
      currentRef.current = target;
      setDisplay(target);
      return;
    }
    const from = currentRef.current;
    const delta = target - from;
    if (delta === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + delta * eased;
      currentRef.current = val;
      setDisplay(val);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}

/* aciona um pulso de brilho quando o valor (arredondado) muda */
function usePulse(trigger: number): boolean {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(true);
    const id = window.setTimeout(() => setOn(false), 650);
    return () => window.clearTimeout(id);
  }, [trigger]);
  return on;
}

function AnimatedBRL({ value }: { value: number }) {
  const v = useCountUp(value);
  return <>{brl(v)}</>;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Custo da hora",
  2: "Valor da peça",
  3: "Orçamento",
};

/* ---------- campo de moeda (R$) ---------- */
function MoneyField({
  label,
  value,
  onChange,
  big = false,
  idx,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  big?: boolean;
  idx?: number;
}) {
  return (
    <label
      className="grid gap-1.5"
      style={idx !== undefined ? ({ "--i": idx } as React.CSSProperties) : undefined}
    >
      <span className="quiz-label">{label}</span>
      <span className={`calc-money ${big ? "calc-money--big" : ""}`}>
        <span className="calc-money-prefix">R$</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={(e) => onChange(maskMoneyTyping(e.target.value))}
          onBlur={(e) => onChange(formatMoneyBlur(e.target.value))}
        />
      </span>
    </label>
  );
}

export default function Calculadora() {
  const [view, setView] = useState<View>("calc");
  const [step, setStep] = useState<Step>(1);

  // Passo #01
  const [custos, setCustos] = useState<Record<string, string>>({});
  const [horasMes, setHorasMes] = useState("");
  const [mecanicos, setMecanicos] = useState("");
  const [multiplicador, setMultiplicador] = useState(MULT_DEFAULT);

  // Passo #02
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [expandedId, setExpandedId] = useState<string>("");
  const [tiers, setTiers] = useState<MarkupTier[]>(loadTiers);

  // Passo #03
  const [nomeCliente, setNomeCliente] = useState("");
  const [nomeCarro, setNomeCarro] = useState("");
  const [valorHoraInput, setValorHoraInput] = useState("");
  const [horas, setHoras] = useState("");

  // Histórico
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // só persiste depois de reidratar (evita sobrescrever o salvo com o estado inicial vazio)
  const [hydrated, setHydrated] = useState(false);

  // hidrata do localStorage no cliente (evita mismatch de SSR)
  useEffect(() => {
    setOrcamentos(loadOrcamentos());
    setTiers(loadTiers());
    const saved = loadInputs();
    // reaplica a máscara de moeda aos valores salvos
    const custosFmt: Record<string, string> = {};
    for (const [k, v] of Object.entries(saved.custos))
      custosFmt[k] = formatMoneyBlur(v);
    setCustos(custosFmt);
    setHorasMes(saved.horasMes);
    setMecanicos(saved.mecanicos);
    setMultiplicador(saved.multiplicador);
    const pecasFmt = saved.pecas.map((p) => ({
      ...p,
      custo: formatMoneyBlur(p.custo),
    }));
    setPecas(pecasFmt);
    setExpandedId(pecasFmt[pecasFmt.length - 1]?.id ?? "");
    setNomeCliente(saved.nomeCliente);
    setNomeCarro(saved.nomeCarro);
    setValorHoraInput(formatMoneyBlur(saved.valorHoraInput));
    setHoras(saved.horas);
    setHydrated(true);
  }, []);

  // persiste edições da tabela de markup
  useEffect(() => {
    saveTiers(tiers);
  }, [tiers]);

  // persiste os dados digitados pelo usuário
  useEffect(() => {
    if (!hydrated) return;
    saveInputs({
      custos,
      horasMes,
      mecanicos,
      multiplicador,
      pecas,
      nomeCliente,
      nomeCarro,
      valorHoraInput,
      horas,
    });
  }, [
    hydrated,
    custos,
    horasMes,
    mecanicos,
    multiplicador,
    pecas,
    nomeCliente,
    nomeCarro,
    valorHoraInput,
    horas,
  ]);

  /* ---------- derivados ---------- */
  const totalCustos = useMemo(() => somaCustos(custos), [custos]);

  const hora = useMemo(
    () =>
      calcCustoHora(
        totalCustos,
        parseNum(horasMes),
        parseNum(mecanicos),
        multiplicador,
      ),
    [totalCustos, horasMes, mecanicos, multiplicador],
  );

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

  const maoDeObra = parseNum(valorHoraInput) * parseNum(horas);
  const totalOrcamento = maoDeObra + pecasTotal;

  const pulseHora = usePulse(Math.round(hora.custoFinal));
  const pulsePeca = usePulse(Math.round(pecasTotal));
  const pulseTotal = usePulse(Math.round(totalOrcamento));

  /* ---------- navegação ---------- */
  function goToStep(next: Step) {
    if (next === 3) {
      // leva o custo da hora calculado (sem sobrescrever ajuste manual)
      if (!valorHoraInput && hora.custoFinal > 0)
        setValorHoraInput(formatMoneyBlur(hora.custoFinal.toFixed(2).replace(".", ",")));
    }
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setCusto(key: string, value: string) {
    setCustos((prev) => ({ ...prev, [key]: value }));
  }

  function limparCampos() {
    setCustos({});
    setHorasMes("");
    setMecanicos("");
    setMultiplicador(MULT_DEFAULT);
    const p = novaPeca();
    setPecas([p]);
    setExpandedId(p.id);
    setNomeCliente("");
    setNomeCarro("");
    setValorHoraInput("");
    setHoras("");
    clearInputs();
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setTierMarkup(index: number, value: string) {
    const n = parseNum(value);
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, markup: n } : t)),
    );
  }

  /* ---------- peças ---------- */
  function setPecaField(id: string, field: "nome" | "custo", value: string) {
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
    return pecas
      .filter((p) => parseNum(p.custo) > 0)
      .map((p) => ({
        nome: p.nome.trim() || "Peça",
        valor: precoPecaItem(p, tiers),
      }));
  }

  function mensagemOrcamento(): string {
    return buildOrcamentoMsg({
      nomeCliente,
      nomeCarro,
      pecas: pecasResumo(),
      maoDeObra,
      total: totalOrcamento,
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

  function salvarOrcamento() {
    const resumo = pecasResumo();
    const orc: Orcamento = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      nomeCliente: nomeCliente.trim(),
      nomeCarro: nomeCarro.trim() || "Sem nome",
      valorHora: parseNum(valorHoraInput),
      horas: parseNum(horas),
      maoDeObra,
      pecas: resumo,
      valorPeca: pecasTotal,
      total: totalOrcamento,
      data: new Date().toISOString(),
    };
    const next = [orc, ...orcamentos];
    setOrcamentos(next);
    saveOrcamentos(next);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2600);
  }

  function novoOrcamento() {
    setNomeCliente("");
    setNomeCarro("");
    setHoras("");
    setValorHoraInput(
      hora.custoFinal > 0
        ? formatMoneyBlur(hora.custoFinal.toFixed(2).replace(".", ","))
        : "",
    );
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
    });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function removerOrcamento(id: string) {
    const next = orcamentos.filter((o) => o.id !== id);
    setOrcamentos(next);
    saveOrcamentos(next);
  }

  const multInteiro = Number.isInteger(multiplicador);

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
              {([1, 2, 3] as Step[]).map((n) => (
                <button
                  key={n}
                  className={`calc-step-pill ${step === n ? "is-active" : ""} ${
                    step > n ? "is-done" : ""
                  }`}
                  onClick={() => goToStep(n)}
                >
                  <span className="calc-step-num">{n}</span>
                  <span className="calc-step-label">{STEP_LABELS[n]}</span>
                </button>
              ))}
            </div>

            {/* ============ PASSO 1 ============ */}
            {step === 1 && (
              <div className="cta-reveal">
                <div className="calc-card">
                  <p className="calc-card-kicker">Passo 01 — Custo da hora</p>
                  <h2 className="calc-card-title">Custos fixos da oficina</h2>
                  <p className="calc-card-sub">
                    Preencha os custos mensais. O que estiver zerado é ignorado.
                    Tudo é salvo automaticamente neste navegador.
                  </p>

                  <div className="calc-grid calc-stagger mt-6">
                    {CUSTO_FIELDS.map((f, i) => (
                      <MoneyField
                        key={f.key}
                        idx={i}
                        label={f.label}
                        value={custos[f.key] ?? ""}
                        onChange={(v) => setCusto(f.key, v)}
                      />
                    ))}
                  </div>

                  <div className="calc-divider" />

                  <div className="calc-grid-2 mt-2">
                    <label className="grid gap-1.5">
                      <span className="quiz-label">Horas trabalhadas no mês</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="quiz-input"
                        placeholder="ex.: 200"
                        value={horasMes}
                        onChange={(e) => setHorasMes(maskIntTyping(e.target.value))}
                      />
                    </label>
                    <label className="grid gap-1.5">
                      <span className="quiz-label">Mecânicos ativos</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="quiz-input"
                        placeholder="ex.: 2"
                        value={mecanicos}
                        onChange={(e) => setMecanicos(e.target.value)}
                      />
                    </label>
                  </div>

                  {/* multiplicador */}
                  <div className="calc-mult mt-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="quiz-label">Multiplicador</span>
                      <span className="calc-mult-value">
                        {multiplicador.toFixed(multInteiro ? 0 : 1)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      className="calc-range"
                      min={MULT_MIN}
                      max={MULT_MAX}
                      step={0.1}
                      value={multiplicador}
                      onChange={(e) => setMultiplicador(Number(e.target.value))}
                    />
                    <p className="calc-warn">
                      <span aria-hidden="true">⚠</span> Valor variável — ajuste
                      entre <b>1</b> e <b>2</b> conforme a margem desejada.
                    </p>
                  </div>
                </div>

                {/* readout do custo da hora */}
                <div className={`calc-readout mt-6 ${pulseHora ? "is-pulsing" : ""}`}>
                  <div className="calc-readout-breakdown">
                    <div>
                      <span className="calc-readout-k">Custo fixo total</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={totalCustos} />
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Horas efetivas</span>
                      <span className="calc-readout-v">
                        {hora.horasEfetivas
                          ? hora.horasEfetivas.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            }) + " h"
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Custo base/hora</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={hora.custoBase} />
                      </span>
                    </div>
                  </div>
                  <div className="calc-readout-main">
                    <span className="calc-readout-main-k">Custo da hora final</span>
                    <span className="calc-readout-num">
                      <AnimatedBRL value={hora.custoFinal} />
                      <small>/h</small>
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-7 gap-3">
                  <button className="calc-back" onClick={limparCampos}>
                    Limpar campos
                  </button>
                  <button className="btn" onClick={() => goToStep(2)}>
                    Avançar para a peça →
                  </button>
                </div>
              </div>
            )}

            {/* ============ PASSO 2 ============ */}
            {step === 2 && (
              <div className="cta-reveal">
                <div className="calc-card">
                  <p className="calc-card-kicker">Passo 02 — Valor da peça</p>
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
                                  <span className="calc-mult-value">{mk}%</span>
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
                                  <b>{tierForCost(custoNum, tiers).markup}%</b>.
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
                  <button className="calc-back" onClick={() => goToStep(1)}>
                    ← Voltar
                  </button>
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
                  <p className="calc-card-kicker">Passo 03 — Orçamento</p>
                  <h2 className="calc-card-title">Cliente, mão de obra e peças</h2>
                  <p className="calc-card-sub">
                    Informe o cliente e as horas de serviço. A mão de obra é o
                    valor da hora × as horas trabalhadas.
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
                      <MoneyField
                        label="Valor da hora"
                        value={valorHoraInput}
                        onChange={setValorHoraInput}
                      />
                      <label className="grid gap-1.5">
                        <span className="quiz-label">Quantidade de horas</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="quiz-input"
                          placeholder="ex.: 4 ou 1,5"
                          value={horas}
                          onChange={(e) =>
                            setHoras(maskMoneyTyping(e.target.value))
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div
                  className={`calc-readout calc-readout--total mt-6 ${
                    pulseTotal ? "is-pulsing" : ""
                  }`}
                >
                  <div className="calc-readout-breakdown">
                    <div>
                      <span className="calc-readout-k">Mão de obra</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={maoDeObra} />
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Peças</span>
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
                  <button className="btn" onClick={salvarOrcamento}>
                    Salvar orçamento
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
                          {o.nomeCliente || o.nomeCarro}
                        </span>
                        <span className="calc-hist-date">
                          {o.nomeCliente ? `${o.nomeCarro} · ` : ""}
                          {formatData(o.data)}
                        </span>
                      </div>
                      <div className="calc-hist-vals">
                        <span>
                          <i>Mão de obra</i> {brl(o.maoDeObra ?? o.valorHora ?? 0)}
                        </span>
                        <span>
                          <i>Peças</i> {brl(o.valorPeca)}
                        </span>
                        <span className="calc-hist-total">
                          <i>Total</i> {brl(o.total)}
                        </span>
                      </div>
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
