"use client";

import { useState } from "react";
import { destraveFaqs } from "./copy";

export default function DestraveFaq({ scheduleAnswer, items = destraveFaqs }: { scheduleAnswer?: string; items?: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap max-w-[820px]">
        <div className="text-center">
          <span className="tag">Perguntas frequentes</span>
          <h2 className="section-title mt-[18px] mx-auto">
            Ficou alguma <span className="text-dest-accent">dúvida?</span>
          </h2>
        </div>

        <div className="grid gap-3 mt-10">
          {items.map((item, i) => {
            const isOpen = open === i;
            const answer = i === 1 && scheduleAnswer ? scheduleAnswer : item.a;
            return (
              <div key={i} className={`faq-item ${isOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`destrave-faq-answer-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {item.q}
                  <span className="faq-ic" aria-hidden="true" />
                </button>
                <div
                  id={`destrave-faq-answer-${i}`}
                  className="faq-answer"
                  aria-hidden={!isOpen}
                >
                  <div className="overflow-hidden">
                    <p className="px-[22px] pb-[22px] text-muted text-[15.5px]">{answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
