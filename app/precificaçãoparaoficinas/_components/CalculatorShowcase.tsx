"use client";

import { useEffect, useRef } from "react";
import styles from "./combo.module.css";

const screens = [
  { number: 1, title: "Custos e cálculo da hora técnica" },
  { number: 2, title: "Precificação das peças e markup" },
  { number: 4, title: "Detalhamento e total das peças" },
  { number: 5, title: "Cliente, hora técnica e peças" },
  { number: 6, title: "Horas de serviço por peça" },
  { number: 7, title: "Resumo e envio do orçamento" },
  { number: 8, title: "Resultados e origem dos clientes" },
  { number: 9, title: "Histórico e aprovação dos orçamentos" },
  { number: 10, title: "Detalhes de cada orçamento" },
  { number: 11, title: "Orçamento pronto para o WhatsApp" },
  { number: 12, title: "Visão geral da calculadora" },
];

export default function CalculatorShowcase() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ offset: 0, width: 0, pointer: -1, lastX: 0, startX: 0, dragged: false, focused: false });

  function moveBy(delta: number) {
    const state = motion.current;
    if (!state.width || !trackRef.current) return;
    state.offset = ((state.offset + delta) % state.width + state.width) % state.width - state.width;
    trackRef.current.style.transform = `translate3d(${state.offset}px, 0, 0)`;
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const group = track?.firstElementChild;
    if (!viewport || !track || !group) return;
    const measure = () => {
      motion.current.width = group.getBoundingClientRect().width;
      moveBy(0);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    measure();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;
    const animate = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      if (!reducedMotion.matches && motion.current.pointer === -1 && !motion.current.focused) {
        moveBy(elapsed * 0.022);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  function endDrag() {
    motion.current.pointer = -1;
    viewportRef.current?.removeAttribute("data-dragging");
  }

  return (
    <div className={styles.showcase} role="region" aria-label="Conheça cada parte da calculadora">
      <div className={styles.showcaseViewport} ref={viewportRef}
        tabIndex={0} aria-label="Arraste para os lados ou use as setas do teclado para explorar as telas"
        onPointerDown={event => {
          if (!event.isPrimary || event.button !== 0) return;
          const state = motion.current;
          state.pointer = event.pointerId;
          state.focused = false;
          state.startX = state.lastX = event.clientX;
          state.dragged = false;
        }}
        onPointerMove={event => {
          const state = motion.current;
          if (state.pointer !== event.pointerId) return;
          if (!state.dragged && Math.abs(event.clientX - state.startX) > 6) {
            state.dragged = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.setAttribute("data-dragging", "true");
          }
          if (state.dragged) moveBy(event.clientX - state.lastX);
          state.lastX = event.clientX;
        }}
        onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onClickCapture={event => {
          if (motion.current.dragged && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
        }}
        onDragStart={event => event.preventDefault()}
        onFocusCapture={event => {
          // Keep keyboard focus visible, while pointer interaction resumes the loop.
          if (event.target.matches(":focus-visible")) {
            motion.current.focused = true;
            const slide = event.target.closest("a");
            if (slide) {
              motion.current.offset = -slide.offsetLeft;
              moveBy(0);
            }
          }
        }}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) motion.current.focused = false;
        }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveBy(event.key === "ArrowLeft" ? 310 : -310);
          }
        }}>
        <div className={styles.showcaseTrack} ref={trackRef}>
          {[0, 1].map(copy => (
            <div key={copy} className={styles.showcaseGroup} aria-hidden={copy === 1 ? true : undefined}>
              {screens.map(screen => (
                <a key={screen.number} className={styles.showcaseSlide}
                  href={`/combo-precificacao/calculadora${screen.number}.jpg`}
                  target="_blank" rel="noopener noreferrer" tabIndex={copy === 1 ? -1 : undefined}
                  aria-label={`Ampliar: ${screen.title}`}>
                  <div className={styles.showcaseScreen}>
                    <img src={`/combo-precificacao/calculadora${screen.number}.jpg`}
                      alt={copy === 0 ? screen.title : ""} width={420} height={300} decoding="async" />
                  </div>
                  <span>{screen.title}</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
