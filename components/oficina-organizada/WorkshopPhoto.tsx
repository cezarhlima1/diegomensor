"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./oficina-organizada.module.css";

export default function WorkshopPhoto({ number, alt, caption, priority = false, sizes = "(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 46vw, 550px" }: {
  number: number; alt: string; caption: string; priority?: boolean; sizes?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const src = `/oficina-organizada/fotoquadro${number}.webp`;
  const dimensions = [[1661,947],[1609,978],[1643,957],[1644,957],[1679,937],[1668,943]][number - 1];
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    let previousOverflow: string | undefined;
    const restoreScroll = () => {
      if (previousOverflow !== undefined) {
        document.body.style.overflow = previousOverflow;
        previousOverflow = undefined;
      }
    };
    const syncScroll = () => {
      if (modal.open && previousOverflow === undefined) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      } else if (!modal.open) restoreScroll();
    };
    const observer = new MutationObserver(syncScroll);
    observer.observe(modal, { attributes: true, attributeFilter: ["open"] });
    return () => { observer.disconnect(); restoreScroll(); };
  }, []);
  return <figure className={styles.workshopPhoto}>
    <button type="button" className={styles.photoButton} onClick={() => dialog.current?.showModal()} aria-label={`Ampliar foto: ${alt}`} aria-haspopup="dialog">
      <Image src={src} alt={alt} width={dimensions[0]} height={dimensions[1]} sizes={sizes} priority={priority} />
      <span className={styles.expandPhoto}>Ampliar foto <span aria-hidden="true">↗</span></span>
    </button>
    <figcaption>{caption}</figcaption>
    <dialog ref={dialog} className={styles.photoDialog} aria-label={alt} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className={styles.dialogBar}><span>OFICINA ORGANIZADA</span><button type="button" onClick={() => dialog.current?.close()} aria-label="Fechar foto ampliada" autoFocus>Fechar <span aria-hidden="true">×</span></button></div>
      <div className={styles.zoomPhoto}><img src={src} alt={alt} width={dimensions[0]} height={dimensions[1]} loading="lazy" /></div>
      <p>{caption}</p>
    </dialog>
  </figure>;
}
