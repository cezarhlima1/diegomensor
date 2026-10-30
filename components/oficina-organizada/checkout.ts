import { getLotIndex, lots } from "./event-config";

export const trackingKeys = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
  "fbclid", "gclid", "ttclid", "msclkid",
] as const;
export type Tracking = Partial<Record<(typeof trackingKeys)[number], string>>;
export const ATTRIBUTION_STORAGE_KEY = "oficina-organizada:attribution:v1";

// Literal checkout URLs supplied by the user. Do not rebuild these URLs or
// append parameters: spelling, capitalization and encoding are intentional.
export const checkoutLinks: Record<string, readonly [string, string, string]> = {
  instagram: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Storie&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Stories&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Storie&b_id_1=201423&b_offer_1=DQqf2S&b_id_2=201377&b_offer_2=ezTzvW&b_id_3=201432&b_offer_3=BlsB7I",
  ],
  manychat: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Manychat&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Manychat&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Manychat&b_id_1=201423&b_offer_1=DQqf2S&b_id_2=201377&b_offer_2=ezTzvW&b_id_3=201432&b_offer_3=BlsB7I",
  ],
  meta: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Campanha+de+tr%C3%A1fego&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Campanha+de+tr%C3%A1fego&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Campanha+de+tr%C3%A1fego&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
  ],
  whatsapp: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+WhatsApp&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Whatsapp&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Whatsapp&b_id_1=201377&b_offer_1=ezTzvW&b_id_2=201423&b_offer_2=DQqf2S&b_id_3=201432&b_offer_3=BlsB7I",
  ],
};

export function extractTracking(params: Pick<URLSearchParams, "get">): Tracking {
  const tracking: Tracking = {};
  for (const key of trackingKeys) {
    const value = params.get(key);
    if (value?.trim()) tracking[key] = value;
  }
  return tracking;
}

// A newly tagged visit wins over earlier attribution. A plain reload/return
// keeps the attribution from this browser tab rather than relabeling it.
export function mergeAttribution(current: Tracking, previous: Tracking): Tracking {
  return trackingKeys.some(key => key.startsWith("utm_") && current[key])
    ? current
    : { ...previous, ...current };
}

export function getCheckoutUrl(now: number, tracking: Tracking): string {
  const index = getLotIndex(now);
  const source = tracking.utm_source?.trim().toLowerCase();
  const links = source && Object.hasOwn(checkoutLinks, source) ? checkoutLinks[source] : undefined;
  if (links && index >= 1) return links[index - 1];
  const url = new URL(lots[index].checkoutUrl);
  for (const key of trackingKeys) {
    const value = tracking[key];
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}
