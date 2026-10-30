"use client";

import { useEffect, useState } from "react";
import { lots, getLotIndex, formatPrice } from "./event-config";
import styles from "./oficina-organizada.module.css";

export function useClock(initialTime: number) {
  const [now, setNow] = useState(initialTime);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);
  return now;
}

export function LotPricing({ initialTime }: { initialTime: number }) {
  const now = useClock(initialTime);
  const lot = lots[getLotIndex(now)];
  const [whole, cents] = lot.price.toFixed(2).split(".");
  return <><div className={styles.lotBadge}>{lot.label}</div><div className={styles.price} aria-label={formatPrice(lot.price)}><span>R$</span>{whole}<small>,{cents}</small></div></>;
}

export function LotCountdown({ initialTime, variant = "banner" }: { initialTime: number; variant?: "banner" | "offer" }) {
  const now = useClock(initialTime);
  const index = getLotIndex(now);
  const lot = lots[index];
  const end = Date.parse(lot.endsAt);
  const start = Date.parse(lot.startsAt);
  const finalLot = index === lots.length - 1;
  const remaining = Math.max(0, end - now);
  const expired = remaining === 0;
  const seconds = Math.floor(remaining / 1000);
  const units = [[Math.floor(seconds / 86400), "DIAS"], [Math.floor(seconds / 3600) % 24, "HRS"], [Math.floor(seconds / 60) % 60, "MIN"], [seconds % 60, "SEG"]] as const;
  const timer = <div className={styles.timer} role="timer" aria-live="off" aria-label={`${units[0][0]} dias, ${units[1][0]} horas, ${units[2][0]} minutos e ${units[3][0]} segundos ${finalLot ? "para o evento" : "para a virada do lote"}`}>
    {units.map(([value,label]) => <span key={label}><b>{String(value).padStart(2,"0")}</b><small>{label}</small></span>)}
  </div>;
  if (variant === "banner") return <a className={styles.urgencyBar} href="#ingresso"><span className={styles.urgencyLabel}><i aria-hidden="true" />{expired ? "A IMERSÃO JÁ COMEÇOU" : finalLot ? "ÚLTIMO LOTE!" : "O LOTE VAI VIRAR!"}</span>{timer}</a>;
  const progress = Math.min(100,Math.max(0,((now - start) / (end - start)) * 100));
  return <div className={styles.lotProgress}>
    <p>{expired ? "O evento já começou." : finalLot ? "Último lote. Este é o preço final." : `${index === 0 ? "O lote zero" : index === 1 ? "O primeiro lote" : "O segundo lote"} vai virar.`}</p>
    <div className={styles.progressTrack} role="progressbar" aria-label={finalLot ? "Tempo decorrido até o evento" : "Tempo decorrido até a virada do lote"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{width:`${progress}%`}} /></div>
    <span className={styles.progressCaption}>{finalLot ? "TEMPO PARA O EVENTO" : "TEMPO PARA A VIRADA DO LOTE"}</span>{timer}
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
