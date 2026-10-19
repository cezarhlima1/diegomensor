import Cta from "./Cta";
import styles from "./section-cta.module.css";

export default function SectionCta() {
  return (
    <div className={styles.container}>
      <Cta variant="compact">Quero aprender a cobrar certo</Cta>
    </div>
  );
}
