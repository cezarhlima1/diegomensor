import Image from "next/image";
import styles from "./oficina-organizada.module.css";

export default function WorkshopPhoto({ number, alt, caption = "", priority = false, focusBoard = false, sizes = "(max-width: 767px) 100vw, 550px" }: {
  number: number; alt: string; caption?: string; priority?: boolean; focusBoard?: boolean; sizes?: string;
}) {
  const dimensions = [[1661,947],[1609,978],[1643,957],[1644,957],[1679,937],[1668,943]][number - 1];
  return <figure className={`${styles.workshopPhoto} ${focusBoard ? styles.focusBoard : ""}`}>
    <Image src={`/oficina-organizada/fotoquadro${number}.webp`} alt={alt} width={dimensions[0]} height={dimensions[1]} sizes={sizes} priority={priority} />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
