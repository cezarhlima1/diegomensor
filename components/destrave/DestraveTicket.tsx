import { Lock } from "@/components/icons";

/** Visual de "ingresso" (ticket) picotado — reforça que a oferta é um lote limitado de vagas. */
export default function DestraveTicket({
  eventLine,
  priceOld,
  priceNew,
}: {
  eventLine: string;
  priceOld: string;
  priceNew: string;
}) {
  return (
    <div className="reveal d3 mx-auto max-w-[380px] lg:mr-0 lg:ml-auto">
      <div
        className="relative rounded-[10px] border border-[rgba(180,199,212,.4)] bg-[linear-gradient(165deg,#232c33,var(--color-card))] shadow-[0_30px_70px_-24px_rgba(0,0,0,.6)] overflow-hidden"
        data-glow
      >
        <span className="pointer-glow" aria-hidden="true" />

        <div className="relative z-[1] px-7 pt-8 pb-6 text-center">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[.28em] uppercase text-blue">
            <Lock className="w-[11px] h-[11px]" /> Ingresso · Imersão
          </span>
          <div className="dest-wordmark text-[32px] mt-1.5 leading-none">DESTRAVE</div>
          <div className="font-mono text-[11px] text-muted mt-3 leading-relaxed">{eventLine}</div>
        </div>

        {/* picote */}
        <div className="relative h-0 border-t border-dashed border-[rgba(143,178,204,.35)]">
          <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-bg" aria-hidden="true" />
          <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-bg" aria-hidden="true" />
        </div>

        <div className="relative z-[1] px-7 py-7 text-center">
          <div className="font-mono text-[12px] text-muted">
            de <s className="[text-decoration-color:var(--color-brand-red)]">{priceOld}</s> por
          </div>
          <div className="dest-ticket-price font-display font-black text-[44px] leading-none mt-1">
            {priceNew}
          </div>
          <div className="font-mono text-[10px] tracking-[.18em] uppercase text-muted-dim mt-3">
            01 vaga · acesso imediato
          </div>
        </div>
      </div>
    </div>
  );
}
