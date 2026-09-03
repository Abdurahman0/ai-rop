"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/i18n/use-t";

export type Option = { label: string; value: string };

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="flex h-10 min-w-36 max-w-full items-center justify-between gap-3 rounded-md border border-border bg-card px-3 text-sm text-foreground transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="shrink-0 whitespace-nowrap text-muted-foreground">{label}:</span>
        <span className="truncate">{selected?.label ?? t("common.all")}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 w-56 animate-[toast-in_var(--motion-fast)_ease-out] rounded-lg border border-border bg-card p-1 shadow-xl" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`flex w-full break-words rounded-md px-3 py-2 text-left text-sm transition duration-[var(--motion-fast)] hover:bg-muted ${option.value === value ? "text-primary" : "text-foreground"}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
