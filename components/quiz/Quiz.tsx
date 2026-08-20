"use client";

import { useState } from "react";
import { questions, buildDiagnosis, type QuizResult } from "./quizData";
import styles from "./quiz.module.css";

type Stage = "intro" | "quiz" | "insight" | "lead" | "result";
type Lead = { name: string; phone: string; email: string };
type LeadErrors = Partial<Record<keyof Lead, string>>;

const emptyLead: Lead = { name: "", phone: "", email: "" };
const CHECKOUT_URL = "https://payfast.greenn.com.br/redirect/267726?utm_source=quiz&utm_medium=organico&utm_campaign=precificacao&utm_content=resultado";

export default function Quiz() {
  const [stage, setStage] = useState<Stage>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [analysis, setAnalysis] = useState<string[]>([]);
  const [verdict, setVerdict] = useState("");
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [leadErrors, setLeadErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const progress = stage === "result" ? 100 : Math.round(((current + 1) / questions.length) * 100);

  function choose(optionIndex: number) {
    const next = [...answers]; next[current] = optionIndex; setAnswers(next);
    if (current === 1) { setStage("insight"); return; }
    if (current + 1 < questions.length) { setCurrent(current + 1); return; }
    const diagnosis = buildDiagnosis(next);
    setResult(diagnosis.result); setAnalysis(diagnosis.analysis); setVerdict(diagnosis.verdict); setStage("lead");
  }

  function back() {
    if (current === 2) { setStage("insight"); return; }
    if (current > 0) setCurrent(current - 1); else setStage("intro");
  }

  function updateLead(field: keyof Lead, value: string) {
    setLead((previous) => ({ ...previous, [field]: value }));
    if (leadErrors[field]) setLeadErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function submitLead(event: React.FormEvent) {
    event.preventDefault();
    const errors: LeadErrors = {};
    if (lead.name.trim().length < 3) errors.name = "Digite seu nome completo.";
    if (lead.phone.replace(/\D/g, "").length < 10) errors.phone = "Digite um celular com DDD.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) errors.email = "Digite um e-mail válido.";
    setLeadErrors(errors); if (Object.keys(errors).length) return;
    setSubmitting(true);
    const answersText = answers.map((optionIndex, questionIndex) => `${questionIndex + 1}) ${questions[questionIndex]?.options[optionIndex]?.label || "—"}`).join(" | ");
    try {
      await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...lead, source: "quiz", answers: answersText }) });
    } catch { /* O diagnóstico continua disponível em uma falha transitória. */ }
    finally { setSubmitting(false); setStage("result"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function restart() {
    setStage("intro"); setCurrent(0); setAnswers([]); setResult(null); setAnalysis([]); setVerdict(""); setLead(emptyLead); setLeadErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className={`relative min-h-[100svh] ${styles.quizPage} ${stage === "result" ? `${styles.resultStage} py-16 md:py-24` : "flex items-center py-24"}`}>
      <div className="hero-bg" aria-hidden="true" />
      <div className={`wrap relative ${styles.quizWrap} ${stage === "result" ? "max-w-[980px]" : "max-w-[760px]"}`}>
        {(stage === "quiz" || stage === "insight" || stage === "lead") && <Progress current={current} progress={stage === "lead" ? 100 : progress} label={stage === "lead" ? "Diagnóstico pronto" : stage === "insight" ? "Um dado importante" : `Pergunta ${current + 1} de ${questions.length}`} />}

        {stage === "intro" && <div className={`text-center cta-reveal ${styles.intro}`}>
          <span className="tag">Teste gratuito · 2 minutos</span>
          <h1 className={`section-title mt-5 ${styles.introTitle}`}>Em menos de 2 minutos, descubra se você está <span className="text-blue">COBRANDO errado</span> dentro da sua oficina.</h1>
          <p className="lead mt-5 max-w-[600px] mx-auto">Responda algumas perguntas rápidas e descubra se você está cobrando certo ou perdendo dinheiro em serviços todos os dias.</p>
          <button className="btn btn--lg mt-9" onClick={() => setStage("quiz")}>Começar o teste</button>
          <p className="reassure mt-5"><b>Grátis</b> · leva 2 minutos · resultado na hora · informações criptografadas</p>
        </div>}

        {stage === "quiz" && <div key={current} className={`cta-reveal ${styles.quizShell}`}>
          <span className="font-mono text-[12px] text-blue">{String(current + 1).padStart(2, "0")}</span>
          <h2 className="font-display font-extrabold text-[clamp(24px,4vw,38px)] leading-[1.1] mt-3">{questions[current].question}</h2>
          <div className="grid gap-3 mt-8">{questions[current].options.map((option, index) => <button key={option.label} onClick={() => choose(index)} className={`quiz-opt ${answers[current] === index ? "is-selected" : ""}`}><span className="quiz-opt-key">{String.fromCharCode(65 + index)}</span><span className="flex-1 text-left">{option.label}</span><span className="quiz-opt-arrow">→</span></button>)}</div>
          <button onClick={back} className="mt-7 font-mono text-[12px] tracking-[.1em] uppercase text-muted hover:text-offwhite">← Voltar</button>
        </div>}

        {stage === "insight" && <div className={`cta-reveal rounded-[22px] border border-blue/25 bg-card/95 p-7 md:p-10 ${styles.insightCard}`}>
          <span className="text-[34px]" aria-hidden="true">📊</span>
          <h2 className="font-display font-extrabold text-[clamp(24px,4vw,36px)] mt-4">Se liga nisso.</h2>
          <p className="lead mt-5">50,5% dos donos de oficina que responderam uma pesquisa no meu Instagram disseram que definem o valor da mão de obra conforme a situação ou simplesmente copiando a concorrência.</p>
          <p className="text-offwhite text-[17px] font-bold mt-5">Tu acredita numa coisa dessa?</p>
          <p className="lead mt-4">Quando tu não sabe exatamente quanto precisa cobrar, o preço vira chute. E quando o preço vira chute... o lucro vai embora.</p>
          <p className="lead mt-4">Aí tu trabalha pra caramba, às vezes com a oficina cheia, e o dinheiro simplesmente não aparece.</p>
          <div className={styles.insightActions}><button className="btn btn--lg" onClick={() => { setCurrent(2); setStage("quiz"); }}>Continuar o teste</button>
          <button onClick={() => { setCurrent(1); setStage("quiz"); }} className="font-mono text-[11px] uppercase text-muted">← Voltar</button></div>
        </div>}

        {stage === "lead" && <div className={`cta-reveal max-w-[560px] mx-auto ${styles.leadCapture}`}>
          <div className="rounded-xl border border-amber/25 bg-amber/[.06] p-5 mb-7"><b className="text-amber">⚠ Atenção, pelas respostas que você deu até aqui...</b><p className="text-offwhite mt-3">Existem alguns sinais de que sua oficina pode estar perdendo dinheiro.</p></div>
          <div className="text-center"><span className="tag">Diagnóstico completo pronto</span><h2 className="font-display font-extrabold text-[clamp(25px,4vw,38px)] mt-5">Só preciso dos seus dados para <span className="text-blue">liberar o resultado.</span></h2></div>
          <form className="grid gap-4 mt-8" onSubmit={submitLead} noValidate>
            <LeadField id="quiz-name" label="Nome" value={lead.name} error={leadErrors.name} onChange={(value) => updateLead("name", value)} autoComplete="name" />
            <LeadField id="quiz-phone" label="Celular" value={lead.phone} error={leadErrors.phone} onChange={(value) => updateLead("phone", value)} type="tel" autoComplete="tel" />
            <LeadField id="quiz-email" label="E-mail" value={lead.email} error={leadErrors.email} onChange={(value) => updateLead("email", value)} type="email" autoComplete="email" />
            <button className="btn btn--wide mt-2" disabled={submitting}>{submitting ? "Liberando…" : "Ver meu diagnóstico"}</button>
          </form>
          <button onClick={() => { setCurrent(questions.length - 1); setStage("quiz"); }} className="mt-6 mx-auto block font-mono text-[11px] uppercase text-muted">← Voltar</button>
        </div>}

        {stage === "result" && result && <ResultPage result={result} analysis={analysis} verdict={verdict} restart={restart} />}
      </div>
    </section>
  );
}

function Progress({ current, progress, label }: { current: number; progress: number; label: string }) {
  return <div className={styles.progress}><div className="flex items-center justify-between mb-2.5"><span className="font-mono text-[11px] tracking-[.14em] uppercase text-muted">{label}</span><span className="font-mono text-[11px] text-blue">{Math.max(progress, Math.round((current / questions.length) * 100))}%</span></div><div className="h-1.5 rounded-full bg-white/[.08] overflow-hidden"><div className="h-full rounded-full bg-blue transition-[width] duration-500" style={{ width: `${progress}%`, boxShadow: "0 0 12px var(--color-blue)" }} /></div></div>;
}

function LeadField({ id, label, value, error, onChange, type = "text", autoComplete }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void; type?: string; autoComplete: string }) {
  return <div className="grid gap-1.5"><label htmlFor={id} className="quiz-label">{label}</label><input id={id} type={type} autoComplete={autoComplete} className={`quiz-input ${error ? "is-invalid" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} />{error && <span className="quiz-error">{error}</span>}</div>;
}

function SalesButton({ children }: { children: string }) {
  return <a href={CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className={`btn btn--lg mt-7 ${styles.salesButton}`}>{children}</a>;
}

function ResultPage({ result, analysis, verdict, restart }: { result: QuizResult; analysis: string[]; verdict: string; restart: () => void }) {
  return <div className={`cta-reveal ${styles.resultPage}`}>
    <section className={styles.diagnosisCard}>
      <span className="limited">{result.kicker}</span><p className="font-mono text-[11px] uppercase tracking-[.14em] text-muted">Seu diagnóstico</p>
      <p className={styles.diagnosisOpening}>Jovem, o diagnóstico está pronto. Analisamos tuas respostas e acho que tu vai se identificar com várias coisas que temos pra te mostrar agora.</p>
      <h2 className="font-display font-black text-[clamp(27px,5vw,44px)] text-blue mt-2">{result.course}</h2><p className="font-display font-bold text-[19px] mt-4">{result.tagline}</p><p className="lead mt-4">{result.description}</p>
      <div className={styles.analysisBox}>
        <p className="font-mono text-[10px] uppercase tracking-[.12em] text-blue">Análise geral da tua oficina</p>
        <div className={styles.analysisFlow}>
          {analysis.map((section, sectionIndex) => <article className={styles.analysisStep} key={section}>
            <div className={styles.analysisMarker} aria-hidden="true"><span>{String(sectionIndex + 1).padStart(2, "0")}</span></div>
            <div>{section.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          </article>)}
        </div>
      </div>
      <p className={styles.verdict}>{verdict}</p>
    </section>

    <section className={styles.editorialSection}><span className="tag">Vida real de oficina</span><h2 className="section-title mt-5">Eu vejo donos de oficina <span className="text-blue">precificando errado</span> todos os dias.</h2><p className="lead">Fiz uma pesquisa com 100 donos de oficina e mais da metade, 50,5%, afirmou que não tem o cálculo de precificação na ponta da língua.</p><div className={styles.scenarioGrid}><article><b>Cenário 01</b><p>Cobrar abaixo do que a operação precisa para se manter saudável.</p></article><article><b>Cenário 02</b><p>Cobrar abaixo do que você merece trabalhando tanto.</p></article></div><h3>Existe uma diferença enorme entre <span>achar</span> que está cobrando certo e <strong>ter certeza.</strong></h3><p className="lead">Essa certeza não vem da experiência, da concorrência e muito menos do “acho que tá bom esse preço”. Ela vem dos números e do cálculo certo para cada operação.</p></section>

    <section className={styles.salesPanel}><span className="tag">Resultado comprovado</span><h2 className="section-title mt-5">A mesma quantidade de carros. <span className="text-blue">R$ 35 mil a mais.</span></h2><p className="lead">Olha esse dono de oficina que aplicou os valores corretos de hora técnica e markup nas peças: foram 33 carros em um mês e 33 no outro. A diferença foi o preço certo.</p><div className={styles.testimonials}><img src="/Depoimento01.png" alt="Depoimento de resultado com precificação correta" /><img src="/Depoimento02.png" alt="Continuação do depoimento de resultado" /></div><p className={styles.proofClosing}>Ele simplesmente parou de cobrar errado.</p><SalesButton>Eu também quero cobrar certo!</SalesButton></section>

    <section className={styles.editorialSection}><h2 className="section-title">Curso de <span className="text-blue">Precificação para Oficinas</span></h2><p className="lead">Um treinamento direto ao ponto, sem enrolação, que mostra como calcular:</p><ul className={styles.benefitGrid}><li>✓<span>O valor da tua hora técnica.</span></li><li>✓<span>O markup correto das peças.</span></li><li>✓<span>O custo real da tua operação.</span></li><li>✓<span>O preço que cada serviço realmente deveria ter.</span></li></ul><SalesButton>Eu quero cobrar certo!</SalesButton></section>

    <section className={styles.salesPanel}><span className="tag">Faz a conta comigo</span><p className="lead">Se tu estiver errando apenas R$ 20 em cada ordem de serviço e fizer 5 carros por dia durante 20 dias úteis...</p><div className={styles.calculation}><p>R$ 20 × 5 carros × 20 dias</p><span>=</span><b>R$ 2.000 <small>por mês</small></b></div><p className={styles.proofClosing}>Agora imagina isso durante um ano inteiro? Tu tá maluco!</p><SalesButton>Quero aprender como faz isso!</SalesButton></section>

    <section className={styles.editorialSection}><h2 className="section-title">O objetivo não é fazer tu cobrar mais. <span className="text-blue">É fazer tu cobrar certo.</span></h2><p className="lead">Quando tu cobra certo, trabalha com mais segurança, defende o orçamento com confiança e finalmente começa a ver o lucro aparecer no fim do mês.</p></section>

    <section className={`${styles.salesPanel} ${styles.offerPanel}`}><span className="limited">Condição especial</span><p className="lead">Eu poderia te cobrar R$ 497 porque sei que esse conhecimento vai fazer diferença na conta no final do mês. Mas quero que tu comece com o pé direito.</p><p className={styles.priceLabel}>Hoje, acesso por</p><div className={styles.offerPrice}>12x <small>de</small> R$ 20,25</div><div className={styles.offerItems}><p>✓ Treinamento de precificação</p><p>✓ Planilha de cálculo de hora técnica</p><p>✓ Tabela de markup para aplicar nas peças</p></div><h2>Bora calcular <span>CERTO</span> e receber o <span>JUSTO</span> pelo trabalho top que tu entrega!</h2><SalesButton>Quero aprender como cobrar certo!</SalesButton></section>

    <button onClick={restart} className="mx-auto font-mono text-[11px] uppercase tracking-[.1em] text-muted hover:text-offwhite">↻ Refazer diagnóstico</button>
  </div>;
}
