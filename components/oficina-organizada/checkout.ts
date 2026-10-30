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
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Storie",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Stories",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Storie",
  ],
  manychat: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Manychat",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Manychat",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Manychat",
  ],
  meta: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+Campanha+de+tr%C3%A1fego",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Campanha+de+tr%C3%A1fego",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Campanha+de+tr%C3%A1fego",
  ],
  whatsapp: [
    "https://payfast.greenn.com.br/200537/offer/uEHm9j?utm_medium=PV+-+WhatsApp",
    "https://payfast.greenn.com.br/200537/offer/fTygOH?utm_medium=PV+-+Whatsapp",
    "https://payfast.greenn.com.br/200537/offer/7CnUfU?utm_medium=PV+-+Whatsapp",
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
