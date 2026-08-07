"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./oficina.module.css";

const modules = [
  ["01", "Recepção", "Crie uma primeira impressão profissional e organize a chegada de cada cliente."],
  ["02", "Check-in e Ordem de Serviço", "Registre veículo, demanda e autorizações com clareza desde o início."],
  ["03", "Distribuição dos Serviços", "Defina prioridades, responsáveis e prazos sem depender da memória do dono."],
  ["04", "Diagnóstico", "Padronize a análise técnica e reduza erros antes de apresentar o orçamento."],
  ["05", "Check-list com Imagens", "Documente o estado do veículo e aumente a percepção de transparência."],
  ["06", "Orçamento", "Apresente serviços e valores de forma profissional, clara e rastreável."],
  ["07", "Contato Comercial", "Conduza aprovações e retornos com um processo comercial consistente."],
  ["08", "Compra de Peças", "Organize cotações, fornecedores, prazos e margens de cada componente."],
  ["09", "Reparo", "Transforme o serviço técnico em uma operação previsível e acompanhável."],
  ["10", "Teste Final", "Crie uma barreira de qualidade antes que o veículo volte ao cliente."],
  ["11", "Check-out e Entrega", "Finalize cada atendimento com conferência, orientação e profissionalismo."],
  ["12", "Caixa e Pós-venda", "Feche o ciclo, acompanhe os números e mantenha o relacionamento ativo."],
];

const faqs = [
  ["O curso serve para qualquer tipo de oficina?", "Sim. O método pode ser aplicado em oficinas de diferentes portes e especialidades."],
  ["Por quanto tempo terei acesso?", "Você terá 12 meses de acesso ao treinamento e aos materiais."],
  ["As aulas são gravadas?", "Sim. Todo o conteúdo fica disponível para você assistir no seu ritmo."],
  ["Terei suporte?", "Sim. Você participa de encontros quinzenais ao vivo para tirar dúvidas e acompanhar a implementação."],
  ["Preciso ter equipe?", "Não. O método funciona tanto para quem trabalha sozinho quanto para quem já possui uma equipe."],
  ["Recebo certificado?", "Sim. Ao concluir o treinamento, você recebe seu certificado."],
];

const problems = [
  ["01", "Processos inexistentes", "Cada serviço depende da experiência e da memória de quem está executando."],
  ["02", "Equipe sem padrão", "Cada funcionário trabalha de um jeito e o resultado muda de pessoa para pessoa."],
  ["03", "Atendimento desorganizado", "Informações se perdem e o cliente não percebe o profissionalismo da operação."],
  ["04", "Financeiro sem controle", "O faturamento pode crescer enquanto a margem e o caixa continuam pressionados."],
  ["05", "Dependência do dono", "Toda decisão, problema e aprovação termina na sua mesa."],
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function Check() {
  return <span className={styles.check} aria-hidden="true">✓</span>;
}

export default function OficinaAltaPerformance() {
  const [activeModule, setActiveModule] = useState(0);
  const [progress, setProgress] = useState(0);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });

    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add(styles.visible);
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(`.${styles.reveal}`).forEach((el) => observer.observe(el));
    return () => {
      window.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <main
      className={styles.page}
      ref={pageRef}
      onPointerMove={(event) => {
        pageRef.current?.style.setProperty("--pointer-x", `${event.clientX}px`);
        pageRef.current?.style.setProperty("--pointer-y", `${event.clientY}px`);
      }}
    >
      <div className={styles.pointerGlow} aria-hidden="true" />
      <div className={styles.progress} style={{ width: `${progress}%` }} />
      <header className={styles.nav}>
        <a href="#inicio" className={styles.brand} aria-label="Oficina de Alta Performance — início">
          <span className={styles.brandMark}>DM</span>
          <span>Oficina de Alta Performance<sup>®</sup></span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#metodo">O método</a>
          <a href="#processos">Processos</a>
          <a href="#resultados">Resultados</a>
        </nav>
        <a className={styles.navCta} href="#investimento">Quero participar <Arrow /></a>
      </header>

      <section className={styles.hero} id="inicio">
        <div className={styles.heroGlow} />
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={`${styles.heroCopy} ${styles.reveal}`}>
              <span className={styles.eyebrow}>Método de gestão para oficinas</span>
              <h1>Organize a gestão. <em>Aumente a lucratividade.</em> Dependa menos de você.</h1>
              <p>
                Um método construído ao longo de 24 anos dentro de oficina para
                organizar processos, padronizar a equipe e preparar sua empresa para crescer.
              </p>
              <div className={styles.heroActions}>
                <a className={styles.primaryCta} href="#investimento">
                  Quero transformar minha oficina <Arrow />
                </a>
                <span>Acesso por 12 meses · 7 dias de garantia</span>
              </div>
              <div className={styles.quickProof}>
                <div><strong>24+</strong><span>anos de prática</span></div>
                <div><strong>14</strong><span>processos organizados</span></div>
                <div><strong>Ao vivo</strong><span>a cada 15 dias</span></div>
              </div>
            </div>

            <div className={`${styles.platform} ${styles.reveal}`} aria-label="Prévia da plataforma">
              <div className={styles.platformTop}>
                <span><i /> Oficina de Alta Performance</span>
                <span className={styles.dots}>•••</span>
              </div>
              <div className={styles.platformBody}>
                <aside>
                  <span className={styles.avatar}>DM</span>
                  {["Visão geral", "Processos", "Ferramentas", "Encontros"].map((item, i) => (
                    <span key={item} className={i === 1 ? styles.activeNav : ""}>
                      <b>0{i + 1}</b>{item}
                    </span>
                  ))}
                </aside>
                <div className={styles.dashboard}>
                  <div className={styles.dashHeader}>
                    <div><small>MÓDULO 06</small><strong>Orçamento</strong></div>
                    <span>72% concluído</span>
                  </div>
                  <div className={styles.dashProgress}><i /></div>
                  <div className={styles.lesson}>
                    <span className={styles.play}>▶</span>
                    <div><b>Como apresentar valor</b><small>18 min · Aula prática</small></div>
                  </div>
                  <div className={styles.dashCards}>
                    <div><small>PROCESSOS</small><strong>14</strong><span>mapeados</span></div>
                    <div><small>IMPLEMENTAÇÃO</small><strong>5/7</strong><span>etapas</span></div>
                  </div>
                </div>
              </div>
              <div className={styles.floatCardA}><Check /><span><b>Processo aplicado</b><small>Check-in padronizado</small></span></div>
              <div className={styles.floatCardB}><small>PRODUTIVIDADE</small><strong>+ organização</strong><span>na rotina da equipe</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.lightSection} id="metodo">
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}>
            <span className={styles.index}>01 — O método</span>
            <h2>Sua oficina não precisa de mais correria. Precisa de um sistema.</h2>
            <p>
              Administrar uma oficina vai muito além de consertar carros. O Oficina de Alta
              Performance reúne os processos, ferramentas e métodos necessários para organizar
              a operação — do primeiro contato com o cliente até o pós-venda.
            </p>
          </div>
          <div className={styles.principles}>
            {[
              ["Sem processos", "a operação depende das pessoas."],
              ["Sem organização", "o dono precisa resolver tudo."],
              ["Sem gestão", "o faturamento cresce, mas o lucro não acompanha."],
            ].map(([title, text], i) => (
              <article className={`${styles.principle} ${styles.reveal}`} key={title}>
                <span>0{i + 1}</span><h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
          <div className={`${styles.statement} ${styles.reveal}`}>
            <span>O objetivo não é fazer você trabalhar mais.</span>
            <strong>É fazer a sua oficina funcionar melhor.</strong>
          </div>
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.shell}>
          <div className={`${styles.splitIntro} ${styles.reveal}`}>
            <div><span className={styles.indexDark}>02 — O problema</span><h2>Por que a maioria das oficinas não cresce?</h2></div>
            <p>O problema raramente é apenas falta de clientes. Os gargalos que travam uma oficina estão dentro da operação.</p>
          </div>
          <div className={styles.problemList}>
            {problems.map(([num, title, text]) => (
              <article className={`${styles.problem} ${styles.reveal}`} key={num}>
                <span>{num}</span><h3>{title}</h3><p>{text}</p><i>→</i>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.lightSection}>
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}>
            <span className={styles.index}>03 — Para quem é</span>
            <h2>Feito para o dono que quer assumir o controle da empresa.</h2>
          </div>
          <div className={styles.audienceGrid}>
            {[
              "A empresa depende de você para tudo",
              "O dia inteiro é consumido por incêndios",
              "Falta padrão na operação e na equipe",
              "A produtividade precisa melhorar",
              "O cliente ainda não percebe todo o valor",
              "O lucro não acompanha o esforço",
            ].map((item) => <div className={`${styles.audienceItem} ${styles.reveal}`} key={item}><Check /><span>{item}</span></div>)}
          </div>
          <div className={`${styles.audienceFooter} ${styles.reveal}`}>
            <p>Para quem busca construir uma oficina preparada para crescer.</p>
            <a href="#investimento">Quero estruturar minha oficina <Arrow /></a>
          </div>
        </div>
      </section>

      <section className={styles.results} id="resultados">
        <div className={styles.shell}>
          <div className={`${styles.splitIntro} ${styles.reveal}`}>
            <div><span className={styles.indexDark}>04 — Resultados reais</span><h2>Quando o improviso termina, os números respondem.</h2></div>
            <p>Relatos reais de oficinas que começaram a enxergar a gestão com mais clareza.</p>
          </div>
          <div className={styles.resultsGrid}>
            <figure className={`${styles.resultMain} ${styles.reveal}`}>
              <Image src="/depoimentocaptura1.png" alt="Resultado real de aluna mostrando evolução no faturamento" width={1066} height={872} sizes="(max-width: 800px) 100vw, 58vw" />
              <figcaption><span>Resultado compartilhado por aluna</span><b>Gestão aplicada na prática</b></figcaption>
            </figure>
            <div className={styles.resultSide}>
              <figure className={`${styles.resultSmall} ${styles.reveal}`}>
                <Image src="/depoimentocaptura2.png" alt="Depoimento real de aluno do método" width={1306} height={1004} sizes="(max-width: 800px) 100vw, 38vw" />
              </figure>
              <blockquote className={`${styles.quote} ${styles.reveal}`}>
                <span>“</span><p>Processo não engessa uma oficina. Processo devolve clareza, padrão e tempo para o dono pensar na empresa.</p>
                <cite>Princípio do método</cite>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.processSection} id="processos">
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}>
            <span className={styles.index}>05 — O que você recebe</span>
            <h2>Um método completo para organizar toda a operação.</h2>
            <p>Clique em cada etapa para entender como o processo se conecta à rotina da sua oficina.</p>
          </div>
          <div className={styles.timeline}>
            <div className={styles.moduleList}>
              {modules.map(([num, title], i) => (
                <button key={num} onClick={() => setActiveModule(i)} className={activeModule === i ? styles.activeModule : ""}>
                  <span>{num}</span><b>{title}</b><i>↗</i>
                </button>
              ))}
            </div>
            <article className={styles.moduleDetail}>
              <span>PROCESSO {modules[activeModule][0]}</span>
              <h3>{modules[activeModule][1]}</h3>
              <p>{modules[activeModule][2]}</p>
              <div><Check /><span>Fluxo passo a passo</span></div>
              <div><Check /><span>Ferramenta pronta para aplicar</span></div>
              <div><Check /><span>Orientação prática de implementação</span></div>
              <small>{activeModule + 1} de {modules.length} processos</small>
            </article>
          </div>
          <div className={styles.materials}>
            {["Planilhas", "Checklists", "Documentos", "Materiais de apoio"].map((item, i) => (
              <div className={styles.reveal} key={item}><span>0{i + 1}</span><b>{item}</b><small>Pronto para usar</small></div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.bonusSection}>
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}>
            <span className={styles.index}>06 — Além do método</span><h2>Suporte para transformar conteúdo em execução.</h2>
          </div>
          <div className={styles.bonusGrid}>
            {[
              ["01", "Treinamento da equipe", "Leve o método para quem executa a operação todos os dias."],
              ["02", "Encontros quinzenais", "Tire dúvidas ao vivo e mantenha o ritmo da implementação."],
              ["03", "Especialistas convidados", "Marketing, comercial, recrutamento, tráfego e área tributária."],
            ].map(([n, title, text]) => <article className={`${styles.bonus} ${styles.reveal}`} key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className={styles.transformation}>
        <div className={styles.shell}>
          <div className={`${styles.centerIntro} ${styles.reveal}`}><span className={styles.indexDark}>07 — A transformação</span><h2>A mesma oficina. Uma operação completamente diferente.</h2></div>
          <div className={styles.compare}>
            <article className={`${styles.before} ${styles.reveal}`}>
              <span>HOJE</span><h3>Improviso e dependência</h3>
              {["Tudo depende de você", "Cada funcionário trabalha de um jeito", "Retrabalho faz parte da rotina", "O cliente não percebe valor", "Muito esforço, pouco avanço"].map((x) => <p key={x}><i>×</i>{x}</p>)}
            </article>
            <div className={styles.vs}>→</div>
            <article className={`${styles.after} ${styles.reveal}`}>
              <span>DEPOIS DO MÉTODO</span><h3>Controle e previsibilidade</h3>
              {["Processos padronizados", "Equipe alinhada", "Atendimento profissional", "Mais produtividade e controle", "Mais lucro e menos dependência"].map((x) => <p key={x}><Check />{x}</p>)}
            </article>
          </div>
        </div>
      </section>

      <section className={styles.offerSection} id="investimento">
        <div className={styles.shell}>
          <div className={`${styles.offer} ${styles.reveal}`}>
            <div className={styles.offerCopy}>
              <span className={styles.indexDark}>08 — Investimento</span>
              <h2>Quanto custa continuar sem organização?</h2>
              <p>Cobrar errado, refazer serviços e manter uma equipe sem padrão custam todos os meses. Um método bem aplicado continua gerando resultado por anos.</p>
              <ul><li><Check /> Método completo</li><li><Check /> Ferramentas e materiais</li><li><Check /> Encontros ao vivo</li><li><Check /> 12 meses de acesso</li></ul>
            </div>
            <div className={styles.priceCard}>
              <div className={styles.cohortBadge}>
                <span>Condição exclusiva de primeira turma</span>
              </div>
              <span>OFICINA DE ALTA PERFORMANCE®</span>
              <small>CONDIÇÃO DE PAGAMENTO</small>
              <div className={styles.installment}>
                <span>12x</span>
                <div>
                  <small>de R$</small>
                  <strong>83,08</strong>
                </div>
              </div>
              <p className={styles.totalPrice}>ou R$ 997,00 à vista</p>
              <a className={styles.primaryCta} href="#garantia">Quero fazer parte <Arrow /></a>
              <small>Acesso imediato após a confirmação</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.guarantee} id="garantia">
        <div className={styles.shell}>
          <div className={`${styles.guaranteeCard} ${styles.reveal}`}>
            <div className={styles.seal}>7<span>DIAS</span></div>
            <div><span className={styles.index}>Garantia incondicional</span><h2>Entre, conheça e decida com tranquilidade.</h2><p>Se durante os primeiros 7 dias você entender que o treinamento não faz sentido para sua oficina, basta solicitar o reembolso. Devolvemos 100% do valor investido. Sem burocracia.</p></div>
          </div>
        </div>
      </section>

      <section className={styles.about}>
        <div className={styles.shell}>
          <div className={styles.aboutGrid}>
            <div className={`${styles.aboutImage} ${styles.reveal}`}><Image src="/diego.jpeg" alt="Diego Mensor, especialista em gestão de oficinas" width={800} height={800} sizes="(max-width: 800px) 100vw, 45vw" /><span><strong>24+</strong> anos dentro de oficina</span></div>
            <div className={`${styles.aboutCopy} ${styles.reveal}`}><span className={styles.index}>09 — Quem criou o método</span><h2>Diego Mensor</h2><p>São mais de 24 anos vivendo a realidade das oficinas e 14 anos como proprietário.</p><p>Depois de enfrentar falta de processos, sobrecarga, dificuldades com equipe e crescimento desorganizado, Diego documentou aquilo que realmente funciona dentro de uma oficina.</p><p>Hoje, esse conhecimento forma um método prático para ajudar outros donos a organizarem suas operações e construírem empresas menos dependentes do proprietário.</p><div><span><strong>24</strong> anos de experiência</span><span><strong>14</strong> anos como proprietário</span></div></div>
          </div>
        </div>
      </section>

      <section className={styles.faq}>
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}><span className={styles.index}>10 — Perguntas frequentes</span><h2>Informação clara antes da sua decisão.</h2></div>
          <div className={styles.faqList}>
            {faqs.map(([q, a], i) => <details className={styles.reveal} key={q} open={i === 0}><summary><span>{String(i + 1).padStart(2, "0")}</span>{q}<i>+</i></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.shell}><div><span className={styles.brandMark}>DM</span><b>Oficina de Alta Performance<sup>®</sup></b></div><p>Gestão séria para oficinas preparadas para crescer.</p><small>© {new Date().getFullYear()} Diego Mensor. Todos os direitos reservados.</small></div>
      </footer>

      <a className={styles.stickyCta} href="#investimento"><span><b>Oficina de Alta Performance®</b><small>Acesso por 12 meses</small></span><strong>Quero participar <Arrow /></strong></a>
    </main>
  );
}
