"use client";

// Helpers de UI compartilhados entre Calculadora.tsx e Passo1.tsx.
// Movidos de Calculadora.tsx sem alteração (Fase 4) para evitar import
// circular: Calculadora carrega Passo1 via next/dynamic e ambos usam
// estes componentes/hooks.

import { useEffect, useRef, useState } from "react";
import { brl, formatMoneyBlur, maskMoneyTyping } from "./calcLogic";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* conta o número de forma animada até o alvo (easeOutCubic, via rAF) */
export function useCountUp(target: number, duration = 650): number {
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
  const v = useCountUp(value);
  return <>{brl(v)}</>;
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
