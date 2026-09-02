"use client";

import { useT } from "./use-t";

/**
 * Translates the enum-ish values the backend sends as raw codes
 * (`created_via`, `entity_type`, `field_type`, user references).
 * Anything unrecognised falls through as-is rather than as English.
 */
export function useLabels() {
  const t = useT();

  function fromEnum(group: string, value?: string | null) {
    if (!value) return t("common.unknown");
    const translated = t(`enums.${group}.${value}`);
    return translated === `enums.${group}.${value}` ? value : translated;
  }

  return {
    createdVia: (value?: string | null) => fromEnum("createdVia", value),
    entityType: (value?: string | null) => fromEnum("entityType", value),
    fieldType: (value?: string | null) => fromEnum("fieldType", value),
    /** Renders a user reference: a name when the API nests one, else `User #7`. */
    person: (value?: unknown) => {
      if (value === null || value === undefined || value === "") return t("common.unassigned");
      if (typeof value === "object" && value !== null) {
        const record = value as { name?: string; username?: string; id?: string | number };
        return record.name || record.username || t("common.userNumber", { id: String(record.id ?? "") });
      }
      if (typeof value === "number") return t("common.userNumber", { id: value });
      return String(value);
    },
  };
}
