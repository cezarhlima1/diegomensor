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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof FormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/pesquisa-destrave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Não foi possível salvar a pesquisa.");
      window.location.href = DESTRAVE_WHATSAPP_GROUP_URL;
    } catch {
      setError("Não conseguimos enviar agora. Confira os campos e tente novamente.");
      setSubmitting(false);
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
              <strong className="text-blue">92% concluído</strong>
            </div>
            <div className="h-3 rounded-full bg-white/8 border border-line overflow-hidden" role="progressbar" aria-label="Progresso do cadastro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={92}>
              <div className="h-full w-[92%] rounded-full bg-[linear-gradient(90deg,var(--color-blue-deep),var(--color-blue-soft))] shadow-[0_0_20px_rgba(4,149,240,.7)]" />
            </div>
          </div>

          <span className="tag">Último passo</span>
          <h1 className="section-title mt-6 max-w-[18ch] mx-auto">
            🚨 Seu cadastro para a Imersão <span className="text-blue">DESTRAVE sua oficina</span> está quase concluído!
          </h1>
          <p className="lead mt-6 max-w-[650px] mx-auto">
            Falta só mais um passo para garantir que você receba todas as informações e tenha acesso ao evento.
          </p>
        </div>

        <div className="price-card mt-10 md:mt-12">
          <div className="pointer-glow" aria-hidden="true" />
          <div className="relative z-[1] grid gap-4 text-[15px] md:text-base text-muted leading-relaxed">
            <p>Antes de entrar no grupo exclusivo da imersão, queremos conhecer um pouco melhor a realidade da sua oficina.</p>
            <p>Essa pesquisa leva menos de 2 minutos e vai nos ajudar a adaptar o conteúdo da imersão para os desafios reais dos donos de oficina que estarão presentes, como você.</p>
            <p className="text-offwhite font-semibold">Nosso objetivo não é entregar teoria.</p>
            <p>É falar exatamente sobre os gargalos que estão impedindo sua oficina de crescer hoje.</p>
            <p className="text-blue font-bold">Quanto mais você responder com sinceridade, mais direcionado será o treinamento.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 grid gap-5">
          <div className="text-center mb-1">
            <span className="tag">Pesquisa rápida</span>
            <p className="font-display font-bold text-offwhite mt-4">Vão ser apenas 6 perguntas, é jogo rápido! 🫡</p>
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={1}>Seu WhatsApp</FieldTitle>
            <input required type="tel" inputMode="tel" autoComplete="tel" className="quiz-input" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={2}>Seu nome</FieldTitle>
            <input required type="text" autoComplete="name" className="quiz-input" placeholder="Digite seu nome completo" value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={3}>O que mais tira seu sono quando você pensa na oficina? Aquele PROBLEMA que mais incomoda.</FieldTitle>
            <Hint>Aquele problema que tu sabe que precisa resolver, não tá resolvendo por algum motivo e que tu sabe que, se resolver, vai mudar muita coisa dentro da tua oficina.</Hint>
            <textarea required className={textAreaClass} value={form.problemaPrincipal} onChange={(e) => update("problemaPrincipal", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={4}>Em qual área você sente que mais perde dinheiro hoje?</FieldTitle>
            <Hint>Pode escolher o principal, aquele que ganha o troféu de treta.</Hint>
            <div className="grid gap-2 mt-1">
              {areas.map((area) => (
                <label key={area} className="flex items-center gap-3 p-3.5 rounded-xl border border-line bg-white/[.025] cursor-pointer hover:border-blue/50 transition-colors">
                  <input required type="radio" name="areaPerda" value={area} checked={form.areaPerda === area} onChange={(e) => update("areaPerda", e.target.value)} className="accent-blue w-4 h-4" />
                  <span className="text-offwhite text-sm md:text-base">{area}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={5}>Você já tentou resolver esse (ou esses) problema que tem dentro da oficina? Como?</FieldTitle>
            <Hint>Não existe resposta certa. Conte o que você já fez para resolver esse problema ou o que ainda te impede de agir.</Hint>
            <textarea required className={textAreaClass} value={form.tentativaSolucao} onChange={(e) => update("tentativaSolucao", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={6}>Quando um cliente entra na oficina, qual é a maior dificuldade para fechar o serviço?</FieldTitle>
            <Hint>Pode ser atendimento, processo, tempo de reparo, diagnóstico, preço etc. Não tem resposta certa ou errada; é o que tu analisa que acontece aí dentro da oficina.</Hint>
            <textarea required className={textAreaClass} value={form.dificuldadeFechamento} onChange={(e) => update("dificuldadeFechamento", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={7}>Se o Diego pudesse solucionar os 3 principais problemas que tu estás tendo, quais seriam eles?</FieldTitle>
            <Hint>Pensa que tu vai ter 30 minutos com o Diego e ele vai te direcionar e trazer solução pra 3 problemas. O que tu perguntaria pra ele?</Hint>
            <textarea required className={textAreaClass} value={form.tresProblemas} onChange={(e) => update("tresProblemas", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={8}>Qual solução faria você terminar essa aula pensando: “Só isso já valeu a pena participar”?</FieldTitle>
            <Hint>Quando você sair da aula do dia 01/08, se tiver a informação que resolve AQUELE problema, já vai ter valido a pena. Qual é esse problema?</Hint>
            <textarea required className={textAreaClass} value={form.solucaoEsperada} onChange={(e) => update("solucaoEsperada", e.target.value)} />
          </div>

          <div className="price-card grid gap-3">
            <FieldTitle number={9}>Qual sua faixa de faturamento mensal?</FieldTitle>
            <div className="grid gap-2 mt-1">
              {faturamentos.map((faixa) => (
                <label key={faixa} className="flex items-center gap-3 p-3.5 rounded-xl border border-line bg-white/[.025] cursor-pointer hover:border-blue/50 transition-colors">
                  <input required type="radio" name="faturamento" value={faixa} checked={form.faturamento === faixa} onChange={(e) => update("faturamento", e.target.value)} className="accent-blue w-4 h-4" />
                  <span className="text-offwhite text-sm md:text-base">{faixa}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="price-card mt-3">
            <p className="font-display font-bold text-[clamp(18px,2.6vw,23px)] text-white leading-snug">
              Assim que finalizar a pesquisa, você será direcionado para o Grupo Oficial da Imersão DESTRAVE.
            </p>
            <p className="text-muted mt-5 mb-3">É por lá que vamos enviar:</p>
            <div className="grid gap-3 mb-7">
              {["Informações importantes sobre o evento", "Materiais de apoio", "Horários e orientações", "Avisos exclusivos", "Conteúdos de preparação para você chegar no sábado aproveitando o máximo da experiência."].map((item) => (
                <div key={item} className="flex items-start gap-3 text-offwhite">
                  <span className="price-feat-ck mt-0.5"><Check className="w-[13px] h-[13px]" /></span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {error && <p role="alert" className="mb-4 text-brand-red text-sm font-semibold text-center">{error}</p>}
            <button type="submit" className="btn btn--wide" disabled={submitting}>
              <WhatsApp className="w-[22px] h-[22px]" />
              {submitting ? "Enviando pesquisa…" : "Entrar no grupo exclusivo"}
            </button>
            <p className="reassure mt-4 text-center">
              <b>Importante:</b> sua participação no grupo é essencial para receber todas as informações da imersão. É por lá que faremos toda a comunicação até o dia do evento.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
