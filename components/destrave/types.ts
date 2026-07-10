/** Tipos do conteúdo (copy) das páginas de captura da Imersão DESTRAVE. */

export type HeadlineSegment = { text: string; blue?: boolean };

export type DestraveCopy = {
  eventLine: string;
  headline: HeadlineSegment[];
  bulletsIntro: string;
  bullets: string[];
  ctaLabel: string;
  priceBarLabel: string;
  block2: {
    title: string;
    intro: string;
    checks: string[];
  };
  block3: {
    title: string;
    ctaLabel: string;
  };
  authorBlock: {
    title: string;
    paragraph: string;
    ctaLabel: string;
  };
  finalBlock: {
    heading: string;
    items: string[];
    priceOld: string;
    priceNew: string;
    priceNote: string;
    ctaLabel: string;
    priceBarLabel: string;
  };
};
