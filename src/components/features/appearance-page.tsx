"use client";

import { RotateCcw } from "lucide-react";
import {
  palettes,
  useAppearanceStore,
  type MotionMode,
  type PaletteKey,
  type ThemeMode,
} from "@/stores/appearance-store";
import { useT } from "@/i18n/use-t";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { label: string; value: T }[]; onChange: (value: T) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={`rounded-md px-3 py-2 text-sm font-medium transition duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            value === option.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function PalettePicker({ value, onChange, label }: { value: PaletteKey; onChange: (value: PaletteKey) => void; label: string }) {
  const t = useT();
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label={label}>
        {(Object.keys(palettes) as PaletteKey[]).map((key) => {
          const palette = palettes[key];
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition duration-[var(--motion-fast)] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                active ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
              onClick={() => onChange(key)}
            >
              <span className="flex h-8 w-8 overflow-hidden rounded-full border border-border">
                <span className="h-full w-1/2" style={{ backgroundColor: palette.background }} />
                <span className="h-full w-1/2" style={{ backgroundColor: palette.primary }} />
              </span>
              <span className="text-sm font-medium text-foreground">{t(`appearance.palette.${key}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppearancePage() {
  const t = useT();
  const {
    theme,
    radius,
    colorPalette,
    backgroundPalette,
    surfacePalette,
    sidebarPalette,
    motion,
    setTheme,
    setRadius,
    setColorPalette,
    setBackgroundPalette,
    setSurfacePalette,
    setSidebarPalette,
    setMotion,
    reset,
  } = useAppearanceStore();

  return (
    <>
      <PageHeader
        title={t("appearance.title")}
        description={t("appearance.description")}
        actions={<Button icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>{t("appearance.resetDefault")}</Button>}
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("appearance.theme")} />
            <CardContent>
              <Segmented<ThemeMode>
                label={t("appearance.theme")}
                value={theme}
                onChange={setTheme}
                options={[
                  { label: t("appearance.light"), value: "light" },
                  { label: t("appearance.dark"), value: "dark" },
                  { label: t("appearance.system"), value: "system" },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("appearance.cornerRadius")} />
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{t("appearance.cornerRadius")}</span>
                  <span className="rounded-md border border-border bg-muted px-2 py-1 text-sm font-medium text-foreground">{t("appearance.radiusValue", { value: radius })}</span>
                </div>
                <input
                  aria-label={t("appearance.cornerRadius")}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {[0, 4, 8, 12, 16, 20].map((value) => <span key={value}>{value}</span>)}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("appearance.motion")} />
            <CardContent>
              <Segmented<MotionMode>
                label={t("appearance.motion")}
                value={motion}
                onChange={setMotion}
                options={[
                  { label: t("appearance.fullMotion"), value: "full" },
                  { label: t("appearance.reducedMotion"), value: "reduced" },
                ]}
              />
              <p className="mt-3 text-sm text-muted-foreground">{t("appearance.motionNote")}</p>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("appearance.colors")} />
            <CardContent className="space-y-6">
              <PalettePicker label={t("appearance.aiAccent")} value={colorPalette} onChange={setColorPalette} />
              <PalettePicker label={t("appearance.background")} value={backgroundPalette} onChange={setBackgroundPalette} />
              <PalettePicker label={t("appearance.surface")} value={surfacePalette} onChange={setSurfacePalette} />
              <PalettePicker label={t("appearance.sidebar")} value={sidebarPalette} onChange={setSidebarPalette} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("appearance.livePreview")} />
            <CardContent>
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[10rem_1fr]">
                  <div className="border-b border-border bg-sidebar p-4 md:border-b-0 md:border-r">
                    <div className="mb-4 h-8 w-8 rounded-lg bg-primary" />
                    <div className="space-y-2">
                      <div className="h-7 rounded-md bg-primary/15" />
                      <div className="h-7 rounded-md bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-32 rounded-md bg-muted" />
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="mb-3 h-3 w-24 rounded-md bg-primary/40" />
                      <div className="h-9 rounded-md bg-muted" />
                    </div>
                    <Button variant="primary" size="sm">{t("appearance.primaryAction")}</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
