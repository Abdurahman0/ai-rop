"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { dictionaries } from "@/i18n/dictionaries";
import { useLocale, useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { isSameDay, parseISODate, toISODate } from "@/lib/utils/format";
import { Button } from "./button";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** The month grid itself, shared by the filter picker and the form field. */
function CalendarPanel({
  value,
  onSelect,
  onClear,
}: {
  value: Date | null;
  onSelect: (date: Date) => void;
  onClear?: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const [view, setView] = useState(() => startOfMonth(value ?? new Date()));
  const months = dictionaries[locale].calendar.months;
  const daysShort = dictionaries[locale].calendar.days;

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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setView((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
      if (event.key === "ArrowRight") setView((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
      if (event.key === "Home") setView(startOfMonth(new Date()));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-md p-2 transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={t("calendar.previousMonth")}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">{months[view.getMonth()]} {view.getFullYear()}</p>
        <button
          type="button"
          className="rounded-md p-2 transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={t("calendar.nextMonth")}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {daysShort.map((day, index) => (
          <div key={`${day}-${index}`} className="py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selected = isSameDay(day, value);
          const today = isSameDay(day, new Date());
          const muted = day.getMonth() !== view.getMonth();
          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-current={today ? "date" : undefined}
              aria-pressed={selected}
              className={`h-9 rounded-md text-sm transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                selected
                  ? "bg-primary text-primary-foreground hover:bg-primary"
                  : today
                    ? "border border-primary/30 text-primary"
                    : muted
                      ? "text-muted-foreground/50"
                      : "text-foreground"
              }`}
              onClick={() => onSelect(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          size="sm"
          type="button"
          onClick={() => {
            const today = new Date();
            setView(startOfMonth(today));
            onSelect(today);
          }}
        >
          {t("calendar.today")}
        </Button>
        {onClear ? (
          <Button size="sm" type="button" icon={<X className="h-4 w-4" />} onClick={onClear}>
            {t("calendar.clear")}
          </Button>
        ) : null}
      </div>
    </>
  );
}

/** Anchors a floating panel to a trigger, flipping up when space is short. */
function useAnchoredPanel(open: boolean, close: () => void) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 320;
    const height = panelRef.current?.offsetHeight ?? 380;
    const below = window.innerHeight - rect.bottom;
    const top = below < height + 12 && rect.top > height + 12 ? rect.top - height - 8 : rect.bottom + 8;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPosition({ top, left });
  }, []);

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

function FloatingCalendar({
  panelRef,
  position,
  children,
  id,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  position: { top: number; left: number } | null;
  children: React.ReactNode;
  id?: string;
}) {
  if (typeof document === "undefined") return null;
  // Rendered in a portal so the modal's scroll container cannot clip it.
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      className="fixed z-[60] w-80 animate-[dropdown-in_var(--motion-fast)_var(--motion-ease)] rounded-lg border border-border bg-card p-3 shadow-xl max-sm:w-[calc(100vw-2rem)]"
      style={{ top: position?.top ?? -9999, left: position?.left ?? -9999, visibility: position ? "visible" : "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}

/** Filter-bar picker: always holds a date, styled as a button. */
export function DatePicker({ value, onChange }: { value: Date; onChange: (date: Date) => void }) {
  const { formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPanel(open, close);

  return (
    <>
      <Button ref={triggerRef} type="button" icon={<CalendarDays className="h-4 w-4" />} onClick={() => setOpen((state) => !state)} aria-haspopup="dialog" aria-expanded={open}>
        {formatDate(toISODate(value))}
      </Button>
      {open ? (
        <FloatingCalendar panelRef={panelRef} position={position}>
          <CalendarPanel
            value={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
        </FloatingCalendar>
      ) : null}
    </>
  );
}

/**
 * Filter-bar picker that may hold no date at all — "All dates" until one is
 * chosen, and clearable back to that.
 */
export function DateFilter({ value, onChange }: { value: Date | null; onChange: (date: Date | null) => void }) {
  const t = useT();
  const { formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPanel(open, close);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={value ? "primary" : "secondary"}
        icon={<CalendarDays className="h-4 w-4" />}
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {value ? formatDate(toISODate(value)) : t("calendar.allDates")}
      </Button>
      {open ? (
        <FloatingCalendar panelRef={panelRef} position={position}>
          <CalendarPanel
            value={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            onClear={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        </FloatingCalendar>
      ) : null}
    </>
  );
}

/**
 * Form field for a `date` custom field. Holds `YYYY-MM-DD` (what the API wants)
 * and looks like the other inputs rather than a native date control.
 */
export function DateField({
  value,
  onChange,
  error,
  id,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  id?: string;
  required?: boolean;
}) {
  const t = useT();
  const { formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPanel(open, close);
  const selected = parseISODate(value);
  const panelId = useId();

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        // combobox (not plain button) so the invalid/required state is exposed.
        role="combobox"
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-expanded={open}
        aria-invalid={error}
        aria-required={required}
        aria-label={t("calendar.openCalendar")}
        onClick={() => setOpen((state) => !state)}
        className={`flex h-11 w-full items-center gap-2 rounded-md border bg-card px-3 text-left text-sm outline-none transition duration-[var(--motion-fast)] focus:ring-4 focus:ring-primary/10 ${
          error ? "border-red-400 focus:border-red-500 focus:ring-red-500/10" : "border-border focus:border-primary"
        }`}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? formatDate(value) : t("calendar.selectDate")}
        </span>
      </button>
      {open ? (
        <FloatingCalendar panelRef={panelRef} position={position} id={panelId}>
          <CalendarPanel
            value={selected}
            onSelect={(date) => {
              onChange(toISODate(date));
              setOpen(false);
            }}
            onClear={() => {
              onChange("");
              setOpen(false);
            }}
          />
        </FloatingCalendar>
      ) : null}
    </>
  );
}
