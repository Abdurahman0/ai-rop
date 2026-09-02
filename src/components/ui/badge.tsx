"use client";

import { useT } from "@/i18n/use-t";
import { titleCase } from "@/lib/utils/format";

const tones = {
  neutral: "border-border bg-muted text-muted-foreground",
  ai: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Pipeline stages reported by the backend, mapped onto a badge tone. */
const stageTones: Record<string, keyof typeof tones> = {
  received: "neutral",
  audio_stored: "neutral",
  transcribing: "warning",
  transcribed: "neutral",
  analyzing: "warning",
  analyzed: "ai",
  completed: "success",
  failed: "danger",
};

export function StatusBadge({ value, color, title, label }: { value?: string; color?: string; title?: string; label?: string }) {
  const tone = stageTones[value?.toLowerCase() ?? ""] ?? "neutral";
  if (color) {
    return (
      <span className="inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium" title={title} style={{ borderColor: `${color}55`, backgroundColor: `${color}18`, color }}>
        {label ?? value}
      </span>
    );
  }
  return <span title={title}><Badge tone={tone}>{label ?? titleCase(value)}</Badge></span>;
}

export function ScoreBadge({ score }: { score?: number | string | null }) {
  const t = useT();
  const value = score === null || score === undefined || score === "" ? null : Number(score);
  if (value === null || !Number.isFinite(value)) return <Badge>{t("common.notAnalyzed")}</Badge>;
  const tone = value >= 85 ? "success" : value >= 70 ? "warning" : "danger";
  return <Badge tone={tone}>{value}</Badge>;
}
