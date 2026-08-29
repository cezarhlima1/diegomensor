"use client";

// Helpers de UI compartilhados entre Calculadora.tsx e Passo1.tsx.
// Movidos de Calculadora.tsx sem alteração (Fase 4) para evitar import
// circular: Calculadora carrega Passo1 via next/dynamic e ambos usam
// estes componentes/hooks.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { brl, formatMoneyBlur, maskMoneyTyping } from "./calcLogic";

/** Confirmação visual padronizada para qualquer exclusão da calculadora. */
export function useConfirmacaoExclusao() {
  const [aberta, setAberta] = useState(false);
  const resolverRef = useRef<((confirmado: boolean) => void) | null>(null);

  function pedirConfirmacao(): Promise<boolean> {
    resolverRef.current?.(false);
    setAberta(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function responder(confirmado: boolean) {
    setAberta(false);
    resolverRef.current?.(confirmado);
    resolverRef.current = null;
  }

  useEffect(
    () => () => {
      resolverRef.current?.(false);
    },
    [],
  );

  const dialogConfirmacao =
    aberta && typeof document !== "undefined"
      ? createPortal(
          <div className="calc-confirm-overlay" role="presentation">
            <div
              className="calc-confirm-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="calc-confirm-titulo"
            >
              <h2 id="calc-confirm-titulo">
                Tem certeza que deseja excluir?
              </h2>
              <div className="calc-confirm-acoes">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => responder(false)}
                >
                  Não
                </button>
                <button
                  type="button"
                  className="btn calc-confirm-sim"
                  onClick={() => responder(true)}
                >
                  Sim
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return { pedirConfirmacao, dialogConfirmacao };
}

/* aciona um pulso de brilho quando o valor (arredondado) muda */
export function usePulse(trigger: number): boolean {
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

export function AnimatedBRL({ value }: { value: number }) {
  // Valores monetários precisam permanecer coerentes entre linhas, subtotais
  // e total. A interpolação numérica podia exibir por alguns quadros R$ 450,01
  // enquanto o alvo real já era R$ 450,00. O pulso visual continua indicando
  // mudanças sem apresentar um centavo intermediário inexistente.
  return <>{brl(value)}</>;
}

/* ---------- campo de moeda (R$) ---------- */
export function MoneyField({
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
