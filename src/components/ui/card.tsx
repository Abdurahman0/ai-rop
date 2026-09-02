import type { HTMLAttributes, Ref, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-lg border border-border bg-card shadow-sm transition duration-[var(--motion-normal)] ${className}`} {...props} />;
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div>
        {eyebrow ? <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-indigo-500">{eyebrow}</p> : null}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function CardContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }) {
  return <div className={`p-5 ${className}`} {...props} />;
}
