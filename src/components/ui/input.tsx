"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { useT } from "@/i18n/use-t";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition duration-[var(--motion-fast)] placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition duration-[var(--motion-fast)] placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 ${className}`}
      {...props}
    />
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const t = useT();
  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input className="pl-9" placeholder={t("common.search")} {...props} />
    </div>
  );
}
