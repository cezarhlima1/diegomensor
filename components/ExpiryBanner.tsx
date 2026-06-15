"use client";

import { useEffect, useState } from "react";

/* Barra de urgência no topo. A data é sempre "hoje" — calculada no cliente
   após a montagem para refletir o dia atual em qualquer acesso (a página é
   estática, então computar no servidor congelaria a data no build). */
export default function ExpiryBanner() {
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  return (
    <div
      role="status"
      className="sticky top-0 z-50 w-full bg-brand-red text-white text-center px-4 py-2.5 text-[12.5px] sm:text-[13.5px] font-medium tracking-[.01em] shadow-[0_8px_30px_-12px_rgba(0,0,0,.6)]"
    >
      <span className="dot mr-2 align-middle" />
      Atenção: este conteúdo fica no ar somente até hoje
      {today && (
        <>
          {", "}
          <b className="font-bold whitespace-nowrap">{today}</b>
        </>
      )}
      .
    </div>
  );
}
