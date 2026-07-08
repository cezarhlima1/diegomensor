import type { Metadata } from "next";
import FacebookPixel from "@/components/FacebookPixel";
import ClarityScript from "@/components/ClarityScript";
import VturbPlayer from "@/components/VturbPlayer";
import ExpiryBanner from "@/components/ExpiryBanner";
import BackRedirect from "@/components/BackRedirect";

const ACCOUNT = "b809ca06-75c2-4eba-ae57-2f6bbda7e885";
const PLAYER = "6a282ada1bc96b19a568dcc5";
const MEDIA = "6a282a878a83ed8548b9f7d9";

export const metadata: Metadata = {
  title: "Assista agora - Precificação para Oficinas | Diego Mensor",
  description:
    "Em poucos minutos você entende quanto sua oficina realmente custa, quanto deveria cobrar e onde está deixando dinheiro na mesa. Assista ao vídeo.",
};

export default function V1() {
  return (
    <>
      <FacebookPixel />
      <ClarityScript projectId="xjetvzvdqx" />
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
      {/* back-redirect carregando UTMs */}
      <BackRedirect />

      <main className="min-h-screen flex flex-col items-center justify-center py-16 lg:py-24">
        <div className="wrap max-w-[920px] text-center flex flex-col items-center">
          <h1
            className="font-display font-black text-[clamp(22px,3.4vw,36px)] mt-2 mb-4 max-w-[26ch] text-blue"
          >
            Por que você trabalha igual um condenado na oficina… mas o dinheiro
            nunca sobra de verdade?
          </h1>

          <p className="text-muted text-[clamp(14px,1.4vw,17px)] max-w-[54ch] mb-6">
            Descubra a principal trava invisível que mantém donos de oficina
            presos no operacional e faz o dinheiro sumir no fim do mês.
          </p>

          {/* player VSL */}
          <div className="w-full max-w-[820px] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow)] ring-1 ring-line">
            <VturbPlayer />
          </div>
        </div>
      </main>
    </>
  );
}
