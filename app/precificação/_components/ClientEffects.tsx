"use client";

import { useEffect } from "react";

/**
 * Centraliza todas as interações que precisam do DOM/cliente:
 *  - scroll reveal (IntersectionObserver)
 *  - count-up dos números do herói
 *  - botões CTA magnéticos
 *  - brilho que segue o cursor no card de preço
 *  - header com fundo ao rolar + parallax sutil do gradiente do herói
 * Renderiza null — é só efeito colateral, montado uma vez em page.tsx.
 */
export default function ClientEffects() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    /* 1. Scroll reveal */
    const revealEls = document.querySelectorAll<HTMLElement>(".reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealEls.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    } else {
      revealEls.forEach((el) => el.classList.add("in"));
    }

    /* 2. Count-up dos números do herói */
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const target = parseInt(el.getAttribute("data-count") || "0", 10);
      if (reduceMotion) {
        el.textContent = String(target);
        return;
      }
      const dur = 1100;
      let start: number | null = null;
      const step = (ts: number) => {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        el.textContent = String(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = String(target);
      };
      requestAnimationFrame(step);
    });

    /* 3 + 4. Magnético + brilho (apenas em dispositivos com hover real) */
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (!reduceMotion && canHover) {
      document.querySelectorAll<HTMLElement>(".btn").forEach((btn) => {
        btn.classList.add("is-magnetic");
        const strength = 0.28;
        const onMove = (e: MouseEvent) => {
          const r = btn.getBoundingClientRect();
          const mx = (e.clientX - r.left - r.width / 2) * strength;
          const my = (e.clientY - r.top - r.height / 2) * strength;
          btn.style.setProperty("--mx", `${mx.toFixed(1)}px`);
          btn.style.setProperty("--my", `${my.toFixed(1)}px`);
        };
        const onLeave = () => {
          btn.style.setProperty("--mx", "0px");
          btn.style.setProperty("--my", "0px");
        };
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          btn.removeEventListener("mousemove", onMove);
          btn.removeEventListener("mouseleave", onLeave);
        });
      });

      document.querySelectorAll<HTMLElement>("[data-glow]").forEach((card) => {
        const onMove = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty("--px", `${((e.clientX - r.left) / r.width) * 100}%`);
          card.style.setProperty("--py", `${((e.clientY - r.top) / r.height) * 100}%`);
        };
        card.addEventListener("mousemove", onMove);
        cleanups.push(() => card.removeEventListener("mousemove", onMove));
      });
    }

    /* 5. Header + parallax do gradiente do herói */
    const header = document.getElementById("site-header");
    const hero = document.querySelector<HTMLElement>("[data-hero]");
    let ticking = false;
    const applyScroll = () => {
      const y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 24);
      if (!reduceMotion && hero && y < window.innerHeight) {
        hero.style.setProperty("--hero-shift", `${(y * 0.18).toFixed(1)}px`);
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(applyScroll);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));
    applyScroll();

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
