"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTO_FIELDS,
  MULT_DEFAULT,
  MULT_MIN,
  MULT_MAX,
  STATUS_VALOR_HORA_LABEL,
  brl,
  calcCustoHora,
  formatData,
  maskIntTyping,
  maskMoneyTyping,
  parseNum,
  somaCustos,
  type Passo1Dados,
  type StatusValorHora,
  type ValorHoraSalvo,
} from "./calcLogic";
import { AnimatedBRL, MoneyField, usePulse } from "./calcUi";
import {
  atualizarStatusValorHora,
  salvarPasso1,
  salvarValorHora,
} from "./actions";

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
  historico,
  onHistoricoChange,
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
  /** Histórico de valores hora salvos (estado mora no pai — o Passo 3 usa). */
  historico: ValorHoraSalvo[];
  /** Publica o histórico atualizado após salvar/mudar status. */
  onHistoricoChange: (historico: ValorHoraSalvo[]) => void;
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

  // Edição manual do valor hora: guarda o texto digitado até o blur/Enter,
  // quando o fator correspondente (valor ÷ custo base) é aplicado na régua,
  // limitado ao intervalo 1-2 — o valor exibido volta a ser derivado.
  const [valorHoraEdit, setValorHoraEdit] = useState<string | null>(null);

  // Form "salvar valor hora no histórico".
  const [nomeValorHora, setNomeValorHora] = useState("");
  const [salvandoValorHora, setSalvandoValorHora] = useState(false);
  const [erroValorHora, setErroValorHora] = useState("");
  const [okValorHora, setOkValorHora] = useState(false);
  const [mudandoStatusId, setMudandoStatusId] = useState("");

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
  const valorHoraExibido =
    valorHoraEdit ??
    hora.custoFinal.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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

  function aplicarValorHoraManual() {
    if (valorHoraEdit === null) return;
    const alvo = parseNum(valorHoraEdit);
    setValorHoraEdit(null);
    if (hora.custoBase <= 0 || alvo <= 0) return;
    const fator = Math.min(
      MULT_MAX,
      Math.max(MULT_MIN, alvo / hora.custoBase),
    );
    setMultiplicador(Math.round(fator * 100) / 100);
  }

  async function salvarNoHistorico() {
    if (salvandoValorHora) return;
    setErroValorHora("");
    setOkValorHora(false);
    setSalvandoValorHora(true);
    try {
      const r = await salvarValorHora(empresaId, {
        nome: nomeValorHora.trim(),
        valorHora: hora.custoFinal,
      });
      if (!r.ok) {
        setErroValorHora(r.error);
        return;
      }
      onHistoricoChange([r.registro, ...historico]);
      setNomeValorHora("");
      setOkValorHora(true);
      window.setTimeout(() => setOkValorHora(false), 2600);
    } catch {
      setErroValorHora(
        "Não foi possível salvar o valor hora. Tente de novo.",
      );
    } finally {
      setSalvandoValorHora(false);
    }
  }

  async function mudarStatusHistorico(id: string, status: StatusValorHora) {
    const anterior = historico;
    setErroValorHora("");
    setMudandoStatusId(id);
    // Otimista: promover a padrão rebaixa o padrão anterior para ativo,
    // espelhando o que a server action faz no banco.
    onHistoricoChange(
      historico.map((h) => {
        if (h.id === id) return { ...h, status };
        if (status === "padrao" && h.status === "padrao")
          return { ...h, status: "ativo" };
        return h;
      }),
    );
    const r = await atualizarStatusValorHora(empresaId, id, status);
    setMudandoStatusId("");
    if (!r.ok) {
      onHistoricoChange(anterior);
      setErroValorHora(r.error);
    }
  }

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
  const multCasas = multInteiro
    ? 0
    : Math.round(multiplicador * 10) / 10 === multiplicador
      ? 1
      : 2;

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
              {multiplicador.toFixed(multCasas)}×
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
            <span aria-hidden="true">⚠</span> Valor recomendado: <b>2</b>. Se
            preferir, utilize um valor entre <b>1</b> e <b>2</b> para adequar
            a margem.
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
          <span className="calc-readout-main-k">
            Custo da hora final{" "}
            <span className="calc-edit-hint">(edite se quiser — o fator da régua acompanha)</span>
          </span>
          <span className="calc-readout-num calc-readout-num--editavel">
            <span className="calc-readout-prefix">R$</span>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Custo da hora final"
              style={{ width: `${Math.max(valorHoraExibido.length, 4)}ch` }}
              value={valorHoraExibido}
              disabled={hora.custoBase <= 0}
              onChange={(e) => setValorHoraEdit(maskMoneyTyping(e.target.value))}
              onBlur={aplicarValorHoraManual}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
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

      {/* histórico de valores hora salvos */}
      <div className="calc-card mt-6">
        <p className="calc-card-kicker">Histórico de valor hora</p>
        <h2 className="calc-card-title">Salvar valor hora</h2>
        <p className="calc-card-sub">
          Dê um nome e salve o valor calculado acima. O valor{" "}
          <b>padrão</b> é o que aparece nos orçamentos; valores <b>ativos</b>{" "}
          podem ser selecionados na hora de montar o orçamento.
        </p>

        <form
          className="calc-vh-form mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            salvarNoHistorico();
          }}
        >
          <label className="grid gap-1.5 flex-1">
            <span className="quiz-label">Nome</span>
            <input
              type="text"
              className="quiz-input"
              placeholder="ex.: Tabela 2026"
              value={nomeValorHora}
              onChange={(e) => setNomeValorHora(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn"
            disabled={salvandoValorHora || hora.custoFinal <= 0}
          >
            {salvandoValorHora
              ? "Salvando…"
              : `Salvar ${brl(hora.custoFinal)}/h`}
          </button>
        </form>

        {erroValorHora && (
          <p className="calc-warn mt-3" role="alert">
            <span aria-hidden="true">⚠</span> {erroValorHora}
          </p>
        )}
        {okValorHora && (
          <p className="calc-saved mt-3" role="status">
            ✓ Valor hora salvo no histórico.
          </p>
        )}

        {historico.length > 0 && (
          <ul className="conta-lista mt-5">
            {historico.map((h) => (
              <li key={h.id} className="conta-item">
                <div className="conta-item-info">
                  <span className="conta-item-nome">{h.nome}</span>
                  <span className="conta-item-sub">
                    {brl(h.valorHora)}/h · {formatData(h.data)}
                  </span>
                </div>
                <select
                  className={`calc-hist-status calc-vh-status--${h.status}`}
                  value={h.status}
                  onChange={(e) =>
                    mudarStatusHistorico(
                      h.id,
                      e.target.value as StatusValorHora,
                    )
                  }
                  disabled={mudandoStatusId === h.id}
                  aria-label={`Status do valor hora ${h.nome}`}
                >
                  {(
                    Object.keys(STATUS_VALOR_HORA_LABEL) as StatusValorHora[]
                  ).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_VALOR_HORA_LABEL[st]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

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
