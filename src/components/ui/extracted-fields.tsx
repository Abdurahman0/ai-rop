"use client";

import { SpecialFieldsPanel } from "./structured-ai-data";

export function ExtractedFields({ value }: { value: unknown }) {
  return <SpecialFieldsPanel value={value} />;
}
