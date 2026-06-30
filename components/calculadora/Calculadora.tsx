"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTO_FIELDS,
  MULT_DEFAULT,
  MULT_MIN,
  MULT_MAX,
  brl,
  calcCustoHora,
  clearInputs,
  formatData,
  loadInputs,
  loadOrcamentos,
  loadTiers,
  parseNum,
  precoPeca,
  saveInputs,
  saveOrcamentos,
  saveTiers,
  somaCustos,
  tierForCost,
  type MarkupTier,
  type Orcamento,
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
          onChange={(e) => onChange(e.target.value)}
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
  const [custoPeca, setCustoPeca] = useState("");
  const [tiers, setTiers] = useState<MarkupTier[]>(loadTiers);

  // Passo #03
  const [nomeCarro, setNomeCarro] = useState("");
  const [valorHoraInput, setValorHoraInput] = useState("");
  const [valorPecaInput, setValorPecaInput] = useState("");

  // Histórico
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  // só persiste depois de reidratar (evita sobrescrever o salvo com o estado inicial vazio)
  const [hydrated, setHydrated] = useState(false);

  // hidrata do localStorage no cliente (evita mismatch de SSR)
  useEffect(() => {
    setOrcamentos(loadOrcamentos());
    setTiers(loadTiers());
    const saved = loadInputs();
    setCustos(saved.custos);
    setHorasMes(saved.horasMes);
    setMecanicos(saved.mecanicos);
    setMultiplicador(saved.multiplicador);
    setCustoPeca(saved.custoPeca);
    setNomeCarro(saved.nomeCarro);
    setValorHoraInput(saved.valorHoraInput);
    setValorPecaInput(saved.valorPecaInput);
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
      custoPeca,
      nomeCarro,
      valorHoraInput,
      valorPecaInput,
    });
  }, [
    hydrated,
    custos,
    horasMes,
    mecanicos,
    multiplicador,
    custoPeca,
    nomeCarro,
    valorHoraInput,
    valorPecaInput,
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

  const custoPecaNum = parseNum(custoPeca);
  const pecaTier = useMemo(
    () => tierForCost(custoPecaNum, tiers),
    [custoPecaNum, tiers],
  );
  const valorPecaCalc = useMemo(
    () => precoPeca(custoPecaNum, tiers),
    [custoPecaNum, tiers],
  );

  const totalOrcamento = parseNum(valorHoraInput) + parseNum(valorPecaInput);

  const pulseHora = usePulse(Math.round(hora.custoFinal));
  const pulsePeca = usePulse(Math.round(valorPecaCalc));
  const pulseTotal = usePulse(Math.round(totalOrcamento));

  /* ---------- navegação ---------- */
  function goToStep(next: Step) {
    if (next === 3) {
      // leva os valores calculados para o orçamento (sem sobrescrever ajustes manuais)
      if (!valorHoraInput && hora.custoFinal > 0)
        setValorHoraInput(hora.custoFinal.toFixed(2).replace(".", ","));
      if (!valorPecaInput && valorPecaCalc > 0)
        setValorPecaInput(valorPecaCalc.toFixed(2).replace(".", ","));
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
    setCustoPeca("");
    setNomeCarro("");
    setValorHoraInput("");
    setValorPecaInput("");
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

  function salvarOrcamento() {
    const orc: Orcamento = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      nomeCarro: nomeCarro.trim() || "Sem nome",
      valorHora: parseNum(valorHoraInput),
      valorPeca: parseNum(valorPecaInput),
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
    setNomeCarro("");
    setValorHoraInput(hora.custoFinal > 0 ? hora.custoFinal.toFixed(2).replace(".", ",") : "");
    setValorPecaInput(valorPecaCalc > 0 ? valorPecaCalc.toFixed(2).replace(".", ",") : "");
    setView("calc");
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                        onChange={(e) => setHorasMes(e.target.value)}
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
                  <h2 className="calc-card-title">Precificação da peça</h2>
                  <p className="calc-card-sub">
                    Informe o custo real da peça. O markup é aplicado
                    automaticamente conforme a faixa.
                  </p>

                  <div className="max-w-[340px] mt-6">
                    <MoneyField
                      label="Custo real da peça"
                      value={custoPeca}
                      onChange={setCustoPeca}
                      big
                    />
                  </div>

                  {/* tabela de markup editável */}
                  <div className="calc-divider" />
                  <p className="quiz-label mb-3">
                    Sugestão de markup em peças{" "}
                    <span className="calc-edit-hint">(edite os % se quiser)</span>
                  </p>
                  <div className="calc-tiers">
                    {tiers.map((t, i) => {
                      const active = custoPecaNum > 0 && t === pecaTier;
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
                      <span className="calc-readout-k">Custo da peça</span>
                      <span className="calc-readout-v">
                        <AnimatedBRL value={custoPecaNum} />
                      </span>
                    </div>
                    <div>
                      <span className="calc-readout-k">Markup aplicado</span>
                      <span className="calc-readout-v">
                        {custoPecaNum > 0 ? `${pecaTier.markup}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="calc-readout-main">
                    <span className="calc-readout-main-k">Valor da peça</span>
                    <span className="calc-readout-num">
                      <AnimatedBRL value={valorPecaCalc} />
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
                  <h2 className="calc-card-title">Peça + hora</h2>
                  <p className="calc-card-sub">
                    Valores trazidos dos passos anteriores. Ajuste se precisar e
                    salve o orçamento.
                  </p>

                  <div className="grid gap-4 mt-6">
                    <label className="grid gap-1.5">
                      <span className="quiz-label">Nome do carro</span>
                      <input
                        type="text"
                        className="quiz-input"
                        placeholder="ex.: Onix 1.4 — Cliente João"
                        value={nomeCarro}
                        onChange={(e) => setNomeCarro(e.target.value)}
                      />
                    </label>
                    <div className="calc-grid-2">
                      <MoneyField
                        label="Valor da hora"
                        value={valorHoraInput}
                        onChange={setValorHoraInput}
                      />
                      <MoneyField
                        label="Valor da peça"
                        value={valorPecaInput}
                        onChange={setValorPecaInput}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`calc-readout calc-readout--total mt-6 ${
                    pulseTotal ? "is-pulsing" : ""
                  }`}
                >
                  <div className="calc-readout-main calc-readout-main--solo">
                    <span className="calc-readout-main-k">Total do orçamento</span>
                    <span className="calc-readout-num calc-readout-num--xl">
                      <AnimatedBRL value={totalOrcamento} />
                    </span>
                  </div>
                </div>

                {justSaved && (
                  <p className="calc-saved cta-reveal mt-4">
                    ✓ Orçamento salvo no histórico.
                  </p>
                )}

                <div className="flex justify-between items-center mt-7 flex-wrap gap-3">
                  <button className="calc-back" onClick={() => goToStep(2)}>
                    ← Voltar
                  </button>
                  <button className="btn" onClick={salvarOrcamento}>
                    Salvar orçamento
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
                        <span className="calc-hist-name">{o.nomeCarro}</span>
                        <span className="calc-hist-date">
                          {formatData(o.data)}
                        </span>
                      </div>
                      <div className="calc-hist-vals">
                        <span>
                          <i>Hora</i> {brl(o.valorHora)}
                        </span>
                        <span>
                          <i>Peça</i> {brl(o.valorPeca)}
                        </span>
                        <span className="calc-hist-total">
                          <i>Total</i> {brl(o.total)}
                        </span>
                      </div>
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
