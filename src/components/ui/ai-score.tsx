"use client";

import { useT as useTranslation } from "@/i18n/use-t";
import { scoreTone } from "@/lib/utils/format";
import { Badge } from "./badge";

function numericScore(score?: number | string | null) {
  if (score === null || score === undefined || score === "") return null;
  const parsed = Number(score);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AIScore({ score, size = "md" }: { score?: number | string | null; size?: "sm" | "md" | "lg" }) {
  const t = useTranslation();
  const value = numericScore(score);
  const tone = scoreTone(value);
  if (value === null) {
    return <Badge>{t("common.unavailable")}</Badge>;
  }
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-muted-foreground";
  const textSize = size === "lg" ? "text-6xl" : size === "md" ? "text-2xl" : "text-sm";
  return <span className={`${textSize} font-semibold ${color}`}>{value}</span>;
}

export function aiScoreLabel(score: number | string | null | undefined, t: (key: string) => string) {
  const value = numericScore(score);
  if (value === null) return t("common.notAnalyzed");
  if (value >= 85) return t("scoreLabels.strongPerformance");
  if (value >= 70) return t("dashboard.needsAttention");
  return t("scoreLabels.reviewRecommended");
}
