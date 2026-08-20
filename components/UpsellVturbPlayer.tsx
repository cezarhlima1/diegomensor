"use client";

import React from "react";
import Script from "next/script";

const PLAYER_ID = "6a8709fc5ad4bda4d2f019df";
const PLAYER_SRC =
  "https://scripts.converteai.net/b809ca06-75c2-4eba-ae57-2f6bbda7e885/players/6a8709fc5ad4bda4d2f019df/v4/player.js";

export default function UpsellVturbPlayer() {
  return (
    <>
      {React.createElement(
        "vturb-smartplayer",
        {
          id: `vid-${PLAYER_ID}`,
          style: { display: "block", margin: "0 auto", width: "100%" },
        },
        <div
          className="vturb-player-placeholder"
          style={{
            position: "relative",
            width: "100%",
            padding: "56.25% 0 0",
            zIndex: 0,
            backgroundColor: "black",
          }}
        />,
      )}
      <Script
        id={`scr-vturb-${PLAYER_ID}`}
        src={PLAYER_SRC}
        strategy="afterInteractive"
      />
    </>
  );
}
