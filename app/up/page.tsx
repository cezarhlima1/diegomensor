import type { Metadata } from "next";
import styles from "./up.module.css";

export const metadata: Metadata = {
  title: "Condição exclusiva | Calculadora de Precificação",
  description: "Adicione a Calculadora de Precificação ao seu treinamento.",
  robots: { index: false, follow: false },
};

// Substitua pelos links definitivos quando os vídeos e o checkout estiverem prontos.
const VSL_URL = "";
const DEMO_URL = "";
const CHECKOUT_URL = "#oferta";
const CONTINUE_URL = "/conta";

const deliverables = [
  "Calculadora pronta para usar",
  "Campos da oficina já estruturados",
  "Cálculo da hora técnica",
  "Custos considerados no cálculo",
  "Margem e lucro",
  "Atualização sempre que os números da oficina mudarem",
];

function VideoFrame({ url, label }: { url: string; label: string }) {
  return (
    <div className={styles.videoFrame}>
      {url ? (
        <iframe
          src={url}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className={styles.videoPlaceholder}>
          <span className={styles.play} aria-hidden="true">▶</span>
          <strong>{label}</strong>
          <small>O vídeo será inserido aqui</small>
        </div>
      )}
    </div>
  );
}

export default function UpsellPage() {
  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.warningBar}>Espera! Não fecha a página.</div>

      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.approved}><span>✓</span> Compra aprovada</div>
          <h1>Eu vou te dar o acesso exclusivo a uma ferramenta que vai mudar a forma como você faz orçamentos dentro da sua oficina.</h1>
          <p className={styles.promise}>Assista ao vídeo rápido abaixo para conhecer a ferramenta.</p>
          <VideoFrame url={VSL_URL} label="Apresentação da Calculadora de Precificação" />
          <a className={styles.primaryCta} href="#oferta">Sim, quero adicionar a calculadora</a>
          <p className={styles.microcopy}>Acesso imediato após a confirmação.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.demoSection}`}>
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>Veja funcionando</span>
          <h2>Sem promessa complicada. <em>Olha como funciona na prática.</em></h2>
          <p className={styles.lead}>Tu preenche os números da oficina, a ferramenta processa as informações e mostra o cálculo que precisa.</p>
          <VideoFrame url={DEMO_URL} label="Demonstração prática da calculadora" />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.wrap}>
          <span className={styles.eyebrow}>Tudo que tu recebe</span>
          <h2>Ao adicionar a calculadora ao teu pedido, <em>isso entra no teu acesso:</em></h2>
          <div className={styles.deliverables}>
            {deliverables.map((item) => <div key={item}><span>✓</span><p>{item}</p></div>)}
          </div>
          <p className={styles.closing}>Menos tempo quebrando a cabeça com conta. Mais segurança para aplicar o preço certo na tua oficina.</p>
        </div>
      </section>

      <section className={`${styles.section} ${styles.offerSection}`} id="oferta">
        <div className={styles.offer}>
          <div className={styles.offerBadge}>Condição exclusiva desta página</div>
          <p className={styles.offerReason}>Como tu acabou de entrar no treinamento de Precificação, agora pode adicionar a calculadora por um valor especial.</p>
          <p className={styles.from}>Valor normal: <s>R$ 697</s></p>
          <p className={styles.today}>Hoje</p>
          <div className={styles.price}>R$ 497</div>
          <p className={styles.payment}>Condição disponível somente nesta página.</p>
          <a className={styles.primaryCta} href={CHECKOUT_URL}>Sim, quero adicionar a calculadora ao meu acesso</a>
          <p className={styles.microcopy}>Acesso imediato após a confirmação.</p>
          <a className={styles.decline} href={CONTINUE_URL}>Não, obrigado. Quero continuar apenas com o treinamento.</a>
        </div>
      </section>
    </main>
  );
}
