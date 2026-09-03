"use client";

import { SpecialFieldsPanel } from "./structured-ai-data";

export function ExtractedFields({ value, labels }: { value: unknown; labels?: Record<string, string> }) {
  return <SpecialFieldsPanel value={value} labels={labels} />;
}
