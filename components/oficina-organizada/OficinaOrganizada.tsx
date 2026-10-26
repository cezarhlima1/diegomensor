import type { ReactNode } from "react";
import Image from "next/image";
import WorkshopPhoto from "./WorkshopPhoto";
import styles from "./oficina-organizada.module.css";

// Substituir pelos dados confirmados da nova imersão antes de abrir as vendas.
const event = { date: "25 de novembro", time: "19h", price: "R$ [VALOR]", recording: "[DEFINIR]" };
const CHECKOUT_URL = "https://payfast.greenn.com.br/redirect/300783";

function Cta({ children }: { children: ReactNode }) {
  return <a className={styles.cta} href="#ingresso">{children}<span aria-hidden="true">↗</span></a>;
}
function Checks({ items }: { items: string[] }) {
  return <ul className={styles.checks}>{items.map(item => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul>;
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
  return <div className={styles.page} id="topo">
    <header className={styles.header}>
      <a href="#topo" className={styles.brand}>MENSOR<span>TREINAMENTOS</span></a>
      <a href="#ingresso" className={styles.headerLink}>IMERSÃO ONLINE E AO VIVO <span aria-hidden="true">↗</span></a>
    </header>

    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <Image className={styles.eventLogo} src="/logo-oficinaorganizada.png" alt="Operação: Oficina Organizada" width={2000} height={2000} sizes="180px" priority />
        <h1 className={styles.heroHeadline}>Em uma aula, aprenda como <em>organizar a rotina do pátio</em> e ter mais controle da tua oficina.</h1>
        <p className={styles.schedule}>{event.date} <span>•</span> {event.time} <span>•</span> AO VIVO</p>
        <Cta>QUERO PARTICIPAR DA IMERSÃO</Cta>
      </div>
      <div className={styles.heroWorkshop}>
        <WorkshopPhoto number={1} alt="Diego Mensor mostrando as ordens de serviço no quadro de programação da oficina" caption="O quadro que o Diego usa na própria oficina." priority sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1440px) 52vw, 680px" />
        <div className={styles.heroSignature}><span>DA OFICINA PARA A SUA OFICINA</span><strong>DIEGO MENSOR</strong></div>
      </div>
    </section>
    <div className={styles.strip} aria-hidden="true">ORGANIZE OS SERVIÇOS <span>↗</span> ACOMPANHE O PÁTIO <span>↗</span> FAÇA SUA OFICINA FLUIR</div>

    <section className={`${styles.section} ${styles.pain}`}>
      <div><p className={styles.eyebrow}>01 / O DIA A DIA</p><h2>SUA OFICINA<br />FUNCIONA <em>ASSIM?</em></h2></div>
      <div><Checks items={[
        "Você precisa saber onde está cada carro.",
        "A equipe pergunta o tempo todo o que precisa fazer.",
        "Tem serviço parado e você nem sempre sabe o motivo.",
        "Tudo precisa passar por você para andar.",
      ]} />
      <p className={styles.callout}><strong>Se você se identificou, o problema pode estar na forma como os serviços estão organizados.</strong></p>
      <Cta>QUERO ORGANIZAR MINHA OFICINA</Cta></div>
    </section>

    <section className={`${styles.section} ${styles.learning}`}>
      <p className={styles.eyebrow}>02 / DA ENTRADA À ENTREGA</p>
      <h2>DURANTE A IMERSÃO<br />VOCÊ VAI <em>APRENDER:</em></h2>
      <div className={styles.lessons}>{lessons.map(([title, text], i) => <article key={title}><span className={styles.number}>0{i + 1}</span><div><h3><span aria-hidden="true">✓ </span>{title}</h3><p>{text}</p></div></article>)}</div>
      <div className={styles.processPhotos}>
        <WorkshopPhoto number={2} alt="Diego conferindo uma ordem de serviço na prancheta dentro da oficina" caption="A organização começa nas informações de cada serviço." />
        <WorkshopPhoto number={3} alt="Diego explicando um fluxograma em frente ao quadro de programação" caption="Entenda o caminho do carro, da entrada até a entrega." />
      </div>
      <Cta>QUERO PARTICIPAR DA IMERSÃO</Cta>
    </section>

    <section className={`${styles.section} ${styles.clarity}`}>
      <p className={styles.eyebrow}>03 / CLAREZA PARA FAZER ANDAR</p>
      <h2>QUANDO OS SERVIÇOS ESTÃO<br />ORGANIZADOS, <em>VOCÊ SABE:</em></h2>
      <div className={styles.boardPhoto}><WorkshopPhoto number={6} alt="Quadro completo com etapas dos serviços e motivos de parada de produção" caption="Etapas, responsáveis e motivos de parada em um só lugar." sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) calc(100vw - 48px), 1160px" /></div>
      <div className={styles.answers}>{answers.map(([title, text], i) => <article key={title}><span aria-hidden="true">0{i + 1} ↗</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>

    <section className={`${styles.section} ${styles.practice}`}>
      <div className={styles.practicePhoto}><WorkshopPhoto number={4} alt="Diego apontando a coluna Em serviço no quadro de programação da oficina" caption="Diego mostrando como acompanhar os serviços na prática." /></div>
      <div><p className={styles.eyebrow}>04 / DENTRO DA OFICINA</p><h2>NÃO É TEORIA.<br />É O QUE <em>FUNCIONA</em> DENTRO DE UMA OFICINA DE VERDADE.</h2>
        <p>Diego vai mostrar o quadro que utiliza dentro da própria oficina para organizar os serviços e acompanhar o que acontece no pátio.</p>
        <p>Você vai ver <strong>como ele funciona na prática</strong> e como levar essa organização para a sua oficina.</p>
        <Cta>QUERO VER COMO FUNCIONA</Cta>
      </div>
    </section>

    <section className={`${styles.section} ${styles.audience}`}>
      <div><p className={styles.eyebrow}>05 / PARA QUEM É</p><h2>ESSA IMERSÃO<br />É PARA <em>VOCÊ QUE:</em></h2></div>
      <Checks items={[
        "Tem uma oficina pequena ou grande.",
        "Tem equipe, mas ainda precisa ficar em cima de tudo.",
        "Já usa sistema, mas ainda falta organização no dia a dia.",
        "Quer saber o que está acontecendo sem precisar perguntar toda hora.",
        "Quer fazer os serviços andarem com mais organização.",
      ]} />
    </section>

    <section className={`${styles.section} ${styles.teacher}`}>
      <div className={styles.teacherWorkshop}><WorkshopPhoto number={5} alt="Diego Mensor em frente ao quadro de programação da própria oficina" caption="Diego Mensor. Experiência de quem vive a rotina da oficina." /></div>
      <div><p className={styles.eyebrow}>06 / QUEM VAI TE ENSINAR</p><h2>DIEGO <em>MENSOR</em></h2>
        <p>Diego trabalha há mais de <strong>24 anos dentro de oficina</strong> e há <strong>14 anos é dono da própria operação.</strong></p>
        <p>Hoje, além de administrar sua oficina, ajuda outros donos de oficina a organizarem a gestão, os processos e a equipe.</p>
        <div className={styles.stats}><div><strong>24+</strong><span>ANOS DENTRO DE OFICINA</span></div><div><strong>14</strong><span>ANOS À FRENTE DA PRÓPRIA OPERAÇÃO</span></div></div>
      </div>
      <div className={styles.testimonials}>{[1, 2].map(n => <figure key={n}><img src={`/depoimentocaptura${n}.png`} alt={`Relato de participante de treinamento de Diego Mensor — ${n}`} loading="lazy" /><figcaption>Relato de participante dos treinamentos</figcaption></figure>)}</div>
    </section>

    <section className={`${styles.section} ${styles.newYear}`}>
      <p className={styles.eyebrow}>O PRÓXIMO ANO COMEÇA COM A DECISÃO DE AGORA.</p>
      <h2><em>2026</em> ESTÁ ACABANDO.</h2><h3>Você vai entrar em 2027 com a mesma bagunça dentro da sua oficina?</h3>
      <p>Ainda dá tempo de começar a organizar.</p><p>E o primeiro passo é entender <strong>como os serviços precisam funcionar da entrada até a entrega.</strong></p>
    </section>

    <section className={`${styles.section} ${styles.offer}`} id="ingresso">
      <div><p className={styles.eyebrow}>07 / O PRIMEIRO PASSO</p><h2>GARANTA<br />SEU <em>INGRESSO</em></h2></div>
      <div className={styles.ticket}><span className={styles.ticketLabel}>IMERSÃO ONLINE E AO VIVO</span><h3><span>OPERAÇÃO:</span> OFICINA ORGANIZADA</h3>
        <dl><div><dt>DATA</dt><dd>{event.date}</dd></div><div><dt>HORÁRIO</dt><dd>{event.time}</dd></div><div><dt>FORMATO</dt><dd>ONLINE E AO VIVO</dd></div></dl>
        <p className={styles.price}>{event.price}</p>
        <a className={styles.cta} href={CHECKOUT_URL}>QUERO GARANTIR MEU INGRESSO <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section className={`${styles.section} ${styles.faq}`}>
      <div><p className={styles.eyebrow}>08 / ANTES DE PARTICIPAR</p><h2>DÚVIDAS<em>?</em></h2></div>
      <div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
    </section>

    <section className={`${styles.section} ${styles.final}`}><p className={styles.eyebrow}>OPERAÇÃO: OFICINA ORGANIZADA</p><h2>COMECE 2027 COM UMA<br />OFICINA MAIS <em>ORGANIZADA.</em></h2><Cta>QUERO PARTICIPAR</Cta></section>
    <div className={styles.mobileAction}><a href="#ingresso" className={styles.cta}>QUERO PARTICIPAR <span aria-hidden="true">↗</span></a></div>
    <footer className={styles.footer}><a href="#topo" className={styles.brand}>MENSOR<span>TREINAMENTOS</span></a><p>MENSOR TREINAMENTOS LTDA<br />CNPJ: 66.021.375/0001-46<br />mensortreinamentos@gmail.com</p><small>© Mensor Treinamentos. Todos os direitos reservados.</small></footer>
  </div>;
}
