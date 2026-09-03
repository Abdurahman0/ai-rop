"use client";

/** Segmented chips that swap both the page actions and the list below. */
export function TabChips({ tabs, active, onChange }: { tabs: { key: string; label: string; count?: number }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              selected ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count === undefined ? null : (
              <span className={`rounded-sm px-1.5 text-xs ${selected ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
