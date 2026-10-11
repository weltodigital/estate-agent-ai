"use client";

import { useEffect, useState } from "react";

/**
 * The reveal (UX spec section 4): counts a number up from 0 once, when a
 * scan has only just finished. Reduced motion shows the value straight away.
 */
export function CountUp({ value, animate, durationMs = 900 }: { value: number; animate: boolean; durationMs?: number }) {
  const [shown, setShown] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setShown(Math.round(value * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, animate, durationMs]);

  return <span className="tabular-nums">{shown}</span>;
}
