"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./oficina-organizada.module.css";

export default function ScrollOpening({ children }: { children: ReactNode }) {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scene.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reducedMotion.matches) {
        delete root.dataset.enhanced;
        root.style.removeProperty("--opening-fade");
        root.style.removeProperty("--opening-scale");
        root.style.removeProperty("--opening-shift");
        return;
      }
      root.dataset.enhanced = "true";
      const sticky = root.firstElementChild as HTMLElement;
      const top = parseFloat(getComputedStyle(sticky).top) || 0;
      const distance = Math.max(1, sticky.offsetHeight);
      const progress = Math.max(0, Math.min(1, (top - root.getBoundingClientRect().top) / distance));
      root.style.setProperty("--opening-fade", String(progress));
      root.style.setProperty("--opening-scale", String(1 + progress * 0.045));
      root.style.setProperty("--opening-shift", `${-progress * 24}px`);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <div ref={scene} className={styles.photoScene}>
    <div className={styles.photoSticky}>
      <Image className={styles.openingPhoto} src="/oficina-organizada/fotoquadro1.webp" alt="Diego Mensor mostrando o quadro de serviços dentro da própria oficina" fill sizes="100vw" priority />
      <div className={styles.openingGradient} aria-hidden="true" />
      <div className={styles.openingFade} aria-hidden="true" />
    </div>
    <div className={styles.openingContent}>
      <Image className={styles.openingLogo} src="/logooo.branca.png" alt="Operação: Oficina Organizada" width={1774} height={887} sizes="96px" />
      {children}
    </div>
  </div>;
}
