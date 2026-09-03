"use client";

import { useT } from "@/i18n/use-t";
import type { OperatorCriteria, ScoreDistribution } from "@/types/domain";

/** The bands the whole app scores against: >=85 strong, 70-84 attention, <70 critical. */
export function scoreBand(score?: number | null) {
  if (score === null || score === undefined || !Number.isFinite(score)) return "none" as const;
  if (score >= 85) return "strong" as const;
  if (score >= 70) return "attention" as const;
  return "critical" as const;
}

/** The one status ramp, validated against both surfaces. */
export const bandColor: Record<string, string> = {
  strong: "var(--score-strong)",
  attention: "var(--score-attention)",
  critical: "var(--score-critical)",
  none: "var(--muted-foreground)",
};

/** A score as a number plus a proportional track — a meter, not a chart. */
export function ScoreMeter({ score, size = "md" }: { score?: number | null; size?: "sm" | "md" | "lg" }) {
  const t = useT();
  const band = scoreBand(score);
  const value = band === "none" ? 0 : Number(score);
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <div>
      <p className={`font-semibold tabular-nums ${text}`} style={{ color: bandColor[band] }}>
        {band === "none" ? t("common.notAnalyzed") : Math.round(value)}
        {band === "none" ? null : <span className="ml-1 text-sm font-normal text-muted-foreground">/100</span>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(value)} / 100`}>
        <div className="h-full rounded-full transition-[width] duration-[var(--motion-slow)]" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: bandColor[band] }} />
      </div>
    </div>
  );
}

/** Strong / attention / critical as one proportional bar plus a legend. */
export function DistributionBar({ distribution }: { distribution?: ScoreDistribution }) {
  const t = useT();
  const strong = distribution?.strong ?? 0;
  const attention = distribution?.attention ?? 0;
  const critical = distribution?.critical ?? 0;
  const total = strong + attention + critical;
  if (total === 0) return <span className="text-xs text-muted-foreground">—</span>;

  const parts = [
    { key: "strong", value: strong, fill: bandColor.strong, label: t("users.strong") },
    { key: "attention", value: attention, fill: bandColor.attention, label: t("users.attention") },
    { key: "critical", value: critical, fill: bandColor.critical, label: t("users.critical") },
  ];

  return (
    <div className="min-w-32">
      {/* 2px gaps between segments so adjacent fills never blur together */}
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {parts.filter((part) => part.value > 0).map((part) => (
          <span key={part.key} className="h-full rounded-full" style={{ width: `${(part.value / total) * 100}%`, background: part.fill }} title={`${part.label}: ${part.value}`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {parts.filter((part) => part.value > 0).map((part) => (
          <span key={part.key} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: part.fill }} aria-hidden />
            {part.label} <b className="text-foreground">{part.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Per-criterion means. Booleans arrive as a 0-1 rate, scores on a 0-5 scale. */
const CRITERION_MAX: Record<string, number> = { need_identified: 5, operator_politeness: 5, next_step_clear: 1 };

export function CriteriaBars({ criteria, labels }: { criteria?: OperatorCriteria; labels?: Record<string, string> }) {
  const t = useT();
  const entries = Object.entries(criteria ?? {});
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{t("callDetail.notExtracted")}</p>;

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        const max = CRITERION_MAX[key] ?? 5;
        const ratio = Math.max(0, Math.min(1, value / max));
        const translated = t(`aiEvaluation.fields.${key}`);
        const label = labels?.[key] ?? (translated === `aiEvaluation.fields.${key}` ? key.replace(/[_-]/g, " ") : translated);
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-foreground first-letter:uppercase">{label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {max === 1 ? `${Math.round(value * 100)}%` : `${value.toFixed(1)} / ${max}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${ratio * 100}%`, background: ratio >= 0.8 ? bandColor.strong : ratio >= 0.5 ? "var(--primary)" : bandColor.attention }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
