"use client";

import { useEffect, useState } from "react";
import { allQuestions, sections, type Question } from "./questions";
import styles from "./diagnostico.module.css";

type Answers = Record<string, string>;
const STORAGE_KEY = "diagnostico-mentoria-oag";

export default function DiagnosticoForm() {
  const [screen, setScreen] = useState<"intro" | "form" | "done">("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const current = sections[step];
  const answered = allQuestions.filter((q) => answers[q.id]?.trim()).length;
  const progress = Math.round((answered / allQuestions.length) * 100);

  useEffect(() => {
    try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) setAnswers(JSON.parse(saved)); } catch { /* storage indisponível */ }
  }, []);
  useEffect(() => { if (Object.keys(answers).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); }, [answers]);

  function update(id: string, value: string) {
    setAnswers((old) => ({ ...old, [id]: value }));
    if (errors[id]) setErrors((old) => ({ ...old, [id]: "" }));
  }
  function validateAll() {
    const next: Record<string, string> = {};
    allQuestions.forEach((q) => { if (!q.optional && !answers[q.id]?.trim()) next[q.id] = "Responda este campo para concluir."; });
    setErrors(next);
    const firstId = Object.keys(next)[0];
    if (firstId) {
      setStep(sections.findIndex((section) => section.questions.some((q) => q.id === firstId)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return !Object.keys(next).length;
  }
  async function advance() {
    if (step < sections.length - 1) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!validateAll()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/diagnostico-mentoria", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      if (!response.ok) throw new Error();
      localStorage.removeItem(STORAGE_KEY); setScreen("done"); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setErrors({ submit: "Não foi possível enviar agora. Suas respostas continuam salvas — confira sua conexão e tente novamente." }); }
    finally { setSubmitting(false); }
  }

  if (screen === "intro") return <Intro start={() => setScreen("form")} hasDraft={answered > 0} />;
  if (screen === "done") return <Success name={answers.nome} />;
  return <main className={styles.page}>
    <header className={styles.top}><Brand /><div className={styles.save}><span>✓</span> Progresso salvo automaticamente</div></header>
    <nav className={styles.progress} aria-label="Progresso"><div className={styles.progressMeta}><b>{progress}% concluído</b><span>Etapa {step + 1} de {sections.length}</span></div><div className={styles.track}><i style={{ width: `${progress}%` }} /></div><div className={styles.dots}>{sections.map((section, index) => <button type="button" key={section.title} onClick={() => { setStep(index); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={index === step ? styles.active : index < step ? styles.past : ""} aria-label={`Etapa ${index + 1}: ${section.title}`}><span>{index < step ? "✓" : index + 1}</span><em>{section.title}</em></button>)}</div></nav>
    <section className={styles.shell}>
      <div className={styles.sectionHead}><span>{current.icon}</span><div><p>Diagnóstico inicial</p><h1>{current.title}</h1><small>{current.subtitle}</small></div></div>
      <div className={styles.fields}>{current.questions.map((q, i) => <Field key={q.id} question={q} index={i + 1} value={answers[q.id] || ""} error={errors[q.id]} update={update} />)}</div>
      {errors.submit && <p className={styles.submitError}>{errors.submit}</p>}
      <footer className={styles.actions}>{step ? <button type="button" className={styles.back} onClick={() => { setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>← Voltar</button> : <span />}<button type="button" className={styles.next} onClick={advance} disabled={submitting}>{submitting ? "Enviando..." : step === sections.length - 1 ? "Concluir diagnóstico" : "Salvar e continuar"}<b>→</b></button></footer>
    </section>
  </main>;
}

function Field({ question: q, index, value, error, update }: { question: Question; index: number; value: string; error?: string; update: (id: string, value: string) => void }) {
  const selected = value ? value.split(" | ") : [];
  function toggle(option: string) { let next = selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option]; if (q.id === "conquistas" && next.length > 3) return; update(q.id, next.join(" | ")); }
  return <fieldset id={`diag-${q.id}`} className={`${styles.field} ${error ? styles.invalid : ""}`}><legend><i>{String(index).padStart(2, "0")}</i><span>{q.label}{q.optional && <em> opcional</em>}</span></legend>{q.hint && <p className={styles.hint}>{q.hint}</p>}
    {q.type === "textarea" ? <textarea rows={5} value={value} placeholder={q.placeholder} onChange={(e) => update(q.id, e.target.value)} />
    : q.type === "radio" ? <div className={styles.options}>{q.options?.map((o) => <button type="button" key={o} className={value === o ? styles.selected : ""} onClick={() => update(q.id, o)}><i>{value === o ? "✓" : ""}</i>{o}</button>)}</div>
    : q.type === "checkbox" ? <div className={`${styles.options} ${styles.checks}`}>{q.options?.map((o) => <button type="button" key={o} className={selected.includes(o) ? styles.selected : ""} onClick={() => toggle(o)}><i>{selected.includes(o) ? "✓" : ""}</i>{o}</button>)}</div>
    : q.type === "scale" ? <div className={styles.scale}><div>{Array.from({ length: 11 }, (_, n) => <button type="button" key={n} onClick={() => update(q.id, String(n))} className={value === String(n) ? styles.selected : ""}>{n}</button>)}</div><p><span>0 — Muito baixo</span><span>10 — Excelente</span></p></div>
    : <div className={q.type === "money" ? styles.money : ""}>{q.type === "money" && <span>R$</span>}<input type={q.type === "number" ? "number" : "text"} inputMode={q.type === "number" || q.type === "money" ? "decimal" : "text"} value={value} placeholder={q.placeholder} onChange={(e) => update(q.id, e.target.value)} /></div>}
    {error && <small className={styles.error}>{error}</small>}
  </fieldset>;
}

function Brand() { return <div className={styles.brand}><span><strong>Mentoria OAG</strong><small>Diego Mensor</small></span></div>; }
function Intro({ start, hasDraft }: { start: () => void; hasDraft: boolean }) { return <main className={styles.intro}><div className={styles.glow} /><section><Brand /><div className={styles.kicker}><span>●</span> Primeiro passo da mentoria</div><h1>Bem-vindo à sua <em>nova fase como dono.</em></h1><div className={styles.introCopy}><p className={styles.lead}>Antes da nossa primeira sessão, quero conhecer a realidade da sua oficina — sem julgamento, sem resposta certa e sem precisar parecer melhor do que está.</p><div className={styles.message}><b>Por que esse diagnóstico importa?</b><p>Suas respostas vão me permitir chegar ao nosso encontro já entendendo seus números, operação, equipe e objetivos. Assim, usamos nosso tempo para construir soluções.</p></div></div><div className={styles.meta}><span><b>100%</b> confidencial</span></div><button className={styles.start} onClick={start}>{hasDraft ? "Continuar de onde parei" : "Começar meu diagnóstico"}<span>→</span></button><small className={styles.calm}>Reserve um momento tranquilo e responda com calma.</small></section></main>; }
function Success({ name }: { name?: string }) { return <main className={styles.success}><section><Brand /><div className={styles.successIcon}>✓</div><p>Diagnóstico concluído</p><h1>Excelente, {name?.split(" ")[0] || ""}.</h1><p>Suas respostas chegaram até nós. Agora o Diego poderá preparar sua primeira sessão com clareza sobre a realidade da sua oficina e o caminho que vocês vão construir juntos.</p><div><b>Próximo passo é a nossa reunião de diagnóstico.</b></div></section></main>; }
