import type { ApiList, ID, Paginated } from "@/types/domain";
import type { Locale } from "@/i18n/dictionaries";

export function listOf<T>(payload: ApiList<T> | undefined): T[] {
  if (!payload) return [];
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export function countOf<T>(payload: ApiList<T> | undefined): number {
  if (!payload) return 0;
  return Array.isArray(payload) ? payload.length : payload.count ?? payload.results?.length ?? 0;
}

export function isPaginated<T>(payload: ApiList<T>): payload is Paginated<T> {
  return !Array.isArray(payload);
}

/**
 * List endpoints return related records as bare IDs. Resolves one against an
 * already-loaded list so the UI can show a name instead of `#42`.
 */
export function resolveRef<T extends { id: ID }>(value: unknown, items: T[]): T | undefined {
  if (value && typeof value === "object" && "id" in value) return value as T;
  const id = objectId(value);
  if (id === undefined || id === null) return undefined;
  return items.find((item) => String(item.id) === String(id));
}

export function objectId(value: unknown): ID | undefined {
  if (typeof value === "object" && value && "id" in value) return (value as { id: ID }).id;
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

const monthNames: Record<Locale, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
};

export function formatDate(value?: string, locale: Locale = "en", mode: "date" | "datetime" = "date", fallback = "Not recorded") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const formattedDate = `${date.getDate()} ${monthNames[locale][date.getMonth()]} ${date.getFullYear()}`;
  return mode === "datetime" ? `${formattedDate}, ${formatTime(value, fallback)}` : formattedDate;
}

export function formatTime(value?: string, fallback = "Not recorded") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

export function formatDuration(seconds?: number | null, fallback = "Not recorded") {
  if (!seconds && seconds !== 0) return fallback;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function titleCase(value?: string) {
  if (!value) return "Unknown";
  return value
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function scoreTone(score?: number | null) {
  if (score === null || score === undefined) return "neutral";
  if (score >= 85) return "success";
  if (score >= 70) return "warning";
  return "danger";
}

export function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function relativeDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "greeting.morning";
  if (hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}

/**
 * Splits an analysis `skip_reason` into its code and optional detail, e.g.
 * `"insufficient_data: mahsulot, narx"` -> `{ code, detail }`.
 */
export function parseSkipReason(reason?: string | null) {
  if (!reason) return null;
  const [code, ...rest] = reason.split(":");
  const detail = rest.join(":").trim();
  return { code: code.trim(), detail: detail || undefined };
}

/**
 * Diarization labels like `SPEAKER_00` are provider indexes, not people — a
 * two-person call can report three or four. Returns the 1-based index so the UI
 * can label them neutrally instead of guessing a role.
 */
export function speakerIndex(speaker?: string) {
  const match = speaker?.match(/^speaker[\s_-]?(\d+)$/i);
  return match ? Number(match[1]) + 1 : null;
}

/** `Date` -> `YYYY-MM-DD`, in local time (never shifts a day like toISOString). */
export function toISODate(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `YYYY-MM-DD` -> local `Date`, or null when absent/malformed. */
export function parseISODate(value?: string | null) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when two dates fall on the same calendar day. */
export function isSameDay(a?: Date | null, b?: Date | null) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
