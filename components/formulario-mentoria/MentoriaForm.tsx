"use client";

import { useEffect, useRef, useState } from "react";
import { allQuestions, type Question } from "./questions";
import styles from "./formulario.module.css";

type Answers = Record<string, string>;

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || "direto",
    utmMedium: params.get("utm_medium") || "",
    utmCampaign: params.get("utm_campaign") || "",
    utmContent: params.get("utm_content") || "",
    utmTerm: params.get("utm_term") || "",
    landingPage: window.location.href,
    referrer: document.referrer || "direto",
  };
}

export default function MentoriaForm() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({}), [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false), [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(false), [typing, setTyping] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null), inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null), sessionIdRef = useRef("");
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();
  const conversationRef = useRef<HTMLElement>(null);
  const current = allQuestions[index], progress = Math.round(((index + 1) / allQuestions.length) * 100);

  useEffect(() => { const audio = audioRef.current; if (!audio) return; audio.volume = .025; void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }, []);
  useEffect(() => { if (done) return; setTyping(true); const timer = window.setTimeout(() => { setTyping(false); window.setTimeout(() => inputRef.current?.focus(), 40); }, index ? 360 : 650); return () => window.clearTimeout(timer); }, [index, done]);
  useEffect(() => {
    if (typing || done) return;
    const scrollToQuestion = () => conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
    const frame = window.requestAnimationFrame(scrollToQuestion);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", scrollToQuestion);
    return () => { window.cancelAnimationFrame(frame); viewport?.removeEventListener("resize", scrollToQuestion); };
  }, [typing, index, done]);

  function update(value: string) { setAnswers(previous => ({ ...previous, [current.id]: value })); setError(""); }
  function validationMessage(question: Question, value: string) {
    if (!value) return "Me conta essa resposta para a gente continuar.";
    if (question.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Esse e-mail parece incompleto. Pode conferir?";
    if (question.type === "tel" && value.replace(/\D/g, "").length < 10) return "Coloque seu WhatsApp com DDD, por favor.";
    if (question.type === "textarea" && value.length < 10) return "Conta um pouquinho mais para eu entender bem.";
    return "";
  }
  function sendProgress(currentAnswers: Answers, step: number, completed: boolean) {
    void fetch("/api/aplicacao-mentoria/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ sessionId: sessionIdRef.current, step, totalSteps: allQuestions.length, completed, answers: currentAnswers, attribution: getAttribution() }),
    }).catch(() => {});
  }
  async function savePartial(name: string) {
    const whatsapp = (answers.whatsapp || "").trim();
    if (name.length < 2 || whatsapp.replace(/\D/g, "").length < 10) return;
    try {
      await fetch("/api/aplicacao-mentoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "partial", nome: name, whatsapp, sessionId: sessionIdRef.current, attribution: getAttribution() }),
        keepalive: true,
      });
    } catch { /* O formulário continua mesmo se a captura parcial falhar. */ }
  }
  async function advance(valueOverride?: string) {
    const value = (valueOverride ?? answers[current.id] ?? "").trim(), message = validationMessage(current, value);
    if (message) { setError(message); inputRef.current?.focus(); return; }
    const updatedAnswers = { ...answers, [current.id]: value };
    setAnswers(updatedAnswers);
    if (current.id === "nome") await savePartial(value);
    if (index < allQuestions.length - 1) { setIndex(value => value + 1); setError(""); sendProgress(updatedAnswers, current.number, false); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/aplicacao-mentoria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...updatedAnswers, attribution: getAttribution(), sessionId: sessionIdRef.current }) });
      if (!response.ok) throw new Error(); setDone(true);
    } catch { setError("Não consegui enviar agora. Confira sua conexão e tente novamente."); }
    finally { setSubmitting(false); }
  }
  function choose(option: string) { update(option); window.setTimeout(() => void advance(option), 180); }
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && current.type !== "textarea") { event.preventDefault(); void advance(); }
    if (event.key === "Enter" && event.ctrlKey && current.type === "textarea") { event.preventDefault(); void advance(); }
  }
  function toggleMusic() { const audio = audioRef.current; if (!audio) return; if (audio.paused) void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); else { audio.pause(); setPlaying(false); } }
  const audio = <audio ref={audioRef} src="/Gangsters paradise.mp3" preload="metadata" loop />;
  const music = <button type="button" className={styles.musicControl} onClick={toggleMusic} aria-label={playing ? "Pausar música" : "Ativar música"}><i>{playing ? "Ⅱ" : "▶"}</i><span>{playing ? "Pausar música" : "Ativar música"}</span></button>;

  if (done) return <>{audio}<Success name={answers.nome} />{music}</>;
  return <>{audio}<main className={styles.chatPage}>
    <header className={styles.chatHeader}><div className={styles.avatar}>DM<span /></div><div><b>Diego Mensor</b><span><i /> online agora</span></div><small>Aplicação para mentoria</small></header>
    <div className={styles.topProgress}><i style={{ width: `${progress}%` }} /></div>
    <section ref={conversationRef} className={styles.conversation}>
      <div className={styles.history}>{index === 0 && <BotBubble>Fala JOVEM!🫡<br />Vou te fazer algumas perguntas rápidas para entender o momento da sua oficina.</BotBubble>}{allQuestions.slice(Math.max(0, index - 2), index).map(question => <div className={styles.exchange} key={question.id}><BotBubble muted>{question.label}</BotBubble><div className={styles.userBubble}>{answers[question.id]}</div></div>)}</div>
      {typing ? <div className={styles.typing} aria-label="Diego está digitando"><i /><i /><i /></div> : <div className={styles.activeQuestion} key={current.id}>
        <div className={styles.botRow}><div className={styles.miniAvatar}>DM</div><div><span className={styles.sender}>Diego</span><div className={styles.botBubble}><b>{current.label}</b>{current.description && <p>{current.description}</p>}</div></div></div>
        <div className={styles.answerArea}>{current.type === "choice" ? <div className={styles.choiceGrid}>{current.options?.map((option, optionIndex) => <button key={option} type="button" className={answers[current.id] === option ? styles.chosen : ""} onClick={() => choose(option)}><i>{String.fromCharCode(65 + optionIndex)}</i><span>{option}</span><b>→</b></button>)}</div> : <div className={styles.textAnswer}>{current.type === "textarea" ? <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={answers[current.id] || ""} placeholder={current.placeholder} rows={4} onChange={event => update(event.target.value)} onKeyDown={onKeyDown} /> : <input ref={inputRef as React.RefObject<HTMLInputElement>} type={current.type} inputMode={current.type === "tel" ? "tel" : current.type === "email" ? "email" : "text"} autoComplete={current.type === "email" ? "email" : current.type === "tel" ? "tel" : current.id === "nome" ? "name" : "off"} value={answers[current.id] || ""} placeholder={current.placeholder} onChange={event => update(event.target.value)} onKeyDown={onKeyDown} />}<button type="button" onClick={() => void advance()} disabled={submitting} aria-label="Enviar resposta">{submitting ? "…" : "➜"}</button></div>}{error && <p className={styles.chatError} role="alert">{error}</p>}<div className={styles.helper}>{current.type === "textarea" ? "Ctrl + Enter para continuar" : current.type === "choice" ? "Escolha uma opção" : "Enter para continuar"}</div></div>
      </div>}
    </section>
    <footer className={styles.chatFooter}><button type="button" onClick={() => { if (index) { setIndex(value => value - 1); setError(""); } }} disabled={index === 0}>← Voltar</button><span>{index + 1} de {allQuestions.length}</span><b>{progress}%</b></footer>
  </main>{music}</>;
}

function BotBubble({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) { return <div className={`${styles.botBubble} ${muted ? styles.mutedBubble : ""}`}>{children}</div>; }
function Success({ name }: { name?: string }) { return <main className={styles.success}><section><span className={styles.successIcon}>✓</span><p>Aplicação recebida</p><h1>Obrigado, {name?.split(" ")[0] || ""}.</h1><p>Suas respostas foram enviadas com sucesso. Nossa equipe vai analisar seu momento e, caso a mentoria faça sentido para sua oficina, entraremos em contato pelo WhatsApp informado.</p><div><span>Próxima etapa</span><b>Aguarde nosso contato para uma conversa de diagnóstico.</b></div></section></main>; }
