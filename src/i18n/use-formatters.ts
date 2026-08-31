"use client";

import { formatDate as formatSharedDate, formatDuration as formatSharedDuration, formatTime as formatSharedTime } from "@/lib/utils/format";
import { useLocale, useT } from "./use-t";

export function useFormatters() {
  const { locale } = useLocale();
  const t = useT();
  const fallback = t("common.notRecorded");

  return {
    formatDate: (value?: string, mode: "date" | "datetime" = "date") => formatSharedDate(value, locale, mode, fallback),
    formatTime: (value?: string) => formatSharedTime(value, fallback),
    formatDuration: (seconds?: number | null) => formatSharedDuration(seconds, fallback),
  };
}
