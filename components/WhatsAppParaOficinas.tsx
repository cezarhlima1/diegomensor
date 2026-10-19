import SectionCta from "./SectionCta";
import { WhatsApp } from "./icons";
import styles from "./whatsapp-para-oficinas.module.css";

const message = "Olá! Vim pela página Precificação para Oficinas e gostaria de tirar uma dúvida antes de entrar no treinamento.";
const whatsappUrl = `https://wa.me/554792709538?text=${encodeURIComponent(message)}`;

export default function WhatsAppParaOficinas() {
  return (
    <section aria-labelledby="whatsapp-title" className="py-[72px] md:py-24">
      <div className="wrap text-center">
        <h2 id="whatsapp-title" className="section-title mx-auto max-w-[30ch]">
          Ainda ficou com alguma dúvida?
        </h2>
        <p className="mx-auto mt-5 max-w-[50ch] text-[18px] leading-[1.7]">
          Fala com a nossa equipe no WhatsApp e pergunta o que precisar antes de entrar.
        </p>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.button}>
          <WhatsApp className="h-6 w-6 shrink-0" />
          FALAR COM A EQUIPE NO WHATSAPP
        </a>
        <SectionCta />
      </div>
    </section>
  );
}
