"use client";

import { useEffect, useRef, useState } from "react";
import { allQuestions, steps, type Question } from "./questions";
import styles from "./formulario.module.css";

type Answers = Record<string, string>;

export default function MentoriaForm() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const current = steps[step];
  const progress = Math.round(((step + 1) / steps.length) * 100);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    audioElement.volume = 0.07;
    void audioElement.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  function update(id: string, value: string) {
    setAnswers((previous) => ({ ...previous, [id]: value }));
    if (errors[id]) setErrors((previous) => ({ ...previous, [id]: "" }));
  }

  function validateStep() {
    const nextErrors: Record<string, string> = {};
    current.questions.forEach((question) => {
      const value = answers[question.id]?.trim() || "";
      if (!value) nextErrors[question.id] = "Preencha esta resposta para continuar.";
      if (question.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) nextErrors[question.id] = "Digite um e-mail válido.";
      if (question.type === "tel" && value.replace(/\D/g, "").length < 10) nextErrors[question.id] = "Digite um WhatsApp com DDD.";
      if (question.type === "textarea" && value.length > 0 && value.length < 10) nextErrors[question.id] = "Conte um pouco mais para avaliarmos sua aplicação.";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) document.getElementById(`field-${Object.keys(nextErrors)[0]}`)?.focus();
    return Object.keys(nextErrors).length === 0;
  }

  async function next() {
    if (!validateStep()) return;
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/aplicacao-mentoria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      if (!response.ok) throw new Error("submission-failed");
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ submit: "Não foi possível enviar agora. Verifique sua conexão e tente novamente." });
    } finally {
      setSubmitting(false);
    }
  }

  function startApplication() {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.volume = 0.07;
      void audioElement.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    setStarted(true);
  }

  function toggleMusic() {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    if (audioElement.paused) {
      void audioElement.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audioElement.pause();
      setPlaying(false);
    }
  }

  const audioPlayer = <audio ref={audioRef} src="/Gangsters paradise.mp3" preload="metadata" loop />;
  const musicControl = <button type="button" className={styles.musicControl} onClick={toggleMusic} aria-label={playing ? "Pausar música" : "Ativar música"} aria-pressed={playing}><i>{playing ? "Ⅱ" : "▶"}</i><span>{playing ? "Pausar música" : "Ativar música"}</span></button>;

  if (!started) return <>{audioPlayer}<Intro start={startApplication} />{musicControl}</>;
  if (done) return <>{audioPlayer}<Success name={answers.nome} />{musicControl}</>;

  return <>{audioPlayer}<main className={styles.page}>
    <header className={styles.header}><div className={styles.brand}><span>DM</span><b>Diego Mensor</b></div><small>Aplicação para mentoria</small></header>
    <div className={styles.progressWrap}><div><span>Etapa {step + 1} de {steps.length}</span><b>{progress}% concluído</b></div><div className={styles.progress}><i style={{ width: `${progress}%` }} /></div></div>
    <section className={styles.formShell}>
      <div className={styles.stepIntro}><span>{current.eyebrow}</span><h1>{current.title}</h1><p>{current.description}</p></div>
      <div className={styles.questions}>{current.questions.map((question) => <Field key={question.id} question={question} value={answers[question.id] || ""} error={errors[question.id]} update={update} />)}</div>
      {errors.submit && <p className={styles.submitError} role="alert">{errors.submit}</p>}
      <footer className={styles.actions}>{step > 0 ? <button className={styles.back} onClick={() => setStep((value) => value - 1)}>← Voltar</button> : <span />}<button className={styles.next} onClick={next} disabled={submitting}>{submitting ? "Enviando aplicação…" : step === steps.length - 1 ? "Enviar minha aplicação" : "Continuar"}<span>→</span></button></footer>
    </section>
  </main>{musicControl}</>;
}

function Field({ question, value, error, update }: { question: Question; value: string; error?: string; update: (id: string, value: string) => void }) {
  const id = `field-${question.id}`;
  return <fieldset className={`${styles.field} ${error ? styles.invalid : ""}`}><legend><span>{String(question.number).padStart(2, "0")}</span>{question.label}</legend>{question.description && <p>{question.description}</p>}
    {question.type === "choice" ? <div className={styles.options}>{question.options?.map((option, index) => <label key={option} className={value === option ? styles.selected : ""}><input type="radio" name={question.id} value={option} checked={value === option} onChange={() => update(question.id, option)} /><i>{String.fromCharCode(65 + index)}</i><span>{option}</span><b>✓</b></label>)}</div> : question.type === "textarea" ? <textarea id={id} value={value} placeholder={question.placeholder} onChange={(event) => update(question.id, event.target.value)} rows={5} /> : <input id={id} type={question.type} inputMode={question.type === "tel" ? "tel" : question.type === "email" ? "email" : "text"} autoComplete={question.type === "email" ? "email" : question.type === "tel" ? "tel" : question.id === "nome" ? "name" : "off"} value={value} placeholder={question.placeholder} onChange={(event) => update(question.id, event.target.value)} />}
    {error && <small role="alert">{error}</small>}
  </fieldset>;
}

function Intro({ start }: { start: () => void }) {
  return <main className={styles.intro}><div className={styles.introPattern} /><section><div className={styles.brand}><span>DM</span><b>Diego Mensor</b></div><p className={styles.kicker}>Aplicação para mentoria</p><h1>Se você está aqui é porque chegou a hora de dar um passo ao <em>próximo nível da tua oficina.</em></h1><p className={styles.introLead}>E de verdade? Eu te parabenizo por dar esse passo, esse é o primeiro indício de que tu vai conseguir alcançar o que deseja! Esse formulário vai me ajudar a entender o teu momento, teus desafios e se a mentoria faz sentido pra ti hoje.</p><div className={styles.introMeta}><span><b>Poucas</b> perguntas</span><span><b>5</b> minutos</span><span><b>100%</b> confidencial</span></div><button onClick={start}>Iniciar minha aplicação <span>→</span></button><small>Responda com calma e sinceridade.</small></section></main>;
}

function Success({ name }: { name?: string }) {
  return <main className={styles.success}><section><span className={styles.successIcon}>✓</span><p>Aplicação recebida</p><h1>Obrigado, {name?.split(" ")[0] || ""}.</h1><p>Suas respostas foram enviadas com sucesso. Nossa equipe vai analisar seu momento e, caso a mentoria faça sentido para sua oficina, entraremos em contato pelo WhatsApp informado.</p><div><span>Próxima etapa</span><b>Aguarde nosso contato para uma conversa de diagnóstico.</b></div></section></main>;
}
