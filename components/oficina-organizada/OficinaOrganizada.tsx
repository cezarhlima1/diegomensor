import type { ReactNode } from "react";
import Image from "next/image";
import CtaButton from "@/components/Cta";
import Footer from "@/components/Footer";
import ClientEffects from "@/components/ClientEffects";
import { ArrowRight, Calendar, Check, Clock } from "@/components/icons";
import DestraveFaq from "@/components/destrave/DestraveFaq";
import DestraveInteractions from "@/components/destrave/DestraveInteractions";
import DestraveGiantWord from "@/components/destrave/DestraveGiantWord";
import WorkshopPhoto from "./WorkshopPhoto";
import styles from "./oficina-organizada.module.css";

// Substituir pelos dados confirmados da nova imersão antes de abrir as vendas.
const event = { date: "25 de novembro", time: "19h", price: "R$ [VALOR]", recording: "[DEFINIR]" };
const CHECKOUT_URL = "https://payfast.greenn.com.br/redirect/300783";

function Cta({ children }: { children: ReactNode }) {
  return <CtaButton variant="lg" href="#ingresso">{children}</CtaButton>;
}
function Checks({ items }: { items: string[] }) {
  return <ul className="grid gap-3 max-w-[560px] mx-auto text-left list-none">{items.map(item => <li key={item} data-dest-tilt className="reveal flex items-start gap-3 rounded-[14px] px-5 py-4 text-[15.5px] font-medium text-offwhite border border-line bg-card"><span className="check-ic"><Check className="w-[14px] h-[14px]" /></span>{item}</li>)}</ul>;
}
const lessons = [
  ["Como funciona o quadro de serviços", "Para visualizar tudo que está acontecendo na oficina."],
  ["O caminho do carro dentro da oficina", "Da entrada até a finalização do serviço."],
  ["O que cada pessoa da equipe precisa fazer", "Para cada um saber o seu papel durante o serviço."],
  ["Como colocar isso para funcionar na sua oficina", "Para sair da aula sabendo por onde começar."],
];
const answers = [
  ["ONDE O CARRO ESTÁ", "Em qual etapa está o serviço."],
  ["POR QUE ESTÁ PARADO", "O que está impedindo o serviço de andar."],
  ["O QUE VEM DEPOIS", "Qual é o próximo passo."],
  ["QUEM PRECISA FAZER", "Quem é o responsável por fazer o serviço avançar."],
];
const faqs = [
  ["Minha oficina é pequena. Serve para mim?", "Sim. O processo pode ser aplicado em oficinas pequenas ou grandes."],
  ["Já uso um sistema. Ainda serve?", "Sim. A aula não é sobre trocar seu sistema. É sobre organizar como os serviços funcionam dentro da oficina."],
  ["A aula é online?", "Sim. A imersão será online e ao vivo."],
  ["Vai ficar gravada?", event.recording],
  ["Quando será?", `${event.date}, às ${event.time}.`],
];

export default function OficinaOrganizada() {
  return <div className={`destrave-theme destrave-theme--lp1 ${styles.originalTheme}`}>
    <DestraveInteractions href="#ingresso" ctaLabel="Quero participar da imersão" />
    <section data-hero className="destrave-hero--with-cover relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-20 lg:pt-28 lg:pb-28 xl:pt-36 xl:pb-32">
      <div className="hero-bg" aria-hidden="true" />
      <DestraveGiantWord word="OFICINA" className="-left-6 -bottom-[6%] hidden md:block" />
      <div className="wrap grid grid-cols-1 items-center lg:min-h-[540px] xl:min-h-[640px] lg:flex lg:items-center">
        <div>
          <Image className={styles.originalLogo} src="/logo-oficinaorganizada.png" alt="Operação: Oficina Organizada" width={2000} height={2000} sizes="180px" priority />
          <span className="hero-badge reveal"><Calendar className="w-[13px] h-[13px]" />25 de novembro • 19h • Online e ao vivo</span>
          <h1 className="reveal d1 font-display font-black text-[clamp(36px,5vw,58px)] leading-[1.05] tracking-[-.03em] text-balance mt-7 mb-8 max-w-[24ch]">Em uma aula, aprenda como <span className="text-dest-accent">organizar a rotina do pátio</span> e ter mais controle da tua oficina.</h1>
          <div className="reveal d2 text-left mb-8 max-w-[34rem] border-t border-white/25 pt-5">
            <p className="lead mb-4">Da entrada até a entrega, entenda como fazer os serviços da sua oficina fluírem.</p>
          </div>
          <div className="reveal d3 flex flex-col items-start"><Cta>QUERO PARTICIPAR DA IMERSÃO</Cta></div>
        </div>
      </div>
    </section>
    <section className="destrave-ticker" aria-label="Imersão online e ao vivo, 25 de novembro, às 19h">
      <div className="destrave-ticker__track" aria-hidden="true">{[0,1].map(n => <div className="destrave-ticker__group" key={n}>{"OPERAÇÃO: OFICINA ORGANIZADA | ONLINE E AO VIVO | 25 DE NOVEMBRO • 19H | ".repeat(3)}</div>)}</div>
    </section>

    <section className="destrave-block2--lp1 py-[72px] md:py-24 lg:py-28 xl:py-32">
      <div className="wrap text-center max-w-[760px]">
        <h2 className="section-title reveal mx-auto">SUA OFICINA FUNCIONA <span className="text-dest-accent">ASSIM?</span></h2>
        <div className="mt-8"><Checks items={[
          "Você precisa saber onde está cada carro.",
          "A equipe pergunta o tempo todo o que precisa fazer.",
          "Tem serviço parado e você nem sempre sabe o motivo.",
          "Tudo precisa passar por você para andar.",
        ]} /></div>
        <p className="lead reveal mt-7 mb-8"><strong>Se você se identificou, o problema pode estar na forma como os serviços estão organizados.</strong></p>
        <Cta>QUERO ORGANIZAR MINHA OFICINA</Cta>
      </div>
    </section>

    <section className="py-[72px] md:py-24 lg:py-28 xl:py-32">
      <div className="wrap text-center max-w-[820px]">
        <h2 className="section-title reveal mx-auto">DURANTE A IMERSÃO VOCÊ VAI <span className="text-dest-accent">APRENDER:</span></h2>
        <div className="grid gap-4 mt-10 mb-8 text-left">{lessons.map(([title,text]) => <article className="testi reveal" key={title}><h3 className="font-display font-bold text-xl mb-2"><span className="text-dest-accent">✓ </span>{title}</h3><p className="text-muted">{text}</p></article>)}</div>
        <div className={styles.processPhotos}>
          <WorkshopPhoto number={2} alt="Diego conferindo uma ordem de serviço na oficina" caption="A organização começa nas informações de cada serviço." />
          <WorkshopPhoto number={3} alt="Diego explicando o fluxo dos serviços diante do quadro" caption="O caminho do carro, da entrada até a entrega." />
        </div>
        <Cta>QUERO PARTICIPAR DA IMERSÃO</Cta>
      </div>
    </section>

    <section className="destrave-block3--lp1 py-[72px] md:py-24 lg:py-28 xl:py-32">
      <div className="wrap text-center">
        <h2 className="section-title reveal mx-auto max-w-[26ch]">QUANDO OS SERVIÇOS ESTÃO ORGANIZADOS, VOCÊ SABE:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[820px] mx-auto mt-10 text-left">{answers.map(([title,text]) => <article className="testi reveal" key={title}><h3 className="font-display font-bold text-lg mb-2">{title}</h3><p className="text-muted">{text}</p></article>)}</div>
        <div className="max-w-[980px] mx-auto mt-10"><WorkshopPhoto number={6} alt="Quadro completo com etapas, responsáveis e motivos de parada" caption="Etapas, responsáveis e motivos de parada em um só lugar." sizes="(max-width: 1024px) 90vw, 980px" /></div>
      </div>
    </section>

    <section className="py-[72px] md:py-24 lg:py-28 xl:py-32">
      <div className="wrap text-center max-w-[980px]">
        <h2 className="section-title reveal mx-auto max-w-[26ch]">NÃO É TEORIA. É O QUE FUNCIONA DENTRO DE UMA OFICINA DE VERDADE.</h2>
        <p className="lead reveal mt-6 max-w-[760px] mx-auto">Diego vai mostrar o quadro que utiliza dentro da própria oficina para organizar os serviços e acompanhar o que acontece no pátio.</p>
        <div className={`${styles.processPhotos} mt-10`}>
          <WorkshopPhoto number={1} alt="Diego mostrando as ordens de serviço no quadro da oficina" caption="O quadro que o Diego usa na própria oficina." />
          <WorkshopPhoto number={4} alt="Diego apontando a etapa Em serviço no quadro" caption="Como acompanhar o andamento dos serviços na prática." />
        </div>
        <p className="lead reveal mb-8">Você vai ver <strong>como ele funciona na prática</strong> e como levar essa organização para a sua oficina.</p>
        <Cta>QUERO VER COMO FUNCIONA</Cta>
      </div>
    </section>

    <section className="destrave-block2--lp1 py-[72px] md:py-24 lg:py-28 xl:py-32">
      <div className="wrap text-center max-w-[760px]">
        <h2 className="section-title reveal mx-auto">ESSA IMERSÃO É PARA <span className="text-dest-accent">VOCÊ QUE:</span></h2>
        <div className="mt-8"><Checks items={[
          "Tem uma oficina pequena ou grande.",
          "Tem equipe, mas ainda precisa ficar em cima de tudo.",
          "Já usa sistema, mas ainda falta organização no dia a dia.",
          "Quer saber o que está acontecendo sem precisar perguntar toda hora.",
          "Quer fazer os serviços andarem com mais organização.",
        ]} /></div>
      </div>
    </section>

    <section className="py-[72px] md:py-24 lg:py-28 xl:py-32">
      <div className="wrap">
        <div className="author-card reveal grid grid-cols-1 xl:grid-cols-[.85fr_1.15fr]" data-dest-tilt>
          <div className="author-photo dest-photo relative min-h-[280px] lg:min-h-[360px] xl:min-h-[420px] border-b xl:border-b-0 xl:border-r border-white/20 overflow-hidden"><Image src="/diego.jpeg" alt="Diego Mensor" fill sizes="(max-width: 1024px) 90vw, 480px" className="object-cover object-top" /></div>
          <div className="self-center px-8 py-10 lg:px-11 lg:py-12 xl:px-[52px] xl:py-14">
            <span className="tag">Quem vai te ensinar</span><h3 className="font-display font-black text-[clamp(28px,3.4vw,38px)] mt-4 mb-4">DIEGO MENSOR</h3>
            <div className="grid gap-3 text-offwhite text-[clamp(15px,1.7vw,18px)] leading-[1.55] mb-6"><p>Diego trabalha há mais de <strong>24 anos dentro de oficina</strong> e há <strong>14 anos é dono da própria operação.</strong></p><p>Hoje, além de administrar sua oficina, ajuda outros donos de oficina a organizarem a gestão, os processos e a equipe.</p></div>
            <Cta>QUERO PARTICIPAR DA IMERSÃO</Cta>
          </div>
        </div>
        <div className="max-w-[820px] mx-auto mt-10"><WorkshopPhoto number={5} alt="Diego Mensor em frente ao quadro da própria oficina" caption="Experiência de quem vive a rotina da oficina." sizes="(max-width: 900px) 90vw, 820px" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[820px] mx-auto mt-10 items-start">{[1,2].map(n => <figure className="testi reveal !p-0 overflow-hidden" key={n}><img src={`/depoimentocaptura${n}.png`} alt={`Relato de participante dos treinamentos de Diego Mensor — ${n}`} loading="lazy" className="block w-full h-auto" /><figcaption className="px-4 py-3 text-xs text-muted">Relato de participante dos treinamentos</figcaption></figure>)}</div>
      </div>
    </section>

    <section className="py-[72px] md:py-24 text-center">
      <div className="wrap max-w-[820px]"><h2 className="section-title reveal mx-auto"><span className="text-dest-accent">2026</span> ESTÁ ACABANDO.</h2><p className="lead reveal mt-6 mb-6">Você vai entrar em 2027 com a mesma bagunça dentro da sua oficina?</p><p className="text-offwhite mb-4">Ainda dá tempo de começar a organizar.</p><p className="text-muted">E o primeiro passo é entender <strong>como os serviços precisam funcionar da entrada até a entrega.</strong></p></div>
    </section>

    <section className="destrave-offer-hero text-center" id="ingresso">
      <div className="destrave-offer-hero__inner reveal">
        <div className="destrave-offer-eyebrow">GARANTA SEU INGRESSO</div>
        <h2 className="destrave-offer-title"><span>OPERAÇÃO:</span><span>OFICINA ORGANIZADA</span></h2>
        <span className="destrave-live-badge"><span aria-hidden="true" />ONLINE E AO VIVO</span>
        <div className="destrave-event-info"><span><Calendar className="w-[18px] h-[18px]" />{event.date}</span><span><Clock className="w-[18px] h-[18px]" />{event.time}</span></div>
        <div className="destrave-offer-price"><strong>{event.price}</strong></div>
        <a className="destrave-offer-cta" href={CHECKOUT_URL}>QUERO GARANTIR MEU INGRESSO <ArrowRight className="w-5 h-5" /></a>
      </div>
    </section>
    <DestraveFaq items={faqs.map(([q,a]) => ({q,a}))} />
    <section className="py-[72px] md:py-24 text-center"><div className="wrap"><h2 className="section-title reveal mx-auto max-w-[26ch]">COMECE 2027 COM UMA OFICINA MAIS <span className="text-dest-accent">ORGANIZADA.</span></h2><p className="lead mt-6 mb-8">OPERAÇÃO: OFICINA ORGANIZADA</p><Cta>QUERO PARTICIPAR</Cta></div></section>
    <Footer />
    <ClientEffects />
  </div>;
}
