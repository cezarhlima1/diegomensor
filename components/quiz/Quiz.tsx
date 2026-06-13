"use client";

import { useState } from "react";
import Cta from "@/components/Cta";
import { questions, scoreQuiz, type QuizResult } from "./quizData";

type Stage = "intro" | "lead" | "quiz" | "result";

type Lead = { name: string; email: string; phone: string };
type LeadErrors = Partial<Record<keyof Lead, string>>;

const emptyLead: Lead = { name: "", email: "", phone: "" };

export default function Quiz() {
  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [leadErrors, setLeadErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const total = questions.length;
  const progress = stage === "result" ? 100 : Math.round((current / total) * 100);

  function validateLead(data: Lead): LeadErrors {
    const errors: LeadErrors = {};
    if (data.name.trim().length < 3) errors.name = "Digite seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
      errors.email = "Digite um e-mail válido.";
    if (data.phone.replace(/\D/g, "").length < 10)
      errors.phone = "Digite um telefone com DDD.";
    return errors;
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateLead(lead);
    setLeadErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch {
      // se o registro falhar, não bloqueia a pessoa de fazer o quiz
    } finally {
      setSubmitting(false);
      setStage("quiz");
    }
  }

  function updateLead(field: keyof Lead, value: string) {
    setLead((prev) => ({ ...prev, [field]: value }));
    if (leadErrors[field]) setLeadErrors((prev) => ({ ...prev, [field]: undefined }));
  }

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
    setLead(emptyLead);
    setLeadErrors({});
    setStage("intro");
  }

  return (
    <section className="relative min-h-[100svh] flex items-center py-24">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[760px]">
        {/* barra de progresso (só durante as perguntas e no resultado) */}
        {(stage === "quiz" || stage === "result") && (
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
            <span className="tag">Diagnóstico em 2 minutos</span>
            <h1 className="section-title mt-5">
              Em menos de 2 minutos, descubra se você está{" "}
              <span className="text-blue">faturando menos do que deveria.</span>
            </h1>
            <p className="lead mt-5 max-w-[540px] mx-auto">
              Responda algumas perguntas rápidas e descubra se você está cobrando
              certo ou perdendo dinheiro em serviços todos os dias.
            </p>
            <div className="mt-9">
              <button className="btn btn--lg" onClick={() => setStage("lead")}>
                Começar diagnóstico
              </button>
            </div>
            <p className="reassure mt-4">
              <b>Grátis</b> · leva 1 minuto · resultado na hora
            </p>
          </div>
        )}

        {/* ---------- CAPTURA DE LEAD ---------- */}
        {stage === "lead" && (
          <div className="cta-reveal max-w-[520px] mx-auto">
            <div className="text-center">
              <span className="tag">Quase lá</span>
              <h2 className="font-display font-extrabold text-[clamp(24px,4vw,36px)] leading-[1.1] tracking-[-.02em] mt-5">
                Pra onde enviamos seu <span className="text-blue">resultado?</span>
              </h2>
              <p className="lead mt-4">
                Preencha seus dados e o diagnóstico libera na sequência.
              </p>
            </div>

            <form className="grid gap-4 mt-8" onSubmit={submitLead} noValidate>
              <div className="grid gap-1.5">
                <label htmlFor="lead-name" className="quiz-label">Nome completo</label>
                <input
                  id="lead-name"
                  type="text"
                  autoComplete="name"
                  className={`quiz-input ${leadErrors.name ? "is-invalid" : ""}`}
                  placeholder="Seu nome completo"
                  value={lead.name}
                  onChange={(e) => updateLead("name", e.target.value)}
                />
                {leadErrors.name && <span className="quiz-error">{leadErrors.name}</span>}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="lead-email" className="quiz-label">E-mail</label>
                <input
                  id="lead-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  className={`quiz-input ${leadErrors.email ? "is-invalid" : ""}`}
                  placeholder="voce@email.com"
                  value={lead.email}
                  onChange={(e) => updateLead("email", e.target.value)}
                />
                {leadErrors.email && <span className="quiz-error">{leadErrors.email}</span>}
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="lead-phone" className="quiz-label">Telefone (com DDD)</label>
                <input
                  id="lead-phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  className={`quiz-input ${leadErrors.phone ? "is-invalid" : ""}`}
                  placeholder="(00) 00000-0000"
                  value={lead.phone}
                  onChange={(e) => updateLead("phone", e.target.value)}
                />
                {leadErrors.phone && <span className="quiz-error">{leadErrors.phone}</span>}
              </div>

              <button type="submit" className="btn btn--wide mt-2" disabled={submitting}>
                {submitting ? "Enviando…" : "Ver meu diagnóstico"}
              </button>
            </form>

            <button
              onClick={() => setStage("intro")}
              className="mt-6 mx-auto block font-mono text-[12px] tracking-[.1em] uppercase text-muted hover:text-offwhite transition-colors"
            >
              ← Voltar
            </button>
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
