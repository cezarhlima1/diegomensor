"use client";

import { useState } from "react";
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
  const [paused, setPaused] = useState(false);

  return (
    <div className={styles.showcase} role="region" aria-label="Conheça cada parte da calculadora">
      <div className={styles.showcaseViewport}>
        <div className={styles.showcaseTrack} data-paused={paused}>
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
      <button type="button" className={styles.showcaseToggle} aria-pressed={paused} onClick={() => setPaused(value => !value)}>
        {paused ? "Continuar apresentação" : "Pausar apresentação"}
      </button>
    </div>
  );
}
