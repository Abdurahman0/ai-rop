"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { useAnchoredPanel } from "@/hooks/use-anchored-panel";

export type Option = { label: string; value: string };

export function Select({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  /** Drops the "Label:" prefix — for use inside a column that already names it. */
  hideLabel?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPanel(open, close, 224);
  const selected = options.find((option) => option.value === value);

  // Starts on the selected option; only a keypress or hover moves it, so it is
  // derived rather than synced in an effect.
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const cursor = highlight ?? selectedIndex;

  // Arrow keys move the highlight, Enter commits — a menu you can drive from
  // the keyboard, not only the mouse.
  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        setHighlight(null);
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((current) => ((current ?? selectedIndex) + step + options.length) % options.length);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = options[cursor];
      if (option) onChange(option.value);
      setOpen(false);
    }
    if (event.key === "Escape") setOpen(false);
  }

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          // fixed + portal: an absolute panel is clipped by any scrolling
          // ancestor, and a table cell usually has one
          <div
            ref={panelRef}
            className="fixed z-[60] w-56 animate-[dropdown-in_var(--motion-fast)_var(--motion-ease)] rounded-lg border border-border bg-card p-1 shadow-xl"
            style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, visibility: position ? "visible" : "hidden" }}
            role="listbox"
            aria-label={label}
          >
            {options.map((option, index) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full items-center justify-between gap-3 break-words rounded-md px-3 py-2 text-left text-sm transition duration-[var(--motion-fast)] ${
                    index === cursor ? "bg-muted" : ""
                  } ${active ? "text-primary" : "text-foreground"}`}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="flex h-10 min-w-36 max-w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => setOpen((state) => !state)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={hideLabel ? label : undefined}
      >
        {hideLabel ? null : <span className="shrink-0 whitespace-nowrap text-muted-foreground">{label}:</span>}
        <span className="truncate">{selected?.label ?? t("common.all")}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition duration-[var(--motion-fast)] ${open ? "rotate-180" : ""}`} />
      </button>
      {panel}
    </>
  );
}
