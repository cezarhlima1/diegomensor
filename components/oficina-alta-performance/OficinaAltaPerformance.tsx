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
  ["11", "Check-out", "Confira o serviço, os registros e o veículo antes de concluir o atendimento."],
  ["12", "Entrega do Veículo", "Finalize cada atendimento com orientação, clareza e profissionalismo."],
  ["13", "Caixa", "Organize o fechamento financeiro e acompanhe os números da operação."],
  ["14", "Pós-venda", "Mantenha o relacionamento ativo e acompanhe a experiência do cliente."],
];

const faqs = [
  ["O curso serve para qualquer tipo de oficina?", "Sim. O método pode ser aplicado em oficinas de diferentes portes e especialidades."],
  ["Por quanto tempo terei acesso?", "12 meses."],
  ["As aulas são gravadas?", "Sim. Todo o conteúdo fica disponível para você assistir quando quiser."],
  ["Terei suporte?", "Sim. Você terá acesso aos encontros quinzenais ao vivo para tirar dúvidas e acompanhar a implementação."],
  ["Preciso ter equipe?", "Não. O método pode ser aplicado tanto por quem trabalha sozinho quanto por quem já possui uma equipe."],
];

const problems = [
  ["01", "Falta de processos", "Cada serviço depende da experiência e da memória de quem está executando."],
  ["02", "Equipe sem padrão", "Cada funcionário trabalha de um jeito e o resultado muda de pessoa para pessoa."],
  ["03", "Atendimento desorganizado", "Informações se perdem e o cliente não percebe o profissionalismo da operação."],
  ["04", "Gestão financeira sem controle", "O faturamento pode crescer enquanto a margem e o caixa continuam pressionados."],
  ["05", "Dependência excessiva do dono", "Toda decisão, problema e aprovação termina na sua mesa."],
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
      <div className={styles.cohortBanner}>
        <span>Condição exclusiva da primeira turma</span>
        <i aria-hidden="true" />
        <strong>Disponível somente nesta turma</strong>
      </div>
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
              <span className={styles.eyebrow}>Oficina de Alta Performance®</span>
              <h1>Chegou a hora de ter uma oficina <em>organizada, lucrativa</em> e menos dependente de você.</h1>
              <p>
                Aprenda um método de gestão construído ao longo de 24 anos dentro de oficina
                para organizar processos, padronizar a equipe, melhorar a produtividade e
                transformar a sua oficina em uma empresa preparada para crescer.
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
            <span className={styles.index}>01 — O que é o Oficina de Alta Performance?</span>
            <h2>O método completo e objetivo de gestão para donos de oficina que querem construir uma empresa organizada e lucrativa.</h2>
            <p>
              Administrar uma oficina vai muito além de consertar carros. O Oficina de Alta
              Performance reúne todos os processos, ferramentas e métodos necessários para
              organizar a operação da sua oficina, do primeiro contato com o cliente até o pós-venda.
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
            <p>A maioria dos donos acredita que o problema está na falta de clientes. Outros acham que precisam contratar mais pessoas. E alguns acreditam que o problema é apenas vender mais.</p>
          </div>
          <div className={styles.problemList}>
            {problems.map(([num, title, text]) => (
              <article className={`${styles.problem} ${styles.reveal}`} key={num}>
                <span>{num}</span><h3>{title}</h3><p>{text}</p><i>→</i>
              </article>
            ))}
          </div>
          <p className={`${styles.problemConclusion} ${styles.reveal}`}>Foi justamente para resolver esses gargalos que nasceu o Oficina de Alta Performance.</p>
        </div>
      </section>

      <section className={styles.lightSection}>
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}>
            <span className={styles.index}>03 — Para quem é</span>
            <h2>Para quem é este treinamento?</h2>
          </div>
          <div className={styles.audienceGrid}>
            {[
              "Sentem que a empresa depende deles para tudo",
              "Trabalham o dia inteiro, mas continuam apagando incêndio",
              "Querem organizar processos e padronizar a operação",
              "Precisam aumentar a produtividade da equipe",
              "Desejam melhorar a experiência do cliente",
              "Querem aumentar o lucro sem depender apenas de vender mais",
              "Buscam construir uma oficina preparada para crescer",
            ].map((item) => <div className={`${styles.audienceItem} ${styles.reveal}`} key={item}><Check /><span>{item}</span></div>)}
            <div className={`${styles.audienceCta} ${styles.reveal}`}>
              <p>Para quem busca construir uma oficina preparada para crescer.</p>
              <a href="#investimento">Quero estruturar minha oficina <Arrow /></a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.results} id="resultados">
        <div className={styles.shell}>
          <div className={`${styles.splitIntro} ${styles.reveal}`}>
            <div><span className={styles.indexDark}>04 — Resultados</span><h2>Veja o que acontece quando uma oficina deixa o improviso.</h2></div>
            <p>E passa a trabalhar com processos.</p>
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
            <span className={styles.index}>05 — O que você vai receber</span>
            <h2>Um passo a passo completo e no detalhe para organizar toda a operação da sua oficina.</h2>
            <p>Você terá acesso ao passo a passo de cada etapa da operação. Clique em cada processo para conhecer os detalhes.</p>
          </div>
          <div className={styles.timeline}>
            <div className={styles.moduleList}>
              {modules.map(([num, title], i) => (
                <button
                  key={num}
                  type="button"
                  aria-pressed={activeModule === i}
                  onClick={() => setActiveModule(i)}
                  className={activeModule === i ? styles.activeModule : ""}
                >
                  <span>{num}</span><b>{title}</b><i>↗</i>
                </button>
              ))}
            </div>
            <article className={styles.moduleDetail} key={activeModule}>
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
            <div className={styles.materialsIntro}>
              <span>Além do passo a passo</span>
              <strong>Recursos prontos para aplicar na sua oficina</strong>
            </div>
            {["Ferramentas prontas", "Planilhas", "Checklists", "Modelos de documentos", "Materiais de apoio"].map((item, i) => (
              <div className={styles.reveal} key={item}><span>0{i + 1}</span><b>{item}</b><small>Pronto para usar</small></div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.bonusSection}>
        <div className={styles.shell}>
          <div className={`${styles.sectionIntro} ${styles.reveal}`}>
            <span className={styles.index}>06 — Bônus</span><h2>Além do método completo, você recebe suporte para colocar tudo em prática.</h2>
          </div>
          <div className={styles.bonusGrid}>
            {[
              ["01", "Treinamento completo da equipe", "Leve o método para quem executa a operação todos os dias."],
              ["02", "Encontros quinzenais ao vivo", "Tire dúvidas e mantenha o ritmo da implementação."],
              ["03", "Aulas exclusivas com especialistas", "Marketing, comercial, recrutamento, gestão de tráfego e área tributária."],
            ].map(([n, title, text]) => <article className={`${styles.bonus} ${styles.reveal}`} key={n}><span>{n}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className={styles.transformation}>
        <div className={styles.shell}>
          <div className={`${styles.centerIntro} ${styles.reveal}`}><span className={styles.indexDark}>07 — A transformação</span><h2>Como será a sua oficina depois de aplicar o método.</h2></div>
          <div className={styles.compare}>
            <article className={`${styles.before} ${styles.reveal}`}>
              <span>HOJE</span><h3>Improviso e dependência</h3>
              {["Tudo depende de você", "Cada funcionário trabalha de um jeito", "Retrabalho faz parte da rotina", "O cliente não percebe valor", "Falta organização", "Você trabalha muito e sente que nunca sai do lugar"].map((x) => <p key={x}><i>×</i>{x}</p>)}
            </article>
            <div className={styles.vs}>→</div>
            <article className={`${styles.after} ${styles.reveal}`}>
              <span>DEPOIS DO MÉTODO</span><h3>Controle e previsibilidade</h3>
              {["Processos padronizados", "Equipe alinhada", "Atendimento mais profissional", "Mais produtividade", "Mais controle financeiro", "Mais previsibilidade", "Mais lucro", "Uma oficina menos dependente do dono"].map((x) => <p key={x}><Check />{x}</p>)}
            </article>
          </div>
        </div>
      </section>

      <section className={styles.offerSection} id="investimento">
        <div className={styles.shell}>
          <div className={`${styles.offer} ${styles.reveal}`}>
            <div className={styles.offerCopy}>
              <span className={styles.indexDark}>08 — Investimento</span>
              <h2>Quanto custa continuar perdendo dinheiro por falta de organização?</h2>
              <p>Quanto custa cobrar errado durante um mês? Quanto custa o retrabalho? Quanto custa uma equipe sem padrão?</p>
              <div className={styles.costSignals}>
                <span>Cobrar errado</span>
                <span>Refazer serviços</span>
                <span>Equipe sem padrão</span>
              </div>
              <strong className={styles.offerConclusion}>Agora compare isso com o investimento necessário para estruturar uma oficina que pode gerar resultados durante muitos anos.</strong>
              <ul><li><Check /> Método completo</li><li><Check /> Ferramentas e materiais</li><li><Check /> Encontros ao vivo</li><li><Check /> 12 meses de acesso</li></ul>
            </div>
          </div>
          <div className={`${styles.pricingStage} ${styles.reveal}`}>
            <div className={styles.priceCard}>
              <span className={styles.offerProduct}>OFICINA DE ALTA PERFORMANCE®</span>
              <small className={styles.paymentLabel}>CONDIÇÃO DE PAGAMENTO</small>
              <p className={styles.investmentLead}>Para ter uma oficina lucrativa, organizada e menos dependente de você, o investimento é de:</p>
              <div className={styles.installment}>
                <div className={styles.installmentPrefix}>
                  <span>12x</span>
                  <small>de R$</small>
                </div>
                <strong>83,83</strong>
              </div>
              <p className={styles.totalPrice}>ou R$ 997,00 à vista</p>
              <div className={styles.dailyCost}>
                <span>Fazendo as contas, isso representa cerca de</span>
                <strong>R$ 2,73 por dia</strong>
              </div>
              <p className={styles.impactText}>Um investimento simbólico quando comparado ao retorno financeiro e, muito além disso, ao impacto na sua vida profissional e pessoal.</p>
              <a className={styles.primaryCta} href="#garantia">Quero uma Oficina de Alta Performance <Arrow /></a>
              <div className={styles.offerAssurances}>
                <span><Check /> Acesso imediato</span>
                <span><Check /> 7 dias de garantia</span>
              </div>
              <small className={styles.accessNote}>Acesso liberado após a confirmação</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.guarantee} id="garantia">
        <div className={styles.shell}>
          <div className={`${styles.guaranteeCard} ${styles.reveal}`}>
            <div className={styles.seal}>7<span>DIAS</span></div>
            <div><span className={styles.index}>Garantia incondicional</span><h2>Você terá 7 dias para conhecer o treinamento.</h2><p>Entre na plataforma, conheça o treinamento e veja se ele faz sentido para a sua oficina. Se durante esse período entender que o treinamento não é para você, basta solicitar o reembolso.</p><p>Nós devolvemos 100% do valor investido. Sem burocracia. Sem risco.</p></div>
          </div>
        </div>
      </section>

      <section className={styles.about}>
        <div className={styles.shell}>
          <div className={styles.aboutGrid}>
            <div className={`${styles.aboutImage} ${styles.reveal}`}><Image src="/diego.jpeg" alt="Diego Mensor, especialista em gestão de oficinas" width={800} height={800} sizes="(max-width: 800px) 100vw, 45vw" /><span><strong>24+</strong> anos dentro de oficina</span></div>
            <div className={`${styles.aboutCopy} ${styles.reveal}`}><span className={styles.index}>09 — Quem é Diego Mensor?</span><h2>Diego Mensor</h2><p>São mais de 24 anos vivendo a realidade das oficinas e 14 anos como proprietário.</p><p>Depois de enfrentar desafios como falta de processos, sobrecarga, dificuldades na gestão da equipe e crescimento desorganizado, Diego estruturou um método baseado na prática, documentando tudo aquilo que realmente funciona dentro de uma oficina.</p><p>Hoje esse conhecimento está reunido no Oficina de Alta Performance para ajudar outros donos de oficina a organizarem suas operações, aumentarem a lucratividade e construírem empresas menos dependentes do proprietário.</p><div><span><strong>24</strong> anos de experiência</span><span><strong>14</strong> anos como proprietário</span></div></div>
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
