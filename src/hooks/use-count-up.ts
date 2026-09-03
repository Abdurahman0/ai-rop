"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up once its real value has arrived. Stays at the final value
 * when motion is reduced, and never animates a value the user has already seen.
 */
export function useCountUp(value: number, active: boolean, reduced = false, duration = 700) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!active || reduced) return;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out: fast first, settles on the number
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(Math.round(origin + (value - origin) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, duration, reduced, value]);

  // Reduced motion (and the not-ready state) are derived, never set in an effect.
  if (!active) return 0;
  return reduced ? value : shown;
}
