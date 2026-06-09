import type { Metadata } from "next";
import { Logo } from "@/components/icons";
import VturbPlayer from "@/components/VturbPlayer";
import ExpiryBanner from "@/components/ExpiryBanner";
import DelayedCta from "@/components/DelayedCta";

const ACCOUNT = "b809ca06-75c2-4eba-ae57-2f6bbda7e885";
const PLAYER = "6a282ada1bc96b19a568dcc5";
const MEDIA = "6a282a878a83ed8548b9f7d9";

export const metadata: Metadata = {
  title: "Assista agora — Precificação para Oficinas | Diego Mensor",
  description:
    "Em poucos minutos você entende quanto sua oficina realmente custa, quanto deveria cobrar e onde está deixando dinheiro na mesa. Assista ao vídeo.",
};

export default function V1() {
  return (
    <>
      {/* Preload/prefetch do player VSL — o React 19 eleva estas tags ao <head>.
         Espelha o snippet de performance do embed da ConverteAI. */}
      <link
        rel="preload"
        as="script"
        href={`https://scripts.converteai.net/${ACCOUNT}/players/${PLAYER}/v4/player.js`}
      />
      <link
        rel="preload"
        as="script"
        href="https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js"
      />
      <link
        rel="preload"
        as="fetch"
        crossOrigin="anonymous"
        href={`https://cdn.converteai.net/${ACCOUNT}/${MEDIA}/main.m3u8`}
      />
      <link rel="dns-prefetch" href="https://cdn.converteai.net" />
      <link rel="dns-prefetch" href="https://scripts.converteai.net" />
      <link rel="dns-prefetch" href="https://images.converteai.net" />
      <link rel="dns-prefetch" href="https://license.vturb.com" />

      <ExpiryBanner />

      <main className="min-h-screen flex flex-col items-center justify-center py-16 lg:py-24">
        <div className="wrap max-w-[920px] text-center flex flex-col items-center">
          {/* marca discreta — VSL distraction-free, sem nav completa */}
          <a
            href="/"
            className="brand inline-flex items-center gap-[11px] font-display font-extrabold text-base tracking-[-.01em] mb-10"
          >
            <span className="brand-mark">
              <Logo className="w-[18px] h-[18px]" />
            </span>
            <span>
              Precificação para Oficinas
              <small className="block font-mono font-medium text-[10px] tracking-[.14em] text-muted uppercase">
                by Diego Mensor
              </small>
            </span>
          </a>

          <span className="hero-badge">
            <span className="dot" />
            Assista antes que a oferta saia do ar
          </span>

          <h1 className="font-display font-black text-[clamp(28px,4.6vw,52px)] my-6 max-w-[20ch]">
            O vídeo que mostra onde sua oficina está{" "}
            <span className="text-blue">deixando dinheiro na mesa</span>.
          </h1>

          <p className="text-muted text-[clamp(15px,1.6vw,19px)] max-w-[52ch] mb-10">
            Dê o play e descubra, em poucos minutos, quanto custa manter a oficina
            aberta e quanto você realmente deveria estar cobrando.
          </p>

          {/* player VSL */}
          <div className="w-full max-w-[820px] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow)] ring-1 ring-line">
            <VturbPlayer />
          </div>

          {/* CTA aparece só 20s após o vídeo começar a tocar */}
          <DelayedCta />
        </div>
      </main>
    </>
  );
}
