"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Anchors a floating panel to a trigger with fixed positioning, flipping it up
 * when space below is short. Fixed + portal is what lets a menu escape a
 * scroll container (a table's overflow-x-auto clips an absolute panel).
 */
export function useAnchoredPanel(open: boolean, close: () => void, width = 320) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight ?? 240;
    const below = window.innerHeight - rect.bottom;
    const top = below < height + 12 && rect.top > height + 12 ? rect.top - height - 8 : rect.bottom + 8;
    // right-aligned to the trigger, then clamped inside the viewport
    const desired = Math.max(rect.left, rect.right - Math.max(width, rect.width));
    const left = Math.min(Math.max(8, desired), window.innerWidth - width - 8);
    setPosition({ top, left });
  }, [width]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [close, open, place]);

  return { triggerRef, panelRef, position };
}
