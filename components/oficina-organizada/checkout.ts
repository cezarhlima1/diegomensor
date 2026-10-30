import { getLotIndex, lots } from "./event-config";

export const trackingKeys = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
  "fbclid", "gclid", "ttclid", "msclkid",
] as const;
export type Tracking = Partial<Record<(typeof trackingKeys)[number], string>>;
export const ATTRIBUTION_STORAGE_KEY = "oficina-organizada:attribution:v1";

// Keep the checkout labels supplied for each source and lot.
const checkoutMediums: Record<string, readonly [string, string, string]> = {
  instagram: ["PV - Storie", "PV - Stories", "PV - Storie"],
  manychat: ["PV - Manychat", "PV - Manychat", "PV - Manychat"],
  meta: ["PV - Campanha de tráfego", "PV - Campanha de tráfego", "PV - Campanha de tráfego"],
  whatsapp: ["PV - WhatsApp", "PV - Whatsapp", "PV - Whatsapp"],
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
  const url = new URL(lots[index].checkoutUrl);
  for (const key of trackingKeys) {
    const value = tracking[key];
    if (value) url.searchParams.set(key, value);
  }
  const source = tracking.utm_source?.trim().toLowerCase();
  const mediums = source && Object.hasOwn(checkoutMediums, source) ? checkoutMediums[source] : undefined;
  if (mediums) url.searchParams.set("utm_medium", mediums[Math.max(0, index - 1)]);
  return url.toString();
}
