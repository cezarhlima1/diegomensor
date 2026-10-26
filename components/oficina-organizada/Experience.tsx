"use client";

import { useEffect, useState } from "react";
import styles from "./oficina-organizada.module.css";

export function LotCountdown({ deadline, startedAt, variant = "banner" }: { deadline: string | null; startedAt: string; variant?: "banner" | "offer" }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const end = deadline ? Date.parse(deadline) : NaN;
  const start = Date.parse(startedAt);
  const configured = Number.isFinite(end) && end > start;
  const remaining = configured && now !== null ? Math.max(0, end - now) : null;
  const expired = remaining === 0;
  const seconds = Math.floor((remaining ?? 0) / 1000);
  const units = [[Math.floor(seconds / 86400), "DIAS"], [Math.floor(seconds / 3600) % 24, "HRS"], [Math.floor(seconds / 60) % 60, "MIN"], [seconds % 60, "SEG"]] as const;
  const timer = configured ? <div className={styles.timer} role="timer" aria-live="off" aria-label={remaining === null ? "Carregando tempo para virada do lote" : `${units[0][0]} dias, ${units[1][0]} horas, ${units[2][0]} minutos e ${units[3][0]} segundos para a virada do lote`}>
    {units.map(([value,label]) => <span key={label}><b>{now === null ? "--" : String(value).padStart(2,"0")}</b><small>{label}</small></span>)}
  </div> : <span className={styles.pendingTimer}>1º LOTE <b>R$37,00</b></span>;
  if (variant === "banner") return <a className={styles.urgencyBar} href="#ingresso"><span className={styles.urgencyLabel}><i aria-hidden="true" />{expired ? "CONFIRA O LOTE DISPONÍVEL" : "O LOTE VAI VIRAR!"}</span>{timer}</a>;
  const progress = configured && now !== null ? Math.min(100,Math.max(0,((now - start) / (end - start)) * 100)) : 0;
  return <div className={styles.lotProgress}>
    <p>{expired ? "O prazo do primeiro lote terminou." : "O primeiro lote vai virar."}</p>
    {configured ? <>
      <div className={styles.progressTrack} role="progressbar" aria-label="Tempo decorrido até a virada do lote" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width:`${progress}%`}} /></div>
      <span className={styles.progressCaption}>TEMPO PARA A VIRADA DO LOTE</span>{timer}
    </> : <div className={styles.awaitingProgress}><span /> <small>PRIMEIRO LOTE DISPONÍVEL</small></div>}
  </div>;
}

export function PageMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-oficina-page]");
    root?.querySelectorAll(".reveal").forEach(element => element.classList.add("in"));
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add(styles.inView); observer.unobserve(entry.target); }
    }), {threshold:0.12});
    root.querySelectorAll("[data-motion]").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}
