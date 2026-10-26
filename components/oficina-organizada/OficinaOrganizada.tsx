import type { ReactNode } from "react";
import Image from "next/image";
import Footer from "@/components/Footer";
import { ArrowRight, Calendar, Check, Clock } from "@/components/icons";
import DestraveFaq from "@/components/destrave/DestraveFaq";
import WorkshopPhoto from "./WorkshopPhoto";
import { LotCountdown, LotPricing, PageMotion } from "./Experience";
import testimonials from "./testimonials.json";
import styles from "./oficina-organizada.module.css";

const CHECKOUT_URL = "https://payfast.greenn.com.br/redirect/300783";
const heroCheckpoints = [
  "Aprender, na prática, como funciona o quadro de serviços.",
  "Entender o passo a passo que cada serviço deve seguir, da entrada até a finalização.",
  "Entender o papel da equipe em cada etapa do processo.",
  "Saber para que serve cada etapa e como aplicar esse fluxo dentro da sua oficina.",
];
const lessons = [
  ["Como funciona o quadro de serviços", "Para visualizar tudo que está acontecendo na oficina.", 4, "Diego mostrando a etapa Em serviço no quadro da oficina"],
  ["O caminho do carro dentro da oficina", "Da entrada até a finalização do serviço.", 3, "Diego explicando o fluxo dos serviços diante do quadro"],
  ["O que cada pessoa da equipe precisa fazer", "Para cada um saber o seu papel durante o serviço.", 6, "Quadro com as etapas e os responsáveis da equipe"],
  ["Como colocar isso para funcionar na sua oficina", "Para sair da aula sabendo por onde começar.", 2, "Diego conferindo uma ordem de serviço"],
] as const;
const faqs = [
  {q:"Minha oficina é pequena. Serve para mim?",a:"Sim. O processo pode ser aplicado em oficinas pequenas ou grandes."},
  {q:"Já uso um sistema. Ainda serve?",a:"Sim. A aula não é sobre trocar seu sistema. É sobre organizar como os serviços funcionam dentro da oficina."},
  {q:"A aula é online?",a:"Sim. A imersão será online e ao vivo."},
  {q:"Vai ficar gravada?",a:"[DEFINIR]"},
  {q:"Quando será?",a:"Quarta-feira, 25 de novembro de 2026, às 19h."},
];
function Cta({children,checkout = false}:{children:ReactNode;checkout?:boolean}) {
  return <a className={styles.cta} href={checkout ? CHECKOUT_URL : "#ingresso"}>{children}<ArrowRight aria-hidden="true" className={styles.ctaArrow} /></a>;
}
function CheckList({items}:{items:string[]}) {
  return <ul className={styles.checkList}>{items.map(text => <li key={text}><Check aria-hidden="true" /><span>{text}</span></li>)}</ul>;
}

export default function OficinaOrganizada() {
  const initialTime = Date.now();
  return <div data-oficina-page className={`destrave-theme ${styles.page}`}>
    <LotCountdown initialTime={initialTime} />
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <Image className={styles.smallLogo} src="/logooo.branca.png" alt="Operação: Oficina Organizada" width={1774} height={887} sizes="180px" priority />
        <div className={styles.eventDate}><span><Calendar aria-hidden="true" />25 de novembro</span><span><Clock aria-hidden="true" />19h</span></div>
        <p className={styles.eventFormat}>QUARTA-FEIRA • ONLINE E AO VIVO</p>
        <h1>Em uma aula, aprenda como <em>organizar a rotina do pátio</em> e ter mais controle da tua oficina.</h1>
      </div>
      <div className={styles.heroPhoto}><WorkshopPhoto number={1} alt="Diego Mensor mostrando o quadro de serviços dentro da própria oficina" priority sizes="(max-width: 767px) 100vw, 1000px" /></div>
      <div className={styles.heroBenefits}><h2>Durante a imersão você vai:</h2><CheckList items={heroCheckpoints} /><Cta>QUERO PARTICIPAR DA IMERSÃO</Cta></div>
    </section>

    <section className={`${styles.section} ${styles.problem}`}>
      <div className={styles.narrow}>
        <span className={styles.warningSymbol} role="img" aria-label="Alerta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m12 3 10 18H2L12 3Z" strokeLinejoin="round"/><path d="M12 9v5m0 3v.1" strokeLinecap="round"/></svg></span>
        <h2>SUA OFICINA FUNCIONA <em>ASSIM?</em></h2>
        <ul className={styles.problemList}>{[
          "Tem carro parado ocupando espaço e ninguém sabe exatamente o que está esperando.",
          "Os mecânicos precisam perguntar o tempo todo qual é o próximo serviço.",
          "Peça não chegou, cliente não aprovou ou orçamento não saiu e o carro simplesmente fica parado.",
          "Você promete prazo pro cliente sem saber se a oficina realmente consegue cumprir.",
          "Quando você não está na oficina, a equipe se perde nas prioridades e o serviço não anda do mesmo jeito.",
          "No final do dia, todo mundo trabalhou pra caramba… mas você não sabe onde o tempo foi perdido.",
        ].map(text=><li key={text}><span aria-hidden="true">×</span><strong>{text}</strong></li>)}</ul>
        <p className={styles.problemConclusion}>Se você se identificou, o problema pode estar na forma como os serviços estão organizados.</p>
        <Cta>QUERO ORGANIZAR MINHA OFICINA</Cta>
      </div>
    </section>

    <section className={`${styles.section} ${styles.learning}`}>
      <div className={styles.container}><h2>DURANTE A IMERSÃO VOCÊ VAI <em>APRENDER:</em></h2></div>
      <div className={styles.lessonGrid}>{lessons.map(([title,text,photo,alt],i)=><article className={styles.lesson} key={title} data-motion>
        <div className={styles.lessonTitle}><span aria-hidden="true">0{i+1}</span><h3>{title}</h3></div>
        {photo === 4 && <p className={styles.lessonRibbon}>Eu vou te mostrar 3 tipos de quadros para organizar!</p>}
        <WorkshopPhoto number={photo} alt={alt} focusBoard={photo===6} sizes="(max-width: 767px) 100vw, 550px" />
        <p className={styles.lessonDescription}><Check aria-hidden="true" />{text}</p>
      </article>)}</div>
      <div className={styles.action}><Cta>QUERO PARTICIPAR DA IMERSÃO</Cta></div>
    </section>

    <section className={`${styles.section} ${styles.socialProof}`}>
      <div className={styles.container}><h2>No último evento, os donos de oficina <em>falaram isso aqui:</em></h2></div>
      <div className={styles.testimonialWall}>{testimonials.map(t=><figure key={t.number} className={styles.testimonial} data-motion><Image src={`/oficina-organizada/depoimentoquadro${t.number}.webp`} alt={`Depoimento ${t.number} de participante do último evento de Diego Mensor`} width={t.width} height={t.height} sizes="(max-width: 767px) 90vw, 720px" /></figure>)}</div>
    </section>

    <section className={`${styles.section} ${styles.practice}`}>
      <div className={styles.container}>
        <p className={styles.attention}><span aria-hidden="true">🚨</span> ATENÇÃO</p>
        <h2>NÃO É TEORIA. É O QUE <em>FUNCIONA</em> DENTRO DE UMA <em>OFICINA</em> DE VERDADE.</h2>
        <p className={styles.practiceIntro}>Eu vou te mostrar exatamente como organizo os serviços dentro da minha oficina e apresentar outras formas de aplicar esse processo na sua. <strong>Você vai entender como adaptar o fluxo ao tamanho da sua equipe e à realidade da sua oficina.</strong></p>
      </div>
      <div className={styles.practicePhoto} data-motion><WorkshopPhoto number={6} alt="Quadro de programação da oficina, com foco nas etapas dos serviços" focusBoard sizes="(max-width: 767px) 100vw, 1000px" /></div>
      <div className={styles.narrow}><p className={styles.otherOptions}>E não, você não precisa ter exatamente esse quadro se não quiser. Eu vou te mostrar outras opções de organização!</p><Cta>QUERO VER COMO FUNCIONA</Cta></div>
    </section>

    <section className={`${styles.section} ${styles.audience}`}><div className={styles.narrow}>
      <h2>ESSA IMERSÃO É PARA <em>VOCÊ QUE:</em></h2>
      <CheckList items={["Tem uma oficina pequena ou grande, com 2 funcionários ou 10 ou mais.","Tem equipe, mas ainda precisa ficar em cima de tudo.","Já usa sistema, mas ainda falta organização no dia a dia.","Quer saber o que está acontecendo sem precisar perguntar toda hora.","Quer fazer os serviços andarem com mais organização."]} />
    </div></section>

    <section className={`${styles.section} ${styles.about}`}><div className={styles.author}>
      <div className={styles.authorPhoto}><WorkshopPhoto number={5} alt="Diego Mensor em frente ao quadro da própria oficina" sizes="(max-width: 767px) 100vw, 520px" /></div>
      <div className={styles.authorCopy}>
        <p className={styles.authorIntroduction}>Eu vou te ensinar. Sou <strong className={styles.authorName}>DIEGO <em>MENSOR</em></strong>, trabalho há mais de <strong>24 anos dentro de oficina</strong> e há <strong>14 anos sou dono dela.</strong></p>
        <p>Hoje, além de administrar 2 oficinas, ajudo outros donos de oficina a organizarem a gestão, os processos e a equipe.</p>
        <p>Assim como você, já vivi uma oficina onde tudo dependia de mim e sim eu estava sobrecarregado. Foi organizando a gestão e ajustando os processos na prática que as coisas mudaram completamente.</p>
        <Cta>QUERO PARTICIPAR DA IMERSÃO</Cta>
      </div>
    </div></section>

    <section className={`${styles.section} ${styles.year}`}><div className={styles.container}>
      <h2><em>2026</em> ESTÁ <span className={styles.endingAccent}>ACABANDO.</span></h2>
      <p className={styles.yearQuestion}>Você vai entrar em 2027 com a mesma bagunça dentro da sua oficina?</p>
      <p>Ainda dá tempo de começar a organizar.</p><p>E o primeiro passo é entender <strong>como os serviços precisam funcionar da entrada até a entrega.</strong></p>
    </div></section>

    <section className={`${styles.section} ${styles.offer}`} id="ingresso"><div className={styles.offerInner}>
      <p className={styles.eyebrow}>GARANTA SEU INGRESSO</p>
      <Image className={styles.offerLogo} src="/logo-oficinaorganizada.png" alt="Operação: Oficina Organizada" width={2000} height={2000} sizes="340px" />
      <div className={styles.offerDate}><Calendar aria-hidden="true" /><div><strong>25 de novembro • 19h</strong><span>QUARTA-FEIRA • ONLINE E AO VIVO</span></div></div>
      <LotPricing initialTime={initialTime} />
      <LotCountdown variant="offer" initialTime={initialTime} />
      <CheckList items={["Acesso ao treinamento","Material de apoio","Bônus para quem estiver até o final"]} />
      <Cta checkout>QUERO GARANTIR MEU INGRESSO</Cta>
    </div></section>
    <div className={styles.faq}><DestraveFaq items={faqs} /></div>
    <section className={`${styles.section} ${styles.final}`}><div className={styles.container}><p className={styles.eyebrow}>OPERAÇÃO: OFICINA ORGANIZADA</p><h2>COMECE 2027 COM UMA OFICINA MAIS <em>ORGANIZADA.</em></h2><Cta>QUERO PARTICIPAR</Cta></div></section>
    <Footer /><PageMotion />
  </div>;
}
