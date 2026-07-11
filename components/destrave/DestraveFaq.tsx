"use client";

import { useState } from "react";
import { destraveFaqs } from "./copy";

export default function DestraveFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-[72px] md:py-24">
      <div className="wrap max-w-[820px]">
        <div className="text-center">
          <span className="tag reveal">Perguntas frequentes</span>
          <h2 className="section-title reveal d1 mt-[18px] mx-auto">
            Ficou alguma <span className="text-dest-accent">dúvida?</span>
          </h2>
        </div>

        <div className="grid gap-3 mt-10">
          {destraveFaqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`faq-item reveal d${Math.min(Math.floor(i / 2) + 1, 3)} ${isOpen ? "open" : ""}`}>
                <button
                  className="faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  {item.q}
                  <span className="faq-ic" aria-hidden="true" />
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-[22px] pb-[22px] text-muted text-[15.5px]">{item.a}</p>
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
