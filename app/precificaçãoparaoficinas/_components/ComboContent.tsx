import type { ReactNode } from "react";
import Author from "@/components/Author";
import { Check, WhatsApp } from "@/components/icons";
import { COMBO_CHECKOUT_URL, COMBO_WHATSAPP_URL } from "./config";
import { testimonials, situations, quickSteps, profiles, workflow, materials, faqs } from "./copy";
import styles from "./combo.module.css";

function Action({ children = "Quero resolver minha precificação", purchase = false }: { children?: ReactNode; purchase?: boolean }) {
  return (
    <div className={styles.action}>
      <a className={styles.button} href={purchase ? (COMBO_CHECKOUT_URL ?? COMBO_WHATSAPP_URL) : "#combo-offer"}>
        {children}
      </a>
    </div>
  );
}

const calculatorImages = [1, 2, 4, 5, 6, 7, 8, 9, 10, 11];
const gallery = [
  ...calculatorImages.map(n => ({ src: `/combo-precificacao/calculadora${n}.jpg`, alt: `Tela ${n} da Calculadora de Precificação` })),
  { src: "/previa-curso.jpg", alt: "Aulas do treinamento Precificação para Oficinas" },
  { src: "/previa-instrucoes.jpg", alt: "Instruções para usar a planilha" },
  { src: "/material-checklist.jpg", alt: "Checklist de implementação" },
  { src: "/material-apostila.jpg", alt: "Apostila Precificação para Oficinas" },
];

export default function ComboContent() {
  return (
    <>
      <section data-hero aria-labelledby="combo-hero" className={styles.hero}>
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap">
          <h1 id="combo-hero" className={styles.heroTitle}>Ajuste a precificação da tua oficina em <span className="text-blue">40 minutos</span> e tenha uma ferramenta que calcula cada novo orçamento pra ti.</h1>
          <p className={styles.intro}>Aprenda em <strong>40 minutos de aula</strong> como calcular corretamente a precificação da tua oficina e tenha uma ferramenta para aplicar esse padrão nos orçamentos dos teus clientes <strong>TODOS OS DIAS.</strong></p>
          <div className={styles.heroVisual}>
            <img src="/combo-precificacao/calculadora5.jpg" alt="Calculadora para montar o orçamento do cliente com hora técnica e peças" fetchPriority="high" loading="eager" className={styles.mainScreen} />
            <img src="/previa-curso.jpg" alt="Treinamento de precificação incluído no combo" className={styles.lessonScreen} />
          </div>
          <ul className={styles.benefits}>
            {["Calcule a hora técnica com os números da tua própria oficina", "Precifique as peças automaticamente com o teu markup", "Monte, envie e acompanhe todos os teus orçamentos em um só lugar"].map(text => <li key={text}><Check className={styles.check} /><span>{text}</span></li>)}
          </ul>
          <Action>QUERO RESOLVER MINHA PRECIFICAÇÃO</Action>
        </div>
      </section>

      <section aria-labelledby="depoimentos-title">
        <div className="wrap">
          <h2 id="depoimentos-title" className="section-title mx-auto max-w-[30ch] text-center">Na prática, fazer os orçamentos ficou <span className="text-blue">muito mais simples e sem margem de erro.</span></h2>
          <div className={styles.testimonials}>
            {testimonials.map(item => <article key={item.image} className={styles.testimonial}>
              <a href={`/combo-precificacao/${item.image}.jpg`} target="_blank" rel="noopener noreferrer" aria-label="Ampliar depoimento" className={styles.testimonialImage}><img src={`/combo-precificacao/${item.image}.jpg`} alt="Depoimento de aluno sobre os orçamentos feitos na calculadora" loading="lazy" /></a>
              <p>{item.text}</p>
            </article>)}
          </div>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-gallery">
        <div className="wrap">
          <h2 id="combo-gallery" className="section-title mx-auto max-w-[30ch] text-center">A calculadora, as aulas e os materiais <span className="text-blue">que você vai acessar.</span></h2>
          <div className={styles.gallery}>
            {gallery.map((item, index) => <a key={item.src} href={item.src} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar: ${item.alt}`} className={`${styles.galleryImage} ${index === 0 ? styles.galleryFeatured : ""}`}><img src={item.src} alt={item.alt} loading="lazy" /></a>)}
          </div>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-situations">
        <div className="wrap">
          <h2 id="combo-situations" className="section-title mx-auto max-w-[34ch] text-center">Se a precificação ainda não está 100% organizada na tua oficina, <span className="text-blue">provavelmente alguma dessas situações acontece por aí:</span></h2>
          <ul className={styles.situations}>{situations.map(text => <li key={text}>{text}</li>)}</ul>
          <p className={styles.closing}>Se você se identificou com isso, o problema não é só aprender a precificar. Falta ter essa precificação organizada e aplicada na rotina da oficina.</p>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-how">
        <div className="wrap">
          <h2 id="combo-how" className="section-title text-center">Como funciona <span className="text-blue">na prática:</span></h2>
          <ol className={styles.sequence}>{quickSteps.map((step, i) => <li key={step.title}><span className={styles.number} aria-hidden="true">0{i + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-profiles">
        <div className="wrap">
          <h2 id="combo-profiles" className="section-title mx-auto max-w-[30ch] text-center">A Calculadora de Precificação <span className="text-blue">é para quem:</span></h2>
          <ul className={styles.profiles}>{profiles.map(profile => <li key={profile.title}><h3>{profile.title}</h3><p>{profile.text}</p></li>)}</ul>
          <p className={styles.closing}>Não importa se é você ou outra pessoa da equipe que faz os orçamentos: a ideia é ter a precificação definida e uma ferramenta para aplicar a mesma base todos os dias.</p>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-workflow">
        <div className="wrap">
          <h2 id="combo-workflow" className="section-title mx-auto max-w-[30ch] text-center">Da aula ao orçamento: <span className="text-blue">olha como funciona na prática</span></h2>
          <ol className={styles.workflow}>{workflow.map((step, i) => <li key={step.title}><span className={styles.number} aria-hidden="true">0{i + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
          <p className={styles.closing}>Essa ferramenta foi criada e testada por quem entende de oficina e vive ela todos os dias, e podemos garantir: ela funciona na prática!</p>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-materials">
        <div className="wrap">
          <h2 id="combo-materials" className="section-title mx-auto max-w-[32ch] text-center">Tudo que você recebe para <span className="text-blue">ajustar e aplicar a precificação da tua oficina:</span></h2>
          <div className={styles.materials}>{materials.map(item => <article key={item.title}><div className={styles.materialImage}><img src={item.image} alt={item.title} loading="lazy" /></div><div className={styles.materialCopy}><h3>{item.title}</h3><p>{item.text}</p><p className={styles.advantage}><strong>Vantagem:</strong> {item.advantage}</p></div></article>)}</div>
          <p className={styles.closing}>Você não recebe só o conteúdo para aprender a precificar. Recebe também a ferramenta para aplicar essa precificação em cada orçamento durante os próximos 12 meses.</p>
          <Action />
        </div>
      </section>

      <section id="combo-offer" aria-labelledby="combo-price">
        <div className="wrap">
          <div className={styles.priceCard}>
            <h2 id="combo-price">Tudo isso no <span>combo completo:</span></h2>
            <ul className={styles.recap}>{materials.map(item => <li key={item.summary}><Check className={styles.check} /><span>{item.summary}</span></li>)}</ul>
            <div className={styles.anchorPrices}>
              <div><span>Calculadora de Precificação</span><b>R$ 497</b></div>
              <div><span>Treinamento Precificação para Oficinas</span><b>R$ 197</b></div>
              <div><span>Comprando separadamente:</span><s>R$ 694</s></div>
            </div>
            <p className={styles.priceLead}>No combo completo:</p>
            <div className={styles.price}>R$ 597</div>
            <p className={styles.saving}>R$ 97 a menos que comprando separadamente</p>
            <p>Você aprende a ajustar a precificação uma vez e fica com a ferramenta para aplicar nos orçamentos da tua oficina pelos próximos 12 meses.</p>
            <p className={styles.priceClosing}>Isso aqui é <strong>RESOLVER</strong> de uma vez por todas, aquilo que te <strong>TIRA dinheiro</strong> todos os meses.</p>
            <Action purchase>QUERO O COMBO COMPLETO</Action>
            {!COMBO_CHECKOUT_URL && <p className={styles.checkoutNote}>Fale com a equipe pelo WhatsApp para adquirir o combo.</p>}
          </div>
        </div>
      </section>

      <Author footer={<Action />} />

      <section aria-labelledby="combo-faq">
        <div className="wrap">
          <h2 id="combo-faq" className="section-title text-center">Dúvidas <span className="text-blue">frequentes</span></h2>
          <div className={styles.faq}>{faqs.map(item => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</div>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-whatsapp">
        <div className="wrap">
          <h2 id="combo-whatsapp" className="section-title text-center">Ainda ficou com alguma dúvida?</h2>
          <p className={styles.intro}>Fala com a nossa equipe no WhatsApp e pergunta o que precisar antes de entrar.</p>
          <div className={styles.action}><a href={COMBO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.button}><WhatsApp className={styles.check} />FALAR COM A EQUIPE NO WHATSAPP</a></div>
        </div>
      </section>
    </>
  );
}
