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

export function displayPerson(value?: string | number | null, label = "User") {
  if (value === null || value === undefined || value === "") return "Unassigned";
  return typeof value === "number" ? `${label} #${value}` : value;
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
