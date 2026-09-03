"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { locales, type Locale } from "@/i18n/dictionaries";
import { useLocale, useT } from "@/i18n/use-t";
import { Flag } from "./flags";

const languageMeta: Record<Locale, { nameKey: string }> = {
  en: { nameKey: "language.enName" },
  ru: { nameKey: "language.ruName" },
  uz: { nameKey: "language.uzName" },
};

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = languageMeta[locale];

  useEffect(() => {
    const handlePointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (!open) return;
      const currentIndex = locales.indexOf(locale);
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const next = locales[(currentIndex + direction + locales.length) % locales.length];
        setLocale(next);
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [locale, open, setLocale]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`flex h-10 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${compact ? "w-32" : "w-44"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.open")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Flag locale={locale} />
          <span className="truncate">{compact ? t(`language.${locale}`) : t(active.nameKey)}</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition duration-[var(--motion-fast)] ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-48 animate-[dropdown-in_var(--motion-fast)_var(--motion-ease)] rounded-lg border border-border bg-card p-1 shadow-xl" role="listbox" aria-label={t("language.select")}>
          {locales.map((item: Locale) => {
            const option = languageMeta[item];
            const selected = locale === item;
            return (
              <button
                key={item}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  selected ? "bg-primary/10 text-primary" : "text-foreground"
                }`}
                onClick={() => {
                  setLocale(item);
                  setOpen(false);
                }}
              >
                <span className="flex items-center gap-2">
                  <Flag locale={item} />
                  <span>{t(option.nameKey)}</span>
                </span>
                {selected ? <Check className="h-4 w-4" aria-label={t("language.current")} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
