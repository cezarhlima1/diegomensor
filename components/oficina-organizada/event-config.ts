export const lots = [
  { label: "LOTE ZERO", price: 19.9, startsAt: "2026-10-26T00:00:00-03:00", endsAt: "2026-10-27T23:59:59-03:00" },
  { label: "PRIMEIRO LOTE", price: 37, startsAt: "2026-10-28T00:00:00-03:00", endsAt: "2026-11-03T23:59:59-03:00" },
  { label: "SEGUNDO LOTE", price: 47, startsAt: "2026-11-04T00:00:00-03:00", endsAt: "2026-11-12T23:59:59-03:00" },
  { label: "TERCEIRO LOTE • PREÇO FINAL", price: 57, startsAt: "2026-11-13T00:00:00-03:00", endsAt: "2026-11-25T19:00:00-03:00" },
] as const;
export function getLotIndex(now: number) {
  for (let i = lots.length - 1; i >= 0; i--) if (now >= Date.parse(lots[i].startsAt)) return i;
  return 0;
}
export const formatPrice = (price: number) => price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
