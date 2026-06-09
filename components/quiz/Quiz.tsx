"use client";

import { useState } from "react";
import Cta from "@/components/Cta";
import { questions, scoreQuiz, type QuizResult } from "./quizData";

type Stage = "intro" | "quiz" | "result";

export default function Quiz() {
  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  const total = questions.length;
  const progress = stage === "result" ? 100 : Math.round((current / total) * 100);

  function choose(optionIndex: number) {
    const next = [...answers];
    next[current] = optionIndex;
    setAnswers(next);

    if (current + 1 < total) {
      setCurrent(current + 1);
    } else {
      setResult(scoreQuiz(next));
      setStage("result");
    }
  }

  function back() {
    if (current > 0) setCurrent(current - 1);
    else setStage("intro");
  }

  function restart() {
    setAnswers([]);
    setCurrent(0);
    setResult(null);
    setStage("intro");
  }

  return (
    <section className="relative min-h-[100svh] flex items-center py-24">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[760px]">
        {/* barra de progresso (some na intro) */}
        {stage !== "intro" && (
          <div className="mb-9">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-mono text-[11px] tracking-[.14em] uppercase text-muted">
                {stage === "result" ? "Resultado" : `Pergunta ${current + 1} de ${total}`}
              </span>
              <span className="font-mono text-[11px] tracking-[.14em] uppercase text-blue">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-blue transition-[width] duration-500 ease-out"
                style={{ width: `${progress}%`, boxShadow: "0 0 12px var(--color-blue)" }}
              />
            </div>
          </div>
        )}

        {/* ---------- INTRO ---------- */}
        {stage === "intro" && (
          <div className="text-center cta-reveal">
            <span className="tag">Diagnóstico em 1 minuto</span>
            <h1 className="section-title mt-5">
              Qual treinamento vai{" "}
              <span className="text-blue">destravar sua oficina?</span>
            </h1>
            <p className="lead mt-5 max-w-[540px] mx-auto">
              Responda {total} perguntas rápidas sobre como você cobra hoje e descubra
              o caminho certo pra parar de deixar dinheiro na mesa.
            </p>
            <div className="mt-9">
              <button className="btn btn--lg" onClick={() => setStage("quiz")}>
                Começar diagnóstico
              </button>
            </div>
            <p className="reassure mt-4">
              <b>Grátis</b> · sem cadastro · resultado na hora
            </p>
          </div>
        )}

        {/* ---------- PERGUNTAS ---------- */}
        {stage === "quiz" && (
          <div key={current} className="cta-reveal">
            <h2 className="font-display font-extrabold text-[clamp(24px,4vw,38px)] leading-[1.1] tracking-[-.02em]">
              {questions[current].question}
            </h2>

            <div className="grid gap-3 mt-8">
              {questions[current].options.map((opt, i) => {
                const selected = answers[current] === i;
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    className={`quiz-opt ${selected ? "is-selected" : ""}`}
                  >
                    <span className="quiz-opt-key">{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1 text-left">{opt.label}</span>
                    <span className="quiz-opt-arrow" aria-hidden="true">→</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={back}
              className="mt-7 font-mono text-[12px] tracking-[.1em] uppercase text-muted hover:text-offwhite transition-colors"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* ---------- RESULTADO ---------- */}
        {stage === "result" && result && (
          <div className="cta-reveal">
            <div className="price-card">
              <div className="pointer-glow" aria-hidden="true" />
              <span className="limited">{result.kicker}</span>
              <p className="font-mono text-[12px] tracking-[.14em] uppercase text-muted">
                Treinamento recomendado
              </p>
              <h2 className="font-display font-black text-[clamp(28px,5vw,46px)] leading-[1.05] text-blue mt-1 mb-3">
                {result.course}
              </h2>
              <p className="font-display font-bold text-[clamp(17px,2.4vw,21px)] text-white mb-5">
                {result.tagline}
              </p>
              <p className="text-muted text-[15.5px] leading-relaxed mb-6">
                {result.description}
              </p>

              <ul className="grid gap-3 mb-8">
                {result.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="price-feat-ck">✓</span>
                    <span className="text-offwhite text-[15px]">{h}</span>
                  </li>
                ))}
              </ul>

              <Cta href="#checkout" variant="wide">
                {result.cta}
              </Cta>
            </div>

            <button
              onClick={restart}
              className="mt-7 mx-auto block font-mono text-[12px] tracking-[.1em] uppercase text-muted hover:text-offwhite transition-colors"
            >
              ↻ Refazer diagnóstico
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
