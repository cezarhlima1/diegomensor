import type { ReactNode } from "react";
import Author from "@/components/Author";
import { Check, WhatsApp } from "@/components/icons";
import { COMBO_CHECKOUT_URL, COMBO_WHATSAPP_URL } from "./config";
import { testimonials, situations, quickSteps, profiles, materials, faqs } from "./copy";
import styles from "./combo.module.css";
import CalculatorShowcase from "./CalculatorShowcase";
import ProfileIllustration from "./ProfileIllustration";

function Action({ children = "Quero resolver minha precificação" }: { children?: ReactNode }) {
  return (
    <div className={styles.action}>
      <a className={styles.button} href={COMBO_CHECKOUT_URL ?? COMBO_WHATSAPP_URL}>
        {children}
      </a>
    </div>
  );
}

const walkthrough = [
  { src: "/previa-curso.jpg", title: "Assista às aulas", detail: "São 40 minutos, pra você entender como precificar peças e serviços e como aplicar o passo a passo na ferramenta.", alt: "Área de aulas do treinamento de precificação para oficinas" },
  { src: "/combo-precificacao/calculadora1.jpg", title: "Padronize o valor da mão de obra", detail: "Configure o valor da sua hora técnica na ferramenta. Você pode cadastrar um ou mais valores, conforme os serviços da sua oficina.", alt: "Calculadora com os custos da oficina e o cálculo do valor da hora técnica" },
  { src: "/calculadora13.png", title: "Defina o padrão de markup", detail: "Configure o markup que será aplicado ao custo das peças para calcular o preço de venda.", alt: "Configuração do percentual de markup de uma peça na calculadora" },
  { src: "/combo-precificacao/calculadora2.jpg", title: "Informe o custo da peça e veja o cálculo pronto", detail: "Insira o valor de custo da peça e a quantidade. A ferramenta aplica o markup e calcula automaticamente o valor final das peças.", alt: "Custo e quantidade da peça com markup aplicado e valor final calculado" },
  { src: "/combo-precificacao/calculadora5.jpg", title: "Preencha os dados do cliente e dos serviços", detail: "Informe os dados do cliente, como ele chegou até a oficina e a quantidade de horas de cada serviço a ser realizado.", alt: "Formulário do orçamento com dados do cliente, origem e seleção da hora técnica" },
  { src: "/combo-precificacao/calculadora11.jpg", title: "Envie o orçamento pelo WhatsApp", detail: "O orçamento já fica organizado em uma mensagem pronta. É só copiar, colar e enviar no WhatsApp do cliente.", alt: "Mensagem de orçamento pronta no WhatsApp com peças, mão de obra e valor total" },
  { src: "/combo-precificacao/calculadora9.jpg", title: "Acompanhe o histórico dos orçamentos", detail: "Consulte os orçamentos e atualize o status de cada um: aguardando aprovação, aprovado ou não aprovado.", alt: "Histórico de orçamentos com os status aguardando aprovação, aprovado e não aprovado", extra: "/combo-precificacao/calculadora8.jpg", extraAlt: "Resultados dos orçamentos e origem dos clientes" },
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
              <div className={styles.testimonialImage}><img src={item.image} alt="Depoimento de aluno sobre os orçamentos feitos na calculadora" loading="lazy" /></div>
              <p>{item.text}</p>
            </article>)}
          </div>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-gallery" data-tone="dark">
        <div className="wrap">
          <h2 id="combo-gallery" className="section-title text-center">Esse é o <span className="text-blue">passo a passo:</span></h2>
          <ol className={styles.walkthrough}>
            {walkthrough.map((step, index) => <li key={step.title} className={styles.walkthroughStep}>
              <div className={styles.walkthroughCopy}>
                <span className={styles.walkthroughNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </div>
              <div className={styles.walkthroughImages}>
                <div className={styles.walkthroughImage}>
                  <img src={step.src} alt={step.alt} loading="lazy" />
                </div>
                {step.extra && <div className={styles.walkthroughImage}>
                  <img src={step.extra} alt={step.extraAlt} loading="lazy" />
                </div>}
              </div>
            </li>)}
          </ol>
          <Action />
        </div>
      </section>

      <section aria-labelledby="combo-situations">
        <div className="wrap">
          <h2 id="combo-situations" className="section-title mx-auto max-w-[34ch] text-center">Se a precificação ainda não está 100% organizada na tua oficina, <span className="text-blue">provavelmente alguma dessas situações acontece por aí:</span></h2>
          <ul className={styles.situations}>{situations.map(text => <li key={text}>{text}</li>)}</ul>
          <p className={styles.situationEmphasis}><strong>Se você se identificou com isso, o problema não é só aprender a precificar. <span>Falta ter essa precificação organizada e aplicada na rotina da oficina.</span></strong></p>
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
            <span className={styles.comboOfferBadge}>OS DOIS JUNTOS, POR MENOS</span>
            <h2 id="combo-price">Garanta o <span>combo completo</span></h2>
            <p className={styles.offerDescription}>Treinamento + 12 meses de calculadora</p>
            <dl className={styles.valueBreakdown}>
              <div><dt>Treinamento de precificação para oficinas</dt><dd>R$ 197,00</dd></div>
              <div><dt>Ferramenta de orçamento<small>12 meses de acesso à calculadora</small></dt><dd>R$ 497,00</dd></div>
              <div className={styles.separateTotal}><dt>Total dos itens separados</dt><dd><s>R$ 694,00</s></dd></div>
            </dl>
            <div className={styles.comboSavings}><Check aria-hidden="true" /><span>Você economiza <strong>R$ 97,00</strong> levando o combo!</span></div>
            <div className={styles.paymentOffer}>
              <p className={styles.comboPriceLabel}>COMBO COMPLETO POR</p>
              <div className={styles.price} aria-label="Até 10 parcelas de 59 reais e 70 centavos sem juros">
                <span className={styles.installments}>até 10x de</span>
                <span className={styles.priceAmount}><span className={styles.currency}>R$</span>59,70</span>
              </div>
              <span className={styles.interestFree}>SEM JUROS</span>
              <p className={styles.cashPrice}>ou à vista <strong>R$ 597,00</strong></p>
              <p className={styles.paymentNote}>O mesmo valor total à vista ou em até 10 parcelas.</p>
            </div>
            <Action>QUERO O COMBO COMPLETO</Action>
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
