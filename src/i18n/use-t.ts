"use client";

import { dictionaries, type Locale } from "./dictionaries";
import { useI18nStore } from "@/stores/i18n-store";

type Vars = Record<string, string | number>;

function readValue(source: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);
}

function formatValue(value: string, vars?: Vars) {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

export function translate(locale: Locale, key: string, vars?: Vars) {
  const value = readValue(dictionaries[locale], key) ?? readValue(dictionaries.en, key);
  return typeof value === "string" ? formatValue(value, vars) : key;
}

export function useT() {
  const locale = useI18nStore((state) => state.locale);
  return (key: string, vars?: Vars) => translate(locale, key, vars);
}

export function useLocale() {
  return useI18nStore();
}
