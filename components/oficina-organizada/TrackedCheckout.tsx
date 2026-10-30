"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { useClock } from "./Experience";
import { ATTRIBUTION_STORAGE_KEY, extractTracking, getCheckoutUrl, mergeAttribution, type Tracking } from "./checkout";
import styles from "./oficina-organizada.module.css";

function readBrowserTracking(fallback: Tracking): Tracking {
  const current = extractTracking(new URLSearchParams(window.location.search));
  let previous = fallback;
  try {
    const saved = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (saved) previous = extractTracking(new URLSearchParams(saved));
  } catch { /* The URL still works when browser storage is blocked. */ }
  const tracking = mergeAttribution(current, previous);
  try {
    const params = new URLSearchParams();
    for (const [key,value] of Object.entries(tracking)) if (value) params.set(key,value);
    if (params.size) window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, params.toString());
  } catch { /* Keep attribution in React state when storage is unavailable. */ }
  return tracking;
}

export default function TrackedCheckout({ initialTime, initialTracking, children }: {
  initialTime: number; initialTracking: Tracking; children: ReactNode;
}) {
  const now = useClock(initialTime);
  const [tracking, setTracking] = useState(initialTracking);
  useEffect(() => { setTracking(readBrowserTracking(initialTracking)); }, [initialTracking]);
  const refreshDestination = (event: MouseEvent<HTMLAnchorElement>) => {
    // Re-evaluate at the actual click too, including a tab kept open across
    // a lot boundary. Native link behavior (new tabs included) is preserved.
    const latestTracking = readBrowserTracking(tracking);
    event.currentTarget.href = getCheckoutUrl(Date.now(), latestTracking);
  };
  return <a className={styles.cta} href={getCheckoutUrl(now, tracking)} onClick={refreshDestination} onAuxClick={refreshDestination}>
    {children}<ArrowRight aria-hidden="true" className={styles.ctaArrow} />
  </a>;
}
