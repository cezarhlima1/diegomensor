import type { ReactNode } from "react";
import Author from "@/components/Author";
import { Check, WhatsApp } from "@/components/icons";
import { COMBO_CHECKOUT_URL, COMBO_WHATSAPP_URL } from "./config";
import { testimonials, situations, quickSteps, profiles, materials, faqs } from "./copy";
import styles from "./combo.module.css";
import CalculatorShowcase from "./CalculatorShowcase";
import ProfileIllustration from "./ProfileIllustration";

function Action({ children = "Quero resolver minha precificação", purchase = false }: { children?: ReactNode; purchase?: boolean }) {
  return (
    <div className={styles.action}>
      <a className={styles.button} href={purchase ? (COMBO_CHECKOUT_URL ?? COMBO_WHATSAPP_URL) : "#combo-offer"}>
        {children}
      </a>
    </div>
  );
}

const gallery = [
  { src: "/previa-curso.jpg", title: "Aulas de precificação", detail: "Aprenda em aproximadamente 40 minutos", layout: "lessons" },
  { src: "/combo-precificacao/calculadora1.jpg", title: "Cálculo da hora técnica", detail: "Com os custos da tua oficina", layout: "hour" },
  { src: "/combo-precificacao/calculadora2.jpg", title: "Precificação das peças", detail: "Custo + markup, tudo calculado", layout: "parts" },
  { src: "/material-apostila.jpg", title: "Apostila de precificação", detail: "Conteúdo de apoio para consultar", layout: "book" },
  { src: "/combo-precificacao/calculadora5.jpg", title: "Orçamentos organizados", detail: "Monte, envie e acompanhe os clientes", layout: "quotes", extra: "/combo-precificacao/calculadora9.jpg" },
  { src: "/material-checklist.jpg", title: "Checklist de apoio", detail: "Para usar na rotina da oficina", layout: "checklist" },
];

export default function ComboContent() {
  return (
    <>
      <section data-hero aria-labelledby="combo-hero" className={styles.hero}>
        <div className="hero-bg" aria-hidden="true" />
        <div className="wrap">
          <h1 id="combo-hero" className={styles.heroTitle}>Ajuste a precificação da tua oficina em <span className="text-blue">40 minutos</span> e tenha uma ferramenta que calcula cada novo orçamento pra ti.</h1>
          <p className={styles.intro}>Você define a base certa uma vez e usa a ferramenta no dia a dia para precificar peças e serviços, montar orçamentos e acompanhar o que foi aprovado ou ainda está aguardando.</p>
          <CalculatorShowcase />
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

      <section aria-labelledby="combo-gallery" data-tone="dark">
        <div className="wrap">
          <h2 id="combo-gallery" className="section-title mx-auto max-w-[30ch] text-center">A calculadora, as aulas e os materiais <span className="text-blue">que você vai acessar.</span></h2>
          <div className={styles.collage}>
            {gallery.map(item => <figure key={item.src} className={`${styles.collageItem} ${styles[item.layout]}`}>
              <figcaption className={styles.collageCaption}>
                <span>{item.title}</span>
                <small>{item.detail}</small>
                <svg className={styles.annotationArrow} viewBox="0 0 100 70" fill="none" aria-hidden="true">
                  <path d="M12 6C72 0 89 20 62 56M62 56L62 38M62 56L80 49" />
                </svg>
              </figcaption>
              <div className={styles.collageImages}>
                <a href={item.src} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar: ${item.title}`} className={styles.collageImage}>
                  <img src={item.src} alt={item.title} loading="lazy" />
                </a>
                {item.extra && <a href={item.extra} target="_blank" rel="noopener noreferrer" aria-label="Ampliar histórico de orçamentos" className={`${styles.collageImage} ${styles.collageExtra}`}>
                  <img src={item.extra} alt="Histórico para acompanhar a aprovação dos orçamentos" loading="lazy" />
                </a>}
              </div>
            </figure>)}
          </div>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-situations">
        <div className="wrap">
          <h2 id="combo-situations" className="section-title mx-auto max-w-[34ch] text-center">Se a precificação ainda não está 100% organizada na tua oficina, <span className="text-blue">provavelmente alguma dessas situações acontece por aí:</span></h2>
          <ul className={styles.situations}>{situations.map(text => <li key={text}>{text}</li>)}</ul>
          <p className={styles.closing}><strong>Se você se identificou com isso, o problema não é só aprender a precificar. Falta ter essa precificação organizada e aplicada na rotina da oficina.</strong></p>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-how">
        <div className="wrap">
          <h2 id="combo-how" className="section-title text-center">Como funciona <span className="text-blue">na prática:</span></h2>
          <ol className={styles.sequence}>{quickSteps.map((step, i) => <li key={step.title}>
            <div className={styles.stepVisual}>
              <span className={styles.stepBadge} aria-hidden="true">0{i + 1}</span>
              <img src={step.image} alt={step.alt} loading="lazy" />
              <span className={styles.stepCue}>
                {i === 0 ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg> : <Check />}
                {step.cue}
              </span>
            </div>
            <h3>{step.title}</h3><p>{step.text}</p>
            {i < quickSteps.length - 1 && <svg className={styles.stepArrow} viewBox="0 0 64 32" fill="none" aria-hidden="true"><path d="M4 16h52M45 5l12 11-12 11" /></svg>}
          </li>)}</ol>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-profiles">
        <div className="wrap">
          <h2 id="combo-profiles" className="section-title mx-auto max-w-[30ch] text-center">A Calculadora de Precificação <span className="text-blue">é para quem:</span></h2>
          <ul className={styles.profiles}>{profiles.map((profile, i) => <li key={profile.title}><div className={styles.profileIllustration}><ProfileIllustration kind={i} /></div><h3>{profile.title}</h3><p>{profile.text}</p></li>)}</ul>
          <p className={styles.closing}>Não importa se é você ou outra pessoa da equipe que faz os orçamentos: a ideia é ter a precificação definida e uma ferramenta para aplicar a mesma base todos os dias.</p>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-materials">
        <div className="wrap">
          <h2 id="combo-materials" className="section-title mx-auto max-w-[32ch] text-center">Tudo que você recebe para <span className="text-blue">ajustar e aplicar a precificação da tua oficina:</span></h2>
          <div className={styles.materials}>{materials.map(item => <article key={item.title} className={item.bonus ? styles.bonusMaterial : undefined}>
            {item.bonus && <span className={styles.bonusBadge}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" /></svg>BÔNUS INCLUÍDO NO COMBO</span>}
            <div className={styles.materialImage}><img src={item.image} alt={item.title} loading="lazy" /></div>
            <div className={styles.materialCopy}><h3>{item.title}</h3><p>{item.text}</p></div>
          </article>)}</div>
          <p className={styles.closing}>Você não recebe só o conteúdo para aprender a precificar. Recebe também a ferramenta para aplicar essa precificação em cada orçamento durante os próximos 12 meses.</p>
          <Action />
        </div>
      </section>

      <section id="combo-offer" aria-labelledby="combo-price" data-tone="dark">
        <div className="wrap">
          <div className={styles.priceCard}>
            <h2 id="combo-price">O combo que vai resolver a tua precificação de forma <span>DEFINITIVA!</span></h2>
            <ul className={styles.recap}>{materials.map(item => <li key={item.summary}><Check className={styles.check} /><span>{item.bonus && <strong className={styles.recapBonus}>BÔNUS</strong>}{item.summary}</span></li>)}</ul>
            <div className={styles.anchorPrices}>
              <div><span>Calculadora de Precificação</span><b>R$ 497</b></div>
              <div><span>Treinamento Precificação para Oficinas</span><b>R$ 197</b></div>
              <div><span>Comprando separadamente:</span><s>R$ 694</s></div>
            </div>
            <div className={styles.paymentOffer}>
              <p className={styles.priceLead}>Leve o combo completo por</p>
              <div className={styles.price} aria-label="12 parcelas de 61 reais e 38 centavos">
                <span className={styles.installments}>12x de</span>
                <span className={styles.priceAmount}><span className={styles.currency}>R$</span>61,38</span>
              </div>
              <p className={styles.cashPrice}>ou à vista <strong>R$ 597,00</strong></p>
              <p className={styles.saving}>Economize R$ 97 pagando à vista</p>
              <p className={styles.installmentTotal}>Total parcelado: R$ 736,56</p>
            </div>
            <Action purchase>QUERO O COMBO COMPLETO</Action>
            {!COMBO_CHECKOUT_URL && <p className={styles.checkoutNote}>Fale com a equipe pelo WhatsApp para adquirir o combo.</p>}
            <p className={styles.offerSupport}>Você aprende a ajustar a precificação uma vez e fica com a ferramenta para aplicar nos orçamentos da tua oficina pelos próximos 12 meses.</p>
            <p className={styles.priceClosing}>Isso aqui é <strong>RESOLVER</strong> de uma vez por todas, aquilo que te <strong>TIRA dinheiro</strong> todos os meses.</p>
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

      <section aria-labelledby="combo-whatsapp" data-tone="dark">
        <div className="wrap">
          <h2 id="combo-whatsapp" className="section-title text-center">Ainda ficou com alguma dúvida?</h2>
          <p className={styles.intro}>Fala com a nossa equipe no WhatsApp e pergunta o que precisar antes de entrar.</p>
          <div className={styles.action}><a href={COMBO_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.button}><WhatsApp className={styles.check} />FALAR COM A EQUIPE NO WHATSAPP</a></div>
        </div>
      </section>
    </>
  );
}
