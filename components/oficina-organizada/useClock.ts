"use client";

import { useEffect, useState } from "react";

export function useClock(initialTime: number) {
  const [now, setNow] = useState(initialTime);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, []);
  return now;
}
