"use client";

import { useState } from "react";
import { Banknote, CalendarDays, ChevronDown, FileText, MapPin, MessageSquare, Package, type LucideIcon } from "lucide-react";
import { useFormatters } from "@/i18n/use-formatters";
import { useLocale, useT } from "@/i18n/use-t";
import { EmptyState } from "./states";

const evaluationScoreMax: Record<string, number> = {
  need_identified: 5,
  operator_politeness: 5,
};

const specialIcons: Record<string, LucideIcon> = {
  izoh: MessageSquare,
  manzil: MapPin,
  muddat: CalendarDays,
  byudjet: Banknote,
  budget: Banknote,
  mahsulot: Package,
  product: Package,
};

function humanizeKey(key: string) {
  return key.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (char) => char.toUpperCase());
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function toneForScore(value: number, max: number) {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.8) return "success";
  if (ratio >= 0.5) return "warning";
  return "danger";
}

function labelFor(scope: "aiEvaluation" | "specialFields", key: string, t: (key: string) => string) {
  const translationKey = `${scope}.fields.${key}`;
  const translated = t(translationKey);
  return translated === translationKey ? humanizeKey(key) : translated;
}

export function StructuredDataValue({ value }: { value: unknown }) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate } = useFormatters();

  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">{t("specialFields.notProvided")}</span>;
  if (typeof value === "boolean") return <span>{value ? t("common.yes") : t("common.no")}</span>;
  if (typeof value === "number") return <span>{new Intl.NumberFormat(locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-GB").format(value)}</span>;
  if (typeof value === "string") return <span>{isDateString(value) ? formatDate(value) : value}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">{t("specialFields.notProvided")}</span>;
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="rounded-md bg-muted/70 px-2 py-1">
            <StructuredDataValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (isPlainRecord(value)) return <StructuredValue value={value} />;
  return <span>{String(value)}</span>;
}

function StructuredValue({ value }: { value: Record<string, unknown> }) {
  const t = useT();
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
      {Object.entries(value).map(([key, nestedValue]) => (
        <div key={key} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{humanizeKey(key)}</span>
          <div className="text-sm text-foreground">
            <StructuredDataValue value={nestedValue ?? t("specialFields.notProvided")} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AiEvaluationPanel({ value }: { value: unknown }) {
  const t = useT();
  if (!isPlainRecord(value) || Object.keys(value).length === 0) {
    return <EmptyState title={t("aiEvaluation.title")} description={t("callDetail.notExtracted")} />;
  }

  return (
    <div className="space-y-4 animate-[structured-in_var(--motion-normal)_var(--motion-ease)]">
      {Object.entries(value).map(([key, fieldValue]) => {
        const max = evaluationScoreMax[key];
        const numeric = typeof fieldValue === "number" && Number.isFinite(fieldValue);
        const boolean = typeof fieldValue === "boolean";
        const tone = numeric && max ? toneForScore(fieldValue, max) : boolean && fieldValue ? "success" : boolean ? "warning" : "neutral";
        const barColor = tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : tone === "danger" ? "bg-red-500" : "bg-primary";
        return (
          <div key={key} className="rounded-lg border border-border bg-background/70 p-4 transition duration-[var(--motion-fast)] hover:bg-muted/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{labelFor("aiEvaluation", key, t)}</p>
                {boolean && !fieldValue ? <p className="mt-1 text-xs text-muted-foreground">{t("aiEvaluation.notIdentified")}</p> : null}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {numeric && max ? t("aiEvaluation.scoreOutOf", { value: fieldValue, max }) : numeric ? <StructuredDataValue value={fieldValue} /> : boolean ? t(fieldValue ? "common.yes" : "common.no") : <StructuredDataValue value={fieldValue} />}
              </div>
            </div>
            {numeric && max ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${barColor} transition-[width] duration-[var(--motion-slow)]`} style={{ width: `${Math.max(0, Math.min(100, (fieldValue / max) * 100))}%` }} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function SpecialFieldsPanel({ value }: { value: unknown }) {
  const t = useT();
  const [open, setOpen] = useState(true);
  if (!isPlainRecord(value) || Object.keys(value).length === 0) {
    return <EmptyState title={t("extractedFields.noExtractedFields")} description={t("extractedFields.noExtractedDescription")} />;
  }

  const entries = Object.entries(value);
  return (
    <section className="animate-[structured-in_var(--motion-normal)_var(--motion-ease)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 border-b border-border pb-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        aria-expanded={open}
        aria-label={open ? t("specialFields.collapse") : t("specialFields.expand")}
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <h3 className="text-base font-semibold text-foreground">{t("specialFields.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("specialFields.count", { count: entries.length })}</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition duration-[var(--motion-fast)] ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {entries.map(([key, fieldValue]) => {
            const Icon = specialIcons[key] ?? FileText;
            const fullWidth = typeof fieldValue === "string" && fieldValue.length > 70;
            return (
              <div key={key} className={`rounded-lg border border-border bg-background/70 p-4 transition duration-[var(--motion-fast)] hover:bg-muted/50 ${fullWidth ? "md:col-span-2" : ""}`}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{labelFor("specialFields", key, t)}</p>
                </div>
                <div className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  <StructuredDataValue value={fieldValue} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
