"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@/components/icons";

export default function DestraveInteractions({ href, ctaLabel }: { href: string; ctaLabel: string }) {
  const [showFloatingActions, setShowFloatingActions] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".destrave-theme--lp1");
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups: Array<() => void> = [];

    let ticking = false;
    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      root.style.setProperty("--dest-read-progress", `${progress}%`);
      setShowFloatingActions(window.scrollY > window.innerHeight * 0.72);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    updateScroll();
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    const sections = root.querySelectorAll<HTMLElement>("section");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.target.classList.toggle("dest-section-active", entry.isIntersecting)),
      { threshold: 0.16, rootMargin: "-8% 0px -12%" },
    );
    sections.forEach((section) => observer.observe(section));
    cleanups.push(() => observer.disconnect());

    if (!reduceMotion && canHover) {
      const onPointerMove = (event: PointerEvent) => {
        root.style.setProperty("--dest-pointer-x", `${event.clientX}px`);
        root.style.setProperty("--dest-pointer-y", `${event.clientY}px`);
      };
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      cleanups.push(() => window.removeEventListener("pointermove", onPointerMove));

      root.querySelectorAll<HTMLElement>("[data-dest-tilt]").forEach((card) => {
        const onMove = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.setProperty("--dest-tilt-x", `${(-y * 4).toFixed(2)}deg`);
          card.style.setProperty("--dest-tilt-y", `${(x * 5).toFixed(2)}deg`);
        };
        const onLeave = () => {
          card.style.setProperty("--dest-tilt-x", "0deg");
          card.style.setProperty("--dest-tilt-y", "0deg");
        };
        card.addEventListener("pointermove", onMove);
        card.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          card.removeEventListener("pointermove", onMove);
          card.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  return (
    <>
      <div className="destrave-reading-progress" aria-hidden="true"><span /></div>
      <div className="destrave-pointer-light" aria-hidden="true" />
      <button
        type="button"
        className={`destrave-back-top ${showFloatingActions ? "is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Voltar ao topo"
      >
        ↑
      </button>
      <div className={`destrave-mobile-cta ${showFloatingActions ? "is-visible" : ""}`}>
        <a href={href}>{ctaLabel}<ArrowRight className="w-4 h-4" /></a>
      </div>
    </>
  );
}
