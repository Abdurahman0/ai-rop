"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { dictionaries } from "@/i18n/dictionaries";
import { useLocale, useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { Button } from "./button";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function DatePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(startOfMonth(value));
  const ref = useRef<HTMLDivElement>(null);
  const days = useMemo(() => {
    const first = startOfMonth(view);
    const gridStart = new Date(first);
    gridStart.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [view]);
  const months = dictionaries[locale].calendar.months;
  const daysShort = dictionaries[locale].calendar.days;
  const dateLabel = formatDate(value.toISOString());

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const keyHandler = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") setView((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
      if (event.key === "ArrowRight") setView((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
      if (event.key === "Home") setView(startOfMonth(new Date()));
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button icon={<CalendarDays className="h-4 w-4" />} onClick={() => setOpen((state) => !state)}>
        {dateLabel}
      </Button>
      {open ? (
        <div className="absolute right-0 top-12 z-40 w-80 animate-[toast-in_140ms_ease-out] rounded-lg border border-border bg-card p-3 shadow-xl max-sm:right-auto max-sm:left-0 max-sm:w-[calc(100vw-2rem)]">
          <div className="mb-3 flex items-center justify-between">
            <button className="rounded-md p-2 transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={t("calendar.previousMonth")} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">{months[view.getMonth()]} {view.getFullYear()}</p>
            <button className="rounded-md p-2 transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label={t("calendar.nextMonth")} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {daysShort.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const selected = sameDay(day, value);
              const today = sameDay(day, new Date());
              const muted = day.getMonth() !== view.getMonth();
              return (
                <button
                  key={day.toISOString()}
                  className={`h-9 rounded-md text-sm transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                    selected ? "bg-primary text-primary-foreground hover:bg-primary" : today ? "border border-primary/30 text-primary" : muted ? "text-muted-foreground/50" : "text-foreground"
                  }`}
                  onClick={() => {
                    onChange(day);
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <Button className="mt-3 w-full" size="sm" onClick={() => { onChange(new Date()); setView(startOfMonth(new Date())); }}>
            {t("calendar.today")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
