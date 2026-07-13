/** Barrinha de progresso (lote quase esgotando) usada abaixo dos CTAs da Imersão DESTRAVE.
 *  Enche de 0% até `percent` quando entra na tela (ver .dest-bar-fill em globals.css). */
export default function DestravePriceBar({
  label,
  percent = 75,
  align = "center",
}: {
  label: string;
  percent?: number;
  align?: "center" | "left";
}) {
  const isLeft = align === "left";
  const offerLabel = label.match(/^(.*) \| De: (R\$[\d.,]+) por (R\$[\d.,]+)$/);
  return (
    <div
      className={`reveal w-full max-w-[360px] mt-4 ${isLeft ? "" : "mx-auto"}`}
      style={{ "--dest-bar-w": `${percent}%` } as React.CSSProperties}
    >
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div className="dest-bar-fill h-full rounded-full bg-[linear-gradient(90deg,var(--color-blue-soft),var(--color-blue))]" />
      </div>
      {offerLabel ? (
        <p className={`font-mono text-[11.5px] text-white mt-2 tracking-[.03em] ${isLeft ? "text-left" : "text-center"}`}>
          {offerLabel[1]} | De: <s>{offerLabel[2]}</s> por {offerLabel[3]}
        </p>
      ) : (
        <p className={`font-mono text-[11.5px] text-muted mt-2 tracking-[.03em] ${isLeft ? "text-left" : "text-center"}`}>
          {label}
        </p>
      )}
    </div>
  );
}
