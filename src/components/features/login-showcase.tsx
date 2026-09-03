"use client";

import Image from "next/image";
import { BarChart3, Lightbulb, MessageSquare, Sparkles, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useT } from "@/i18n/use-t";

const SCORE = 87;
const RING = 2 * Math.PI * 42;

const sparkline = [18, 26, 20, 34, 28, 44, 36, 52, 40, 58, 46, 64, 54, 72];
const breakdown = [
  { key: "excellent", value: 28, bar: "bg-emerald-500" },
  { key: "good", value: 52, bar: "bg-primary" },
  { key: "average", value: 15, bar: "bg-amber-500" },
  { key: "needsWork", value: 5, bar: "bg-red-500" },
];

function Feature({ icon: Icon, title, text, tone }: { icon: typeof BarChart3; title: string; text: string; tone: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function Bubble({ name, time, text, align, float }: { name: string; time: string; text: string; align: "left" | "right"; float: string }) {
  return (
    <div className={`${float} w-[19rem] max-w-full rounded-2xl border border-border bg-card p-3 shadow-lg shadow-black/5 ${align === "right" ? "ml-auto" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${align === "left" ? "bg-gradient-to-br from-rose-400 to-orange-400" : "bg-gradient-to-br from-primary to-violet-500"}`}>
            {name.slice(0, 1)}
          </span>
          <span className="text-sm font-semibold text-foreground">{name}</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{time}</span>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

/** Illustrative product preview beside the sign-in form. Sample numbers, not live data. */
export function LoginShowcase() {
  const t = useT();
  const max = Math.max(...sparkline);

  return (
    <div className="relative hidden w-full lg:block">
      <div className="login-in mb-8">
        <div className="login-float-4 grid gap-6 sm:grid-cols-3">
        <Feature icon={BarChart3} title={t("login.features.analysisTitle")} text={t("login.features.analysisText")} tone="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300" />
        <Feature icon={Target} title={t("login.features.performanceTitle")} text={t("login.features.performanceText")} tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300" />
        <Feature icon={Lightbulb} title={t("login.features.adviceTitle")} text={t("login.features.adviceText")} tone="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300" />
        </div>
      </div>

      <div className="relative grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* conversation + AI reading of it */}
        <div className="space-y-4">
          <div className="login-in" style={{ animationDelay: "60ms" }}>
            <Bubble name={t("login.preview.client")} time="00:42" text={t("login.preview.clientLine")} align="left" float="login-float" />
          </div>
          <div className="login-in" style={{ animationDelay: "180ms" }}>
            <Bubble name={t("login.preview.operator")} time="00:47" text={t("login.preview.operatorLine")} align="right" float="login-float-2" />
          </div>

          <div className="login-in" style={{ animationDelay: "300ms" }}>
          <div className="login-float-3 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/5">
            <p className="mb-3 text-sm font-semibold text-foreground">{t("login.preview.analysisResults")}</p>
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-emerald-500" />{t("login.preview.sentiment")}</dt>
                <dd className="font-medium text-emerald-600 dark:text-emerald-400">{t("login.preview.positive")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="h-3.5 w-3.5" />{t("login.preview.duration")}</dt>
                <dd className="font-mono font-medium text-foreground">02:47</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("login.preview.keywords")}</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {["keyword1", "keyword2", "keyword3"].map((key) => (
                    <span key={key} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-foreground">{t(`login.preview.${key}`)}</span>
                  ))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
                <dt className="text-muted-foreground">{t("login.preview.clientNeed")}</dt>
                <dd className="font-medium text-foreground">{t("login.preview.needValue")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("login.preview.operatorSkill")}</dt>
                <dd className="font-medium text-foreground">{t("login.preview.good")}</dd>
              </div>
            </dl>
          </div>
          </div>
        </div>

        {/* manager panel */}
        <div className="relative space-y-4">
          {/* the AI sits in the gutter, between the conversation and the panel it produces */}
          <div className="pointer-events-none absolute left-0 top-[45%] z-10 hidden -translate-x-1/2 -translate-y-1/2 xl:block">
            <div className="login-float-3 relative">
              <div className="login-glow absolute -inset-2 rounded-full bg-primary/25 blur-2xl" />
              <Image
                src="/ai-chip.png"
                alt=""
                width={418}
                height={418}
                priority
                className="login-orb relative h-[92px] w-[92px] drop-shadow-[0_8px_24px_rgba(79,70,229,0.35)]"
              />
            </div>
          </div>
          <div className="login-in" style={{ animationDelay: "220ms" }}>
          <div className="login-float-2 rounded-2xl border border-white/10 bg-[#171a2b] p-5 text-white shadow-2xl shadow-indigo-500/10">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("login.preview.panel")}</p>
              <span className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/60">{t("login.preview.range")}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] text-white/50">{t("login.preview.overall")}</p>
                <div className="mt-2 flex items-center justify-center">
                  <div className="relative">
                    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      <circle
                        className="login-ring"
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="url(#login-score)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={RING}
                        strokeDashoffset={RING * (1 - SCORE / 100)}
                        style={{ "--ring-full": RING } as React.CSSProperties}
                      />
                      <defs>
                        <linearGradient id="login-score" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-semibold leading-none">{SCORE}</span>
                      <span className="text-[10px] text-white/40">/100</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-emerald-300">
                  <span className="login-blink h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t("login.preview.good")}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-[11px] text-white/50">{t("login.preview.conversations")}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold">1,248</span>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-300"><TrendingUp className="h-3 w-3" />12.5%</span>
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">{t("login.preview.vsLastWeek")}</p>
                <svg viewBox="0 0 200 60" className="mt-3 h-14 w-full" preserveAspectRatio="none" aria-hidden>
                  <polyline
                    className="login-draw"
                    points={sparkline.map((value, index) => `${(index / (sparkline.length - 1)) * 200},${56 - (value / max) * 48}`).join(" ")}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-3 text-[11px] text-white/50">{t("login.preview.breakdown")}</p>
                <div className="space-y-2">
                  {breakdown.map((row, index) => (
                    <div key={row.key} className="flex items-center gap-2">
                      <span className="w-16 shrink-0 text-[10px] text-white/60">{t(`login.preview.${row.key}`)}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span className={`login-bar block h-full rounded-full ${row.bar}`} style={{ width: `${row.value}%`, animationDelay: `${420 + index * 110}ms` }} />
                      </span>
                      <span className="w-8 shrink-0 text-right text-[10px] text-white/50">{row.value}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-3 text-[11px] text-white/50">{t("login.preview.topIndicators")}</p>
                <div className="space-y-2.5 text-[11px]">
                  {[
                    { label: t("login.preview.firstResponse"), value: "00:28", delta: "18%", down: true },
                    { label: t("login.preview.resolved"), value: "93%", delta: "8%", down: false },
                    { label: t("login.preview.satisfaction"), value: "4.6/5", delta: "6%", down: false },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="text-white/60">{row.label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">{row.value}</span>
                        <span className={`inline-flex items-center gap-0.5 ${row.down ? "text-emerald-300" : "text-emerald-300"}`}>
                          {row.down ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {row.delta}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="login-in" style={{ animationDelay: "420ms" }}>
          <div className="login-float-4 rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              {t("login.preview.recommendations")}
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {["rec1", "rec2", "rec3"].map((key) => (
                <li key={key} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {t(`login.preview.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-muted-foreground/70">{t("login.preview.illustrative")}</p>
    </div>
  );
}
