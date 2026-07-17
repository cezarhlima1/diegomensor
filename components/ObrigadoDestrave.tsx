"use client";

import { useState } from "react";
import { Check, WhatsApp } from "./icons";
import { DESTRAVE_WHATSAPP_GROUP_URL } from "@/lib/links";

type FormData = {
  phone: string;
  name: string;
  problemaPrincipal: string;
  areaPerda: string;
  tentativaSolucao: string;
  dificuldadeFechamento: string;
  tresProblemas: string;
  solucaoEsperada: string;
  faturamento: string;
};

const initialForm: FormData = {
  phone: "",
  name: "",
  problemaPrincipal: "",
  areaPerda: "",
  tentativaSolucao: "",
  dificuldadeFechamento: "",
  tresProblemas: "",
  solucaoEsperada: "",
  faturamento: "",
};

const areas = [
  "Gestão dos processos da oficina",
  "Comercial desorganizado",
  "Financeiro e precificação",
  "Equipe e liderança",
];

const faturamentos = ["Até R$10 mil", "R$10–30 mil", "R$30–80 mil", "R$80–150 mil", "Mais de R$150 mil"];

function FieldTitle({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 grid place-items-center w-8 h-8 rounded-lg bg-blue/15 border border-blue/40 text-blue font-mono font-bold text-sm">
        {number}
      </span>
      <h2 className="font-display font-bold text-[17px] md:text-[19px] leading-snug text-white pt-0.5">
        {children}
      </h2>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-muted text-sm leading-relaxed mt-2 ml-11">{children}</p>;
}

export default function ObrigadoDestrave() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [groupAccessed, setGroupAccessed] = useState(false);
  const [validationError, setValidationError] = useState("");

  const registrationProgress = groupAccessed
    ? 100
    : surveyCompleted
      ? 99
      : 92 + Math.round(((currentQuestion - 1) / 8) * 6);

  function update(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError("");
  }

  function currentAnswerIsValid() {
    const fieldByQuestion: Record<number, keyof FormData> = {
      1: "phone",
      2: "name",
      3: "problemaPrincipal",
      4: "areaPerda",
      5: "tentativaSolucao",
      6: "dificuldadeFechamento",
      7: "tresProblemas",
      8: "solucaoEsperada",
      9: "faturamento",
    };
    const value = form[fieldByQuestion[currentQuestion]].trim();
    if (currentQuestion === 1) return value.replace(/\D/g, "").length >= 10;
    if (currentQuestion === 2) return value.length >= 3;
    return value.length > 0;
  }

  function nextQuestion() {
    if (!currentAnswerIsValid()) {
      setValidationError("Responda esta pergunta para continuar.");
      return;
    }
    setCurrentQuestion((question) => Math.min(9, question + 1));
    const pesquisa = document.querySelector("#pesquisa-destrave");
    if (pesquisa) {
      window.scrollTo({
        top: pesquisa.getBoundingClientRect().top + window.scrollY - 100,
        behavior: "smooth",
      });
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentQuestion < 9) {
      nextQuestion();
      return;
    }
    if (!currentAnswerIsValid()) {
      setValidationError("Escolha uma opção para concluir.");
      return;
    }
    setSubmitting(true);

    try {
      await fetch("/api/pesquisa-destrave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch {
      // A planilha não pode impedir o participante de entrar no grupo.
    } finally {
      setSubmitting(false);
      setSurveyCompleted(true);
      requestAnimationFrame(() => {
        document.querySelector("#grupo-destrave")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  const textAreaClass = "quiz-input min-h-[132px] resize-y leading-relaxed";

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap max-w-[820px]">
        <div className="cta-reveal text-center">
          <div className="max-w-[620px] mx-auto mb-8">
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[.12em] mb-2">
              <span className="text-muted">Cadastro</span>
              <strong className={registrationProgress === 100 ? "text-brand-green" : "text-blue"}>
                {registrationProgress}% concluído
              </strong>
            </div>
            <div className="h-3 rounded-full bg-white/8 border border-line overflow-hidden" role="progressbar" aria-label="Progresso do cadastro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={registrationProgress}>
              <div
                className={`h-full rounded-full transition-[width,background] duration-500 ${registrationProgress === 100 ? "bg-brand-green shadow-[0_0_20px_rgba(47,210,122,.7)]" : "bg-[linear-gradient(90deg,var(--color-blue-deep),var(--color-blue-soft))] shadow-[0_0_20px_rgba(4,149,240,.7)]"}`}
                style={{ width: `${registrationProgress}%` }}
              />
            </div>
          </div>

          <span className="tag tag--red">Último passo para concluir sua inscrição</span>
          <h1 className="font-display font-black mt-7 mx-auto max-w-[760px] leading-[1.02] tracking-[-.035em]">
            <span className="block text-[clamp(28px,5vw,48px)]">🚨 Seu cadastro para a</span>
            <span className="block text-blue text-[clamp(36px,6.5vw,66px)] my-2">
              Imersão DESTRAVE sua oficina
            </span>
            <span className="block text-[clamp(28px,5vw,48px)]">está quase concluído!</span>
          </h1>
          <p className="lead mt-7 max-w-[610px] mx-auto text-[clamp(17px,2vw,20px)]">
            Falta só mais um passo para garantir que você receba todas as informações e tenha acesso ao evento.
          </p>
        </div>

        <div className="mt-11 md:mt-14 max-w-[690px] mx-auto text-center">
          <div className="w-16 h-px bg-blue/60 mx-auto mb-8 shadow-[0_0_14px_rgba(4,149,240,.8)]" />
          <div className="grid gap-4 text-[15px] md:text-[17px] text-muted leading-relaxed">
            <p>Antes de entrar no grupo exclusivo da imersão, queremos conhecer um pouco melhor a realidade da sua oficina.</p>
            <p>Essa pesquisa leva menos de 2 minutos e vai nos ajudar a adaptar o conteúdo da imersão para os desafios reais dos donos de oficina que estarão presentes, como você.</p>
            <p className="text-offwhite font-display font-bold text-lg">Nosso objetivo não é entregar teoria.</p>
            <p>É falar exatamente sobre os gargalos que estão impedindo sua oficina de crescer hoje.</p>
            <p className="text-blue font-display font-bold text-lg">Quanto mais você responder com sinceridade, mais direcionado será o treinamento.</p>
          </div>
        </div>

        {!surveyCompleted && <form id="pesquisa-destrave" onSubmit={onSubmit} className="mt-8">
          <div className="text-center mb-1">
            <span className="tag">Pesquisa rápida</span>
            <p className="font-display font-bold text-offwhite mt-4">Vão ser apenas 9 perguntas, é jogo rápido! 🫡</p>
            <div className="max-w-[420px] mx-auto mt-5">
              <div className="flex justify-between font-mono text-[11px] uppercase tracking-[.1em] text-muted mb-2">
                <span>Pergunta {currentQuestion} de 9</span>
                <span>{Math.round((currentQuestion / 9) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 border border-line overflow-hidden">
                <div className="h-full rounded-full bg-blue transition-[width] duration-300" style={{ width: `${(currentQuestion / 9) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="price-card grid gap-4 mt-6">
          {currentQuestion === 1 && <>
            <FieldTitle number={1}>Seu WhatsApp</FieldTitle>
            <input autoFocus type="tel" inputMode="tel" autoComplete="tel" className="quiz-input" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </>}

          {currentQuestion === 2 && <>
            <FieldTitle number={2}>Seu nome</FieldTitle>
            <input autoFocus type="text" autoComplete="name" className="quiz-input" placeholder="Digite seu nome completo" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </>}

          {currentQuestion === 3 && <>
            <FieldTitle number={3}>O que mais tira seu sono quando você pensa na oficina? Aquele PROBLEMA que mais incomoda.</FieldTitle>
            <Hint>Aquele problema que tu sabe que precisa resolver, não tá resolvendo por algum motivo e que tu sabe que, se resolver, vai mudar muita coisa dentro da tua oficina.</Hint>
            <textarea autoFocus className={textAreaClass} value={form.problemaPrincipal} onChange={(e) => update("problemaPrincipal", e.target.value)} />
          </>}

          {currentQuestion === 4 && <>
            <FieldTitle number={4}>Em qual área você sente que mais perde dinheiro hoje?</FieldTitle>
            <Hint>Pode escolher o principal, aquele que ganha o troféu de treta.</Hint>
            <div className="grid gap-2 mt-1">
              {areas.map((area) => (
                <label key={area} className="flex items-center gap-3 p-3.5 rounded-xl border border-line bg-white/[.025] cursor-pointer hover:border-blue/50 transition-colors">
                  <input type="radio" name="areaPerda" value={area} checked={form.areaPerda === area} onChange={(e) => update("areaPerda", e.target.value)} className="accent-blue w-4 h-4" />
                  <span className="text-offwhite text-sm md:text-base">{area}</span>
                </label>
              ))}
            </div>
          </>}

          {currentQuestion === 5 && <>
            <FieldTitle number={5}>Você já tentou resolver esse (ou esses) problema que tem dentro da oficina? Como?</FieldTitle>
            <Hint>Não existe resposta certa. Conte o que você já fez para resolver esse problema ou o que ainda te impede de agir.</Hint>
            <textarea autoFocus className={textAreaClass} value={form.tentativaSolucao} onChange={(e) => update("tentativaSolucao", e.target.value)} />
          </>}

          {currentQuestion === 6 && <>
            <FieldTitle number={6}>Quando um cliente entra na oficina, qual é a maior dificuldade para fechar o serviço?</FieldTitle>
            <Hint>Pode ser atendimento, processo, tempo de reparo, diagnóstico, preço etc. Não tem resposta certa ou errada; é o que tu analisa que acontece aí dentro da oficina.</Hint>
            <textarea autoFocus className={textAreaClass} value={form.dificuldadeFechamento} onChange={(e) => update("dificuldadeFechamento", e.target.value)} />
          </>}

          {currentQuestion === 7 && <>
            <FieldTitle number={7}>Se o Diego pudesse solucionar os 3 principais problemas que tu estás tendo, quais seriam eles?</FieldTitle>
            <Hint>Pensa que tu vai ter 30 minutos com o Diego e ele vai te direcionar e trazer solução pra 3 problemas. O que tu perguntaria pra ele?</Hint>
            <textarea autoFocus className={textAreaClass} value={form.tresProblemas} onChange={(e) => update("tresProblemas", e.target.value)} />
          </>}

          {currentQuestion === 8 && <>
            <FieldTitle number={8}>Qual solução faria você terminar essa aula pensando: “Só isso já valeu a pena participar”?</FieldTitle>
            <Hint>Quando você sair da aula do dia 01/08, se tiver a informação que resolve AQUELE problema, já vai ter valido a pena. Qual é esse problema?</Hint>
            <textarea autoFocus className={textAreaClass} value={form.solucaoEsperada} onChange={(e) => update("solucaoEsperada", e.target.value)} />
          </>}

          {currentQuestion === 9 && <>
            <FieldTitle number={9}>Qual sua faixa de faturamento mensal?</FieldTitle>
            <div className="grid gap-2 mt-1">
              {faturamentos.map((faixa) => (
                <label key={faixa} className="flex items-center gap-3 p-3.5 rounded-xl border border-line bg-white/[.025] cursor-pointer hover:border-blue/50 transition-colors">
                  <input type="radio" name="faturamento" value={faixa} checked={form.faturamento === faixa} onChange={(e) => update("faturamento", e.target.value)} className="accent-blue w-4 h-4" />
                  <span className="text-offwhite text-sm md:text-base">{faixa}</span>
                </label>
              ))}
            </div>
          </>}

            {validationError && <p role="alert" className="text-brand-red text-sm font-semibold text-center">{validationError}</p>}
            {currentQuestion < 9 ? (
              <div className="flex gap-3 mt-2">
                {currentQuestion > 1 && <button type="button" className="btn btn--ghost" onClick={() => { setCurrentQuestion((question) => question - 1); setValidationError(""); }}>Voltar</button>}
                <button type="button" className="btn flex-1" onClick={nextQuestion}>Próxima pergunta</button>
              </div>
            ) : (
            <button type="submit" className="btn btn--wide" disabled={submitting}>
              {submitting ? "Enviando respostas…" : "Enviar respostas"}
            </button>
            )}
          </div>
        </form>}

        {surveyCompleted && (
          <div id="grupo-destrave" className="price-card mt-10 cta-reveal text-center !px-5 md:!px-10 !py-10 md:!py-12">
            <div className="pointer-glow" aria-hidden="true" />
            <div className="relative z-[1]">
              <span
                className="grid place-items-center w-16 h-16 rounded-[20px] text-brand-green bg-brand-green/10 border border-brand-green/40 mx-auto shadow-[0_0_32px_-8px_rgba(47,210,122,.7)]"
              >
                <Check className="w-8 h-8" />
              </span>

              <div className="mt-6">
                <span className="inline-block font-mono font-bold text-xs uppercase tracking-[.16em] text-brand-green">
                  Pesquisa concluída
                </span>
                <h2 className="font-display font-black text-[clamp(28px,5vw,46px)] leading-tight text-white mt-2">
                  Agora entre no <span className="text-blue">grupo oficial.</span>
                </h2>
              </div>

              <div className="w-16 h-px bg-blue/60 mx-auto my-7 shadow-[0_0_14px_rgba(4,149,240,.8)]" />

              <p className="text-muted mb-4">É por lá que vamos enviar:</p>
              <div className="grid sm:grid-cols-2 gap-3 mb-8 text-left max-w-[650px] mx-auto">
                {["Informações importantes sobre o evento", "Materiais de apoio", "Horários e orientações", "Avisos exclusivos", "Conteúdos de preparação para você chegar no sábado aproveitando o máximo da experiência."].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 text-offwhite bg-white/[.035] border border-line rounded-xl p-3.5 last:sm:col-span-2"
                  >
                    <span className="price-feat-ck mt-0.5"><Check className="w-[13px] h-[13px]" /></span>
                    <span className="text-sm md:text-[15px] leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>

              <a href={DESTRAVE_WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer" className="btn btn--wide max-w-[560px] mx-auto" onClick={() => setGroupAccessed(true)}>
                <WhatsApp className="w-[22px] h-[22px]" />
                Entrar no grupo exclusivo
              </a>
              <p className="reassure mt-5 text-center max-w-[610px] mx-auto leading-relaxed">
                <b>Importante:</b> sua participação no grupo é essencial para receber todas as informações da imersão. É por lá que faremos toda a comunicação até o dia do evento.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
