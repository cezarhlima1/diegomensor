"use client";

import { useEffect, useState } from "react";

const CYCLE_SECONDS = 15 * 60;

export default function OfertaLimitadaParaOficinas() {
  const [remaining, setRemaining] = useState(CYCLE_SECONDS);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(CYCLE_SECONDS - (elapsed % (CYCLE_SECONDS + 1)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 top-0 z-[60] flex min-h-14 items-center justify-center gap-3 bg-[#d71920] px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center font-display text-[clamp(15px,2vw,20px)] font-black text-white shadow-[0_6px_24px_rgba(215,25,32,.25)]">
      <span>Essa oferta ficará válida por tempo limitado</span>
      <span role="timer" aria-label={`${minutes} minutos e ${seconds} segundos`} className="rounded-md border border-white/25 bg-black/20 px-3 py-1 font-mono tabular-nums">
        {minutes}:{seconds}
      </span>
    </div>
  );
}
