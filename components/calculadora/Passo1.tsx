"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTO_FIELDS,
  MULT_DEFAULT,
  MULT_MIN,
  MULT_MAX,
  calcCustoHora,
  maskIntTyping,
  parseNum,
  somaCustos,
  type Passo1Dados,
} from "./calcLogic";
import { AnimatedBRL, MoneyField, usePulse } from "./calcUi";
import { salvarPasso1 } from "./actions";

/** Espera após a última edição antes de persistir no banco (ms). */
const DEBOUNCE_SALVAR_MS = 800;

/** Estado do save debounced — sempre visível: falha nunca é silenciosa. */
type Salvamento = "ocioso" | "salvando" | "salvo" | "erro";

/**
 * Passo 1 (custos gerenciais) — EXCLUSIVO de admin.
 *
 * Carregado por Calculadora via next/dynamic e renderizado apenas quando
 * papel === "admin": o chunk com este form nunca é servido a funcionário,
 * e os valores dos custos só chegam ao cliente pela prop `inicial` do
 * admin (a page só consulta calc_passo1 para admin).
 *
 * Encapsula estado, cálculo do custo da hora (via calcLogic) e persistência
 * debounced (salvarPasso1); o pai recebe apenas o custo final via
 * onValorHora e nunca vê os insumos.
 */
export default function Passo1({
  empresaId,
  inicial,
  onValorHora,
  onAvancar,
  onLimparResto,
}: {
  /** Empresa dona dos dados — a server action revalida o papel/vínculo nela. */
  empresaId: string;
  /** Snapshot de calc_passo1 no load; undefined = empresa ainda sem dados. */
  inicial?: Passo1Dados;
  /** Publica o valor da hora (custoFinal) para os Passos 2-3 do pai. */
  onValorHora: (valor: number) => void;
  /** Navega para o passo seguinte (valor da peça). */
  onAvancar: () => void;
  /** Pede ao pai para limpar os Passos 2-3 (peças, cliente, rascunho local). */
  onLimparResto: () => void;
}) {
  // Estado hidratado do banco (prop). As strings já vêm mascaradas pelo
  // próprio app (salvarPasso1 grava o que a UI produz) — sem reformatação.
  const [custos, setCustos] = useState<Record<string, string>>(
    () => inicial?.custos ?? {},
  );
  const [horasMes, setHorasMes] = useState(inicial?.horasMes ?? "");
  const [mecanicos, setMecanicos] = useState(inicial?.mecanicos ?? "");
  const [multiplicador, setMultiplicador] = useState(
    inicial?.multiplicador ?? MULT_DEFAULT,
  );
  const [salvamento, setSalvamento] = useState<Salvamento>("ocioso");

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
  const pulseHora = usePulse(Math.round(hora.custoFinal));

  // Passos 2-3 usam o valor da hora ao vivo (mesmo comportamento de quando
  // o cálculo morava no pai).
  useEffect(() => {
    onValorHora(hora.custoFinal);
  }, [hora.custoFinal, onValorHora]);

  // Persiste com debounce após QUALQUER edição — não na montagem (o estado
  // inicial É o que está no banco). seqRef descarta respostas fora de ordem
  // quando dois saves se cruzam na rede.
  const montadoRef = useRef(false);
  const seqRef = useRef(0);
  useEffect(() => {
    if (!montadoRef.current) {
      montadoRef.current = true;
      return;
    }
    setSalvamento("salvando");
    const seq = ++seqRef.current;
    const id = window.setTimeout(() => {
      salvarPasso1(empresaId, { custos, horasMes, mecanicos, multiplicador })
        .then((r) => {
          if (seq !== seqRef.current) return;
          setSalvamento(r.ok ? "salvo" : "erro");
        })
        .catch(() => {
          if (seq === seqRef.current) setSalvamento("erro");
        });
    }, DEBOUNCE_SALVAR_MS);
    return () => window.clearTimeout(id);
  }, [empresaId, custos, horasMes, mecanicos, multiplicador]);

  function setCusto(key: string, value: string) {
    setCustos((prev) => ({ ...prev, [key]: value }));
  }

  function limparCampos() {
    setCustos({});
    setHorasMes("");
    setMecanicos("");
    setMultiplicador(MULT_DEFAULT);
    onLimparResto();
  }

  const multInteiro = Number.isInteger(multiplicador);

  return (
    <>
      <div className="calc-card">
        <p className="calc-card-kicker">Passo 01 — Custo da hora</p>
        <h2 className="calc-card-title">Custos fixos da oficina</h2>
        <p className="calc-card-sub">
          Preencha os custos mensais. O que estiver zerado é ignorado. Tudo é
          salvo automaticamente para a sua empresa.
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

      {/* estado do save automático — a falha nunca é silenciosa */}
      {salvamento !== "ocioso" && (
        <p
          className={`mt-4 ${salvamento === "erro" ? "calc-warn" : "calc-saved"}`}
          role="status"
        >
          {salvamento === "salvando" && "Salvando…"}
          {salvamento === "salvo" && "✓ Custos salvos para a empresa."}
          {salvamento === "erro" &&
            "⚠ Não foi possível salvar. Suas edições continuam nesta tela — altere um campo para tentar de novo."}
        </p>
      )}

      <div className="flex justify-between items-center mt-7 gap-3">
        <button className="calc-back" onClick={limparCampos}>
          Limpar campos
        </button>
        <button className="btn" onClick={onAvancar}>
          Avançar para a peça →
        </button>
      </div>
    </>
  );
}
