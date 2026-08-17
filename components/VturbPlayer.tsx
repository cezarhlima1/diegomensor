"use client";

import React from "react";
import Script from "next/script";

/* Teste A/B da ConverteAI/VTurb.
   O player.js escolhe a variante e faz o upgrade deste custom element. */
const ACCOUNT = "b809ca06-75c2-4eba-ae57-2f6bbda7e885";
const AB_TEST = "6a80c349640c4e8507945843";

export default function VturbPlayer() {
  return (
    <>
      {/* createElement evita o atrito de tipar um custom element no JSX/TS */}
      {React.createElement("vturb-smartplayer", {
        id: `ab-${AB_TEST}`,
        style: { display: "block", margin: "0 auto", width: "100%" },
      })}
      <Script
        id="scr-vturb-player"
        strategy="afterInteractive"
        src={`https://scripts.converteai.net/${ACCOUNT}/ab-test/${AB_TEST}/player.js`}
      />
    </>
  );
}
