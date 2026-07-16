"use client";

import { useEffect, useState } from "react";
import Cta from "./Cta";

const REVEAL_AT_SECONDS = 20;

/* API real do smartplayer (ConverteAI/VTurb), confirmada no fonte do player:
   window.smartplayer.instances[] são preenchidos no evento "player:ready" e
   cada instância expõe on("timeupdate", cb), onde cb recebe o tempo de
   reprodução em segundos. É o único evento suportado por instance.on(). */
type SmartPlayerInstance = {
  on?: (event: "timeupdate", cb: (time: number) => void) => void;
};
declare global {
  interface Window {
    smartplayer?: { instances?: SmartPlayerInstance[] };
  }
}

/* O CTA só aparece depois de 20s de vídeo já rodando. Usamos o tempo de
   reprodução (timeupdate) em vez de um timer de relógio: assim o contador só
   avança enquanto o vídeo realmente toca. */
export default function DelayedCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const reveal = (time: number) => {
      if (time >= REVEAL_AT_SECONDS) setVisible(true);
    };

    // As instâncias só existem após o player.js carregar e disparar
    // "player:ready"; fazemos polling curto até elas aparecerem.
    const poll = setInterval(() => {
      const instances = window.smartplayer?.instances;
      if (!instances?.length) return;
      instances.forEach((inst) => inst.on?.("timeupdate", reveal));
      clearInterval(poll);
    }, 400);

    // Para de procurar caso o player nunca carregue.
    const stop = setTimeout(() => clearInterval(poll), 60_000);

    return () => {
      clearInterval(poll);
      clearTimeout(stop);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="cta-reveal flex flex-col items-center gap-[14px] mt-12">
      <Cta variant="lg">
        Quero aprender a cobrar certo
      </Cta>
      <span className="reassure">
        Parcelável • <b>Acesso imediato</b> • Garantia 7 dias
      </span>
    </div>
  );
}
