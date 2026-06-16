"use client";

import { useEffect, useState } from "react";
import { Check } from "@/components/icons";
import { WHATSAPP_GROUP_URL } from "@/lib/links";

type Lead = { name: string; email: string; phone: string };
type LeadErrors = Partial<Record<keyof Lead, string>>;

const emptyLead: Lead = { name: "", email: "", phone: "" };

/* São Paulo é UTC-3 o ano inteiro (sem horário de verão desde 2019). */
const SP_OFFSET_MIN = -3 * 60;

/** Próximo domingo, 19h no horário de Brasília, como instante UTC (ms). */
function nextSundayAt19(now: number): number {
  // "Relógio de parede" de São Paulo, lido via getUTC*.
  const sp = new Date(now + SP_OFFSET_MIN * 60_000);
  const daysUntilSunday = (7 - sp.getUTCDay()) % 7;
  const targetWall = Date.UTC(
    sp.getUTCFullYear(),
    sp.getUTCMonth(),
    sp.getUTCDate() + daysUntilSunday,
    19,
    0,
    0,
  );
  // Converte o relógio de SP de volta pro instante UTC real.
  let target = targetWall - SP_OFFSET_MIN * 60_000;
  if (target <= now) target += 7 * 24 * 60 * 60 * 1000;
  return target;
}

function useCountdown() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setRemaining(Math.max(0, nextSundayAt19(now) - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (remaining === null) return null;
  const totalSec = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Countdown() {
  const cd = useCountdown();
  const units: [string, string][] = [
    ["Dias", cd ? pad(cd.days) : "--"],
    ["Horas", cd ? pad(cd.hours) : "--"],
    ["Min", cd ? pad(cd.minutes) : "--"],
    ["Seg", cd ? pad(cd.seconds) : "--"],
  ];

  return (
    <div>
      <p className="font-mono text-[11px] tracking-[.16em] uppercase text-muted mb-3">
        A aula ao vivo começa em
      </p>
      <div className="flex gap-2.5">
        {units.map(([label, value]) => (
          <div
            key={label}
            className="flex-1 rounded-[14px] py-3 text-center border border-line"
            style={{ background: "linear-gradient(165deg,#122230,#0e151c)" }}
          >
            <div className="font-mono font-bold text-[clamp(24px,5vw,32px)] leading-none text-white tabular-nums">
              {value}
            </div>
            <div className="font-mono text-[10px] tracking-[.14em] uppercase text-muted-dim mt-1.5">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function validateLead(data: Lead): LeadErrors {
  const errors: LeadErrors = {};
  if (data.name.trim().length < 3) errors.name = "Digite seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
    errors.email = "Digite um e-mail válido.";
  if (data.phone.replace(/\D/g, "").length < 10)
    errors.phone = "Digite um telefone com DDD.";
  return errors;
}

function LeadForm() {
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof Lead, value: string) {
    setLead((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateLead(lead);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch {
      // se o registro falhar, não bloqueia a pessoa de entrar no grupo
    } finally {
      window.location.href = WHATSAPP_GROUP_URL;
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      <div className="grid gap-1.5">
        <label htmlFor="cad-name" className="quiz-label">
          Nome completo
        </label>
        <input
          id="cad-name"
          type="text"
          autoComplete="name"
          className={`quiz-input ${errors.name ? "is-invalid" : ""}`}
          placeholder="Seu nome completo"
          value={lead.name}
          onChange={(e) => update("name", e.target.value)}
        />
        {errors.name && <span className="quiz-error">{errors.name}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="cad-email" className="quiz-label">
          E-mail
        </label>
        <input
          id="cad-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={`quiz-input ${errors.email ? "is-invalid" : ""}`}
          placeholder="voce@email.com"
          value={lead.email}
          onChange={(e) => update("email", e.target.value)}
        />
        {errors.email && <span className="quiz-error">{errors.email}</span>}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="cad-phone" className="quiz-label">
          Telefone (com DDD)
        </label>
        <input
          id="cad-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          className={`quiz-input ${errors.phone ? "is-invalid" : ""}`}
          placeholder="(00) 00000-0000"
          value={lead.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        {errors.phone && <span className="quiz-error">{errors.phone}</span>}
      </div>

      <button type="submit" className="btn btn--wide mt-2" disabled={submitting}>
        {submitting ? "Entrando…" : "Quero participar"}
      </button>

      <p className="reassure text-center">
        <b>Grátis</b> · sem spam · é só pra avisar dos encontros
      </p>
    </form>
  );
}

const benefits = [
  "Veja o que acontece quando você tem acesso aos bastidores de tudo que rola no gerenciamento de uma oficina.",
  "Conteúdo gratuito com foco em coisas realmente aplicáveis, que vão fazer diferença no dia a dia da oficina.",
  "As aulas trazem crescimento de mentalidade — e a gente sabe o quanto isso precisa ser trabalhado pra acessar um novo nível de faturamento.",
  "O que eu entrego de graça, tem curso cobrando caro e nem chegando perto. Eu te mostro o que ninguém mais mostra: a VIDA REAL da oficina.",
];

export default function Cadastro() {
  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="relative pt-28 pb-16 md:pt-32 md:pb-20">
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-12 lg:gap-14 items-center">
          {/* coluna esquerda: pitch + countdown */}
          <div className="cta-reveal">
            <span className="hero-badge">
              <span className="dot" /> Aulas ao vivo · Grátis
            </span>

            <h1 className="section-title mt-6">
              Bastidor da oficina de <span className="text-blue">alta performance</span>
            </h1>

            <p className="lead mt-5 max-w-[520px]">
              É isso que eu vivi e é isso que eu ensino{" "}
              <b className="text-offwhite font-bold">TODO DOMINGO</b>. Toda
              semana, uma aula foda sobre gestão para oficina{" "}
              <span className="text-blue">da vida real.</span>
            </p>

            <div className="flex items-center gap-3 mt-6">
              <img
                src="/diego.jpeg"
                alt="Diego Mensor"
                className="w-11 h-11 rounded-full object-cover object-top border border-blue/40"
              />
              <div className="leading-tight">
                <div className="font-display font-bold text-white text-[15px]">
                  com Diego Mensor
                </div>
                <div className="font-mono text-blue text-[12px] tracking-[.04em]">
                  @diegomensor
                </div>
              </div>
            </div>

            <div className="mt-8 max-w-[420px]">
              <Countdown />
            </div>

            <p className="reassure mt-6">
              Aulas ao vivo, gratuitas, <b>todo domingo, às 19h.</b>
            </p>

            <a href="#inscricao" className="btn btn--lg mt-7 lg:hidden">
              Participar dos encontros
            </a>
          </div>

          {/* coluna direita: formulário */}
          <div id="inscricao" className="cta-reveal scroll-mt-28">
            <div className="price-card">
              <div className="pointer-glow" aria-hidden="true" />
              <span className="tag">Inscrição</span>
              <h2 className="font-display font-extrabold text-[clamp(21px,3vw,28px)] leading-[1.1] tracking-[-.02em] mt-5 mb-2">
                Participe dos próximos{" "}
                <span className="text-blue">encontros</span>
              </h2>
              <p className="lead text-[15px] mb-6">
                Preencha seus dados e entre no grupo onde a gente avisa cada
                aula.
              </p>
              <LeadForm />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- BENEFÍCIOS ---------- */}
      <section className="py-16 md:py-20">
        <div className="wrap max-w-[820px]">
          <span className="tag">Por que entrar</span>
          <h2 className="section-title mt-5 mb-9">
            O que rola nos <span className="text-blue">encontros</span>
          </h2>

          <ul className="grid gap-4">
            {benefits.map((text, i) => (
              <li
                key={i}
                className="flex items-start gap-4 rounded-[16px] p-5 border border-line"
                style={{ background: "linear-gradient(165deg,var(--color-card),#0e151c)" }}
              >
                <span className="check-ic">
                  <Check className="w-[15px] h-[15px]" />
                </span>
                <span className="text-offwhite text-[clamp(15px,1.7vw,17px)] leading-relaxed">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="pb-24">
        <div className="wrap max-w-[680px] text-center">
          <div className="final-card">
            <span className="tag">Próximo domingo, 19h</span>
            <h2 className="section-title mt-5 mb-3">
              Participe dos próximos encontros
            </h2>
            <p className="lead mb-8 max-w-[480px] mx-auto">
              Vaga garantida no grupo é vaga garantida nas aulas. Bora pra cima.
            </p>
            <a href="#inscricao" className="btn btn--lg">
              Quero participar
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
