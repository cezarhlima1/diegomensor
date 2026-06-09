"use client";

import React from "react";
import Script from "next/script";

/* Player VSL da ConverteAI/VTurb.
   O player.js faz o "upgrade" do elemento <vturb-smartplayer id="vid-...">.
   IDs vêm do embed fornecido pela conta. */
const ACCOUNT = "b809ca06-75c2-4eba-ae57-2f6bbda7e885";
const PLAYER = "6a282ada1bc96b19a568dcc5";

export default function VturbPlayer() {
  return (
    <>
      {/* createElement evita o atrito de tipar um custom element no JSX/TS */}
      {React.createElement("vturb-smartplayer", {
        id: `vid-${PLAYER}`,
        style: { display: "block", margin: "0 auto", width: "100%" },
      })}
      <Script
        id="scr-vturb-player"
        strategy="afterInteractive"
        src={`https://scripts.converteai.net/${ACCOUNT}/players/${PLAYER}/v4/player.js`}
      />
    </>
  );
}
