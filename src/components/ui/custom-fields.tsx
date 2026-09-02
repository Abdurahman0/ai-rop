"use client";

import { useMemo } from "react";
import { fieldDefinitionsApi, type FieldErrors } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { demoFields } from "@/lib/data/demo";
import { useApiResource } from "@/hooks/use-api-resource";
import type { FieldDefinition } from "@/types/domain";
import { DateField } from "./date-picker";
import { Input } from "./input";

export type CustomEntity = "lead" | "client";
export type CustomValues = Record<string, string>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The company-defined form schema. Only active definitions are rendered, in
 * `order`; the frontend never hardcodes custom field names.
 */
export function useCustomFields(entityType: CustomEntity) {
  const definitions = useApiResource(fieldDefinitionsApi.list, demoFields);
  const fields = useMemo(
    () =>
      definitions.data
        .filter((field) => field.entity_type === entityType && field.is_active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || Number(a.id) - Number(b.id)),
    [definitions.data, entityType],
  );
  return { fields, loading: definitions.loading, error: definitions.error, reload: definitions.reload };
}

/** Seeds the form inputs from a record's stored `custom_data`. */
export function initialCustomValues(fields: FieldDefinition[], customData?: Record<string, unknown> | null): CustomValues {
  const values: CustomValues = {};
  fields.forEach((field) => {
    if (!field.key) return;
    const stored = customData?.[field.key];
    values[field.key] = stored === null || stored === undefined ? "" : String(stored);
  });
  return values;
}

export function validateCustomValues(fields: FieldDefinition[], values: CustomValues, t: (key: string, vars?: Record<string, string | number>) => string): FieldErrors {
  const errors: FieldErrors = {};
  fields.forEach((field) => {
    if (!field.key) return;
    const raw = (values[field.key] ?? "").trim();
    if (!raw) {
      if (field.is_required) errors[field.key] = t("fields.requiredError");
      return;
    }
    if (field.field_type === "number" && !Number.isFinite(Number(raw))) errors[field.key] = t("fields.numberError");
    if (field.field_type === "date" && !DATE_PATTERN.test(raw)) errors[field.key] = t("fields.dateError");
  });
  return errors;
}

/**
 * Builds the `custom_data` payload. Values stored under definitions that are no
 * longer rendered (soft-deleted fields, AI-extracted extras) are carried over
 * untouched so an edit never wipes them.
 */
export function buildCustomData(fields: FieldDefinition[], values: CustomValues, existing?: Record<string, unknown> | null): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...(existing ?? {}) };
  fields.forEach((field) => {
    if (!field.key) return;
    const raw = (values[field.key] ?? "").trim();
    if (!raw) {
      delete payload[field.key];
      return;
    }
    payload[field.key] = field.field_type === "number" ? Number(raw) : raw;
  });
  return payload;
}

function inputType(fieldType?: string) {
  if (fieldType === "number") return "number";
  if (fieldType === "phone") return "tel";
  return "text";
}

export function CustomFieldInputs({
  fields,
  values,
  errors,
  loading,
  onChange,
}: {
  fields: FieldDefinition[];
  values: CustomValues;
  errors: FieldErrors;
  loading?: boolean;
  onChange: (key: string, value: string) => void;
}) {
  const t = useT();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="animate-pulse space-y-2">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-10 w-full rounded-md bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (fields.length === 0) {
    return <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{t("fields.noneDefined")}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const key = String(field.key);
        const error = errors[key] ?? errors[`custom_data.${key}`];
        return (
          <label key={field.id} className="block text-sm font-medium">
            <span className="flex items-center gap-1">
              {field.label ?? key}
              {field.is_required ? <span className="text-red-600">*</span> : null}
            </span>
            <div className="mt-2">
              {field.field_type === "date" ? (
                <DateField value={values[key] ?? ""} onChange={(next) => onChange(key, next)} error={!!error} required={field.is_required} />
              ) : (
                <Input
                  className={error ? "border-red-400 focus:border-red-500 focus:ring-red-500/10" : ""}
                  type={inputType(field.field_type)}
                  inputMode={field.field_type === "number" ? "decimal" : undefined}
                  value={values[key] ?? ""}
                  onChange={(event) => onChange(key, event.target.value)}
                  aria-invalid={!!error}
                />
              )}
            </div>
            {error ? <span className="mt-1 block text-xs font-normal text-red-600">{error}</span> : null}
          </label>
        );
      })}
    </div>
  );
}
