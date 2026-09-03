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

export type DateRange = { from: Date; to: Date };

function within(day: Date, range: DateRange | null) {
  if (!range) return false;
  const time = day.getTime();
  return time >= startOfDay(range.from).getTime() && time <= startOfDay(range.to).getTime();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The month grid, shared by the single-date field and the range filter. */
function CalendarPanel({
  value,
  onSelect,
  onClear,
  range,
  onRangeSelect,
  presets,
}: {
  value: Date | null;
  onSelect: (date: Date) => void;
  onClear?: () => void;
  range?: DateRange | null;
  onRangeSelect?: (range: DateRange) => void;
  presets?: { label: string; days: number }[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [view, setView] = useState(() => startOfMonth(range?.from ?? value ?? new Date()));
  // First click sets the start, second closes the range; hovering previews it.
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [preview, setPreview] = useState<Date | null>(null);
  const selecting = !!onRangeSelect;
  const draft: DateRange | null =
    anchor && preview ? (preview < anchor ? { from: preview, to: anchor } : { from: anchor, to: preview }) : range ?? null;
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
      <div className="grid grid-cols-7 gap-1" onMouseLeave={() => setPreview(null)}>
        {days.map((day) => {
          const today = isSameDay(day, new Date());
          const muted = day.getMonth() !== view.getMonth();
          const edge = selecting ? isSameDay(day, draft?.from) || isSameDay(day, draft?.to) : isSameDay(day, value);
          const inside = selecting && within(day, draft) && !edge;
          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-current={today ? "date" : undefined}
              aria-pressed={edge}
              onMouseEnter={() => selecting && anchor && setPreview(day)}
              className={`h-9 text-sm transition duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                edge
                  ? "rounded-md bg-primary text-primary-foreground"
                  : inside
                    ? "rounded-none bg-primary/12 text-foreground first:rounded-l-md last:rounded-r-md"
                    : today
                      ? "rounded-md border border-primary/30 text-primary hover:bg-muted"
                      : muted
                        ? "rounded-md text-muted-foreground/50 hover:bg-muted"
                        : "rounded-md text-foreground hover:bg-muted"
              }`}
              onClick={() => {
                if (!selecting) {
                  onSelect(day);
                  return;
                }
                if (!anchor) {
                  setAnchor(day);
                  setPreview(day);
                  return;
                }
                const next = day < anchor ? { from: day, to: anchor } : { from: anchor, to: day };
                setAnchor(null);
                setPreview(null);
                onRangeSelect?.(next);
              }}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {presets ? (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              type="button"
              onClick={() => {
                const to = new Date();
                const from = new Date();
                from.setDate(to.getDate() - (preset.days - 1));
                setView(startOfMonth(from));
                setAnchor(null);
                setPreview(null);
                onRangeSelect?.({ from, to });
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          size="sm"
          type="button"
          onClick={() => {
            const today = new Date();
            setView(startOfMonth(today));
            setAnchor(null);
            setPreview(null);
            if (onRangeSelect) onRangeSelect({ from: today, to: today });
            else onSelect(today);
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
 * Filter-bar range picker: pick a start and an end day, or a preset. Holds no
 * range at all until one is chosen ("All dates").
 */
export function DateRangeFilter({ value, onChange }: { value: DateRange | null; onChange: (range: DateRange | null) => void }) {
  const t = useT();
  const { formatDate } = useFormatters();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPanel(open, close);

  const label = !value
    ? t("calendar.allDates")
    : isSameDay(value.from, value.to)
      ? formatDate(toISODate(value.from))
      : `${formatDate(toISODate(value.from))} — ${formatDate(toISODate(value.to))}`;

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
        {label}
      </Button>
      {open ? (
        <FloatingCalendar panelRef={panelRef} position={position}>
          <CalendarPanel
            value={value?.from ?? null}
            range={value}
            onSelect={() => undefined}
            onRangeSelect={(range) => {
              onChange(range);
              setOpen(false);
            }}
            onClear={() => {
              onChange(null);
              setOpen(false);
            }}
            presets={[
              { label: t("calendar.last7"), days: 7 },
              { label: t("calendar.last30"), days: 30 },
              { label: t("calendar.last90"), days: 90 },
            ]}
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
