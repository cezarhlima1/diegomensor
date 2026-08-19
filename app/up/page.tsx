import type { Metadata } from "next";
import styles from "./up.module.css";

export const metadata: Metadata = {
  title: "Condição exclusiva | Calculadora de Precificação",
  description: "Adicione a Calculadora de Precificação ao seu treinamento.",
  robots: { index: false, follow: false },
};

// Substitua pelos links definitivos quando os vídeos e o checkout estiverem prontos.
const VSL_URL = "";

const deliverables = [
  "Dois acessos: um para o dono e outro para o funcionário",
  "CRM para gestão e acompanhamento dos orçamentos",
  "Cálculo de peças de forma automática e padronizada",
  "Orçamento com os dados do cliente e mensagem pronta para envio",
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
          <div className={styles.approved}><span>✓</span> Sua compra foi aprovada!</div>
          <p className={styles.exclusive}>Você acaba de liberar uma condição exclusiva</p>
          <h1>A ferramenta que vai mudar a forma como você faz orçamentos na sua oficina.</h1>
          <p className={styles.promise}>Assista ao vídeo abaixo e veja como ela funciona.</p>
          <VideoFrame url={VSL_URL} label="Apresentação da Calculadora de Precificação" />
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
          <button className={styles.primaryCta} type="button">Quero agilizar e padronizar meus orçamentos!</button>
        </div>
      </section>

    </main>
  );
}
