"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bot, ClipboardList, PhoneCall, Sparkles, type LucideIcon } from "lucide-react";
import { analysesApi, callsApi, clientsApi, leadsApi, leadStatusesApi, statsApi } from "@/lib/api/client";
import { dictionaries } from "@/i18n/dictionaries";
import { useLocale, useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { useLabels } from "@/i18n/use-labels";
import { demoAnalyses, demoCalls, demoClients, demoLeads, demoStatuses } from "@/lib/data/demo";
import { objectId, relativeDayGreeting, resolveRef, scoreTone, toISODate } from "@/lib/utils/format";
import { useApiResource } from "@/hooks/use-api-resource";
import { useCountUp } from "@/hooks/use-count-up";
import { useStats } from "@/hooks/use-stats";
import { useIsAdmin, useSessionStore } from "@/stores/session-store";
import { useAppearanceStore } from "@/stores/appearance-store";
import { CALL_DIRECTIONS, CALL_STAGES, type Analysis, type Call, type Lead, type TimelinePoint } from "@/types/domain";
import { Badge, ScoreBadge, StatusBadge } from "@/components/ui/badge";
import { AIScore } from "@/components/ui/ai-score";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-picker";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { PageHeader } from "@/components/shell/page-header";

function analysisFor(call: Call, analyses: Analysis[]) {
  return analyses.find((analysis) => objectId(analysis.call) === call.id);
}

function scoreNumber(score: Analysis["overall_score"]) {
  if (score === null || score === undefined || score === "") return null;
  const value = Number(score);
  return Number.isFinite(value) ? value : null;
}

function KpiValue({ value, ready }: { value: number; ready: boolean }) {
  const motion = useAppearanceStore((state) => state.motion);
  const shown = useCountUp(value, ready, motion === "reduced");
  return <>{shown}</>;
}

function KpiCard({ label, value, icon: Icon, href, loading }: { label: string; value: ReactNode; icon: LucideIcon; href?: string; loading: boolean }) {
  const content = (
    <Card className={`p-5 ${href ? "group hover:border-primary/40 hover:shadow-md" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-indigo-500 transition duration-[var(--motion-fast)] group-hover:scale-110" />
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{loading ? <span className="text-muted-foreground">—</span> : value}</p>
    </Card>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="block rounded-lg transition duration-[var(--motion-normal)] hover:scale-[1.02] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={label}
    >
      {content}
    </Link>
  );
}

/**
 * Calls vs AI reviews over the selected window. Two series that must be told
 * apart -> categorical: brand indigo + orange, validated for CVD separation and
 * contrast in both modes (light #4f46e5/#eb6834, dark #6366f1/#d95926).
 * Both are direct-labelled as well as legended, so identity is never colour alone.
 */
/**
 * Calls vs AI reviews over the selected window, from `GET /api/stats/overview/`.
 * The server buckets by day, so the picture stays true past the 50-row page the
 * browser used to count. Two series that must be told apart -> categorical:
 * brand indigo + orange, validated for CVD separation and contrast in both modes.
 */
function ActivityChart({ timeline }: { timeline: TimelinePoint[] }) {
  const t = useT();
  const { locale } = useLocale();
  const [active, setActive] = useState<number | null>(null);

  const days = timeline;
  const callsPerDay = days.map((point) => point.calls ?? 0);
  const reviewsPerDay = days.map((point) => point.analyzed ?? 0);
  const max = Math.max(1, ...callsPerDay, ...reviewsPerDay);
  const W = 720;
  const H = 220;
  const padX = 28;
  const padTop = 18;
  const padBottom = 34;
  const x = (index: number) => (days.length === 1 ? W / 2 : padX + (index / (days.length - 1)) * (W - padX * 2));
  const y = (value: number) => padTop + (1 - value / max) * (H - padTop - padBottom);
  const line = (values: number[]) => values.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
  const area = (values: number[]) => `${line(values)} L ${x(values.length - 1)} ${H - padBottom} L ${x(0)} ${H - padBottom} Z`;
  const months = dictionaries[locale].calendar.months;
  const labelFor = (point: TimelinePoint) => {
    const day = new Date(`${point.date}T00:00:00`);
    return `${months[day.getMonth()].slice(0, 3)} ${day.getDate()}`;
  };
  const tickEvery = Math.max(1, Math.ceil(days.length / 7));
  const totals = { calls: callsPerDay.reduce((a, b) => a + b, 0), reviews: reviewsPerDay.reduce((a, b) => a + b, 0) };

  if (days.length === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">{t("dashboard.noConversationsTitle")}</div>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        {[
          { label: t("dashboard.chartCalls"), className: "bg-[var(--series-calls)]", total: totals.calls },
          { label: t("dashboard.chartAiReviews"), className: "bg-[var(--series-reviews)]", total: totals.reviews },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${item.className}`} aria-hidden />
            {item.label}
            <b className="text-foreground">{item.total}</b>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full"
        role="img"
        aria-label={`${t("dashboard.callActivity")}: ${totals.calls} ${t("dashboard.chartCalls")}, ${totals.reviews} ${t("dashboard.chartAiReviews")}`}
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <clipPath id="chart-reveal">
            <rect className="chart-wipe" x="0" y="0" width={W} height={H} />
          </clipPath>
          <linearGradient id="calls-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--series-calls)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--series-calls)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((step) => (
          <g key={step}>
            <line x1={padX} x2={W - padX} y1={y(max * step)} y2={y(max * step)} stroke="currentColor" className="text-border" strokeWidth="1" />
            <text x={padX - 8} y={y(max * step) + 4} textAnchor="end" fontSize="10" className="fill-current text-muted-foreground">
              {Math.round(max * step)}
            </text>
          </g>
        ))}

        <g clipPath="url(#chart-reveal)">
          <path className="chart-area" d={area(callsPerDay)} fill="url(#calls-area)" />
          <path d={line(callsPerDay)} fill="none" stroke="var(--series-calls)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d={line(reviewsPerDay)} fill="none" stroke="var(--series-reviews)" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {days.map((point, index) => (
          <g key={point.date} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0} aria-label={`${labelFor(point)}: ${callsPerDay[index]} / ${reviewsPerDay[index]}`}>
            <rect x={x(index) - (W - padX * 2) / Math.max(1, days.length) / 2} y={padTop} width={(W - padX * 2) / Math.max(1, days.length)} height={H - padTop - padBottom} fill="transparent" />
            {active === index ? <line x1={x(index)} x2={x(index)} y1={padTop} y2={H - padBottom} stroke="currentColor" className="text-border" strokeWidth="1" /> : null}
            {index % tickEvery === 0 || index === days.length - 1 ? (
              <text x={x(index)} y={H - 12} textAnchor="middle" fontSize="10" className="fill-current text-muted-foreground">{labelFor(point)}</text>
            ) : null}
            <circle className="chart-dot" cx={x(index)} cy={y(callsPerDay[index])} r={active === index ? 5 : 3} fill="var(--series-calls)" stroke="var(--card)" strokeWidth="2" />
            <circle className="chart-dot chart-dot-delayed" cx={x(index)} cy={y(reviewsPerDay[index])} r={active === index ? 5 : 3} fill="var(--series-reviews)" stroke="var(--card)" strokeWidth="2" />
          </g>
        ))}

        {days.length > 1 ? (
          <>
            <text x={x(days.length - 1)} y={y(callsPerDay[days.length - 1]) - 10} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--series-calls)">
              {t("dashboard.chartCalls")}
            </text>
            <text x={x(days.length - 1)} y={y(reviewsPerDay[days.length - 1]) + 16} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--series-reviews)">
              {t("dashboard.chartAiReviews")}
            </text>
          </>
        ) : null}

        {active !== null ? (
          <g className="pointer-events-none animate-[tooltip-in_var(--motion-fast)_var(--motion-ease)]">
            <rect x={Math.min(Math.max(x(active) - 70, 4), W - 144)} y={padTop + 4} width="140" height="80" rx="8" fill="var(--card)" stroke="var(--border)" />
            <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 10} y={padTop + 22} fontSize="11" fontWeight="700" className="fill-current text-foreground">{labelFor(days[active])}</text>
            <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 10} y={padTop + 39} fontSize="11" className="fill-current text-muted-foreground">{t("dashboard.chartCalls")}</text>
            <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 130} y={padTop + 39} fontSize="11" fontWeight="700" textAnchor="end" className="fill-current text-foreground">{callsPerDay[active]}</text>
            <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 10} y={padTop + 56} fontSize="11" className="fill-current text-muted-foreground">{t("dashboard.chartAiReviews")}</text>
            <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 130} y={padTop + 56} fontSize="11" fontWeight="700" textAnchor="end" className="fill-current text-foreground">{reviewsPerDay[active]}</text>
            {days[active].score !== null && days[active].score !== undefined ? (
              <>
                <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 10} y={padTop + 73} fontSize="11" className="fill-current text-muted-foreground">{t("dashboard.averageScore")}</text>
                <text x={Math.min(Math.max(x(active) - 70, 4), W - 144) + 130} y={padTop + 73} fontSize="11" fontWeight="700" textAnchor="end" className="fill-current text-foreground">{Math.round(Number(days[active].score))}</text>
              </>
            ) : null}
          </g>
        ) : null}
      </svg>
    </div>
  );
}

/** Inclusive day bounds in ISO-8601, matching the calls filter. */
/**
 * The API emits only days that had activity, so a quiet week arrives as a single
 * point and a line chart has nothing to draw. Counts are dense by nature — a day
 * with no calls is a real zero — so the window is filled back in before plotting.
 * (Scores are not filled this way: no calls is a gap, not a zero.)
 */
function fillTimeline(points: TimelinePoint[], range: DateRange | null): TimelinePoint[] {
  const byDate = new Map(points.map((point) => [point.date, point]));
  const last = points.length ? new Date(`${points[points.length - 1].date}T00:00:00`) : new Date();
  const end = range ? new Date(range.to) : new Date(Math.max(last.getTime(), Date.now()));
  const first = points.length ? new Date(`${points[0].date}T00:00:00`) : end;
  const start = range ? new Date(range.from) : new Date(new Date(end).setDate(end.getDate() - 6));
  // never let a wide window explode into hundreds of ticks
  const from = start < first && !range ? start : range ? start : new Date(Math.min(start.getTime(), first.getTime()));
  const span = Math.min(62, Math.max(1, Math.round((startOfDay(end).getTime() - startOfDay(from).getTime()) / 86400000) + 1));

  return Array.from({ length: span }, (_, index) => {
    const day = new Date(from);
    day.setDate(from.getDate() + index);
    const key = toISODate(day);
    const found = byDate.get(key);
    return { date: key, calls: found?.calls ?? 0, analyzed: found?.analyzed ?? 0, score: found?.score ?? null };
  });
}

/** Fallback for roles that cannot read the aggregate: bucket what we do have. */
function buildTimeline(calls: Call[], analyses: Analysis[], range: DateRange | null): TimelinePoint[] {
  const end = range ? new Date(range.to) : new Date();
  const start = range ? new Date(range.from) : new Date(new Date().setDate(end.getDate() - 6));
  const span = Math.min(31, Math.max(1, Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) + 1));
  return Array.from({ length: span }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const dayCalls = calls.filter((call) => call.started_at && sameDay(new Date(call.started_at), day));
    const analyzed = analyses.filter((analysis) => dayCalls.some((call) => call.id === objectId(analysis.call))).length;
    return { date: toISODate(day), calls: dayCalls.length, analyzed };
  });
}

function startOfDayISO(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
}

function endOfDayISO(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function Dashboard() {
  const router = useRouter();
  const t = useT();
  const { formatDate, formatDuration } = useFormatters();
  const labels = useLabels();
  const isAdmin = useIsAdmin();
  const user = useSessionStore((state) => state.user);
  // Greet whoever is signed in, not a name baked into the translations.
  const greetedName = user?.first_name || user?.name || user?.username || "";
  const [range, setRange] = useState<DateRange | null>(null);
  const calls = useApiResource(callsApi.list, demoCalls);
  const analyses = useApiResource(analysesApi.list, demoAnalyses);
  const leads = useApiResource(leadsApi.list, demoLeads);
  const statuses = useApiResource(leadStatusesApi.list, demoStatuses);
  const clients = useApiResource(clientsApi.list, demoClients);
  const scoredAnalyses = analyses.data.map((item) => scoreNumber(item.overall_score)).filter((score): score is number => score !== null);
  const avgScore = scoredAnalyses.length ? Math.round(scoredAnalyses.reduce((sum, value) => sum + value, 0) / scoredAnalyses.length) : null;
  const latestCalls = calls.data.slice(0, 5);
  // The backend does not produce overall_score yet: unscored reviews are ranked
  // after scored ones instead of being treated as a zero.
  const insights = analyses.data
    .slice()
    .sort((a, b) => {
      const left = scoreNumber(a.overall_score);
      const right = scoreNumber(b.overall_score);
      if (left === null && right === null) return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
      if (left === null) return 1;
      if (right === null) return -1;
      return left - right;
    })
    .slice(0, 4);
  // One server-side aggregate drives the KPIs and the chart, so the numbers are
  // company-wide rather than whatever happened to be on page one.
  const statsQuery = useMemo(
    () => ({
      started_after: range ? startOfDayISO(range.from) : undefined,
      started_before: range ? endOfDayISO(range.to) : undefined,
    }),
    [range],
  );
  const overview = useStats(statsApi.overview, statsQuery);
  // Operators may not read company-wide aggregates: fall back to their own rows.
  const score = overview.data?.overall_score ?? avgScore;
  const localTimeline = useMemo(() => buildTimeline(calls.data, analyses.data, range), [analyses.data, calls.data, range]);

  const ready = !overview.loading && !calls.loading && !analyses.loading && !leads.loading;
  const scoreBuckets = [
    { label: t("dashboard.strongConversations"), count: scoredAnalyses.filter((score) => score >= 85).length, tone: "success" as const },
    { label: t("dashboard.needsAttention"), count: scoredAnalyses.filter((score) => score >= 70 && score < 85).length, tone: "warning" as const },
    { label: t("dashboard.critical"), count: scoredAnalyses.filter((score) => score < 70).length, tone: "danger" as const },
  ];
  const byStatus = useMemo(() => statuses.data.map((status) => ({ status, leads: leads.data.filter((lead) => objectId(lead.status) === status.id) })), [leads.data, statuses.data]);

  return (
    <>
      <PageHeader
        title={greetedName ? t("dashboard.title", { greeting: t(relativeDayGreeting()), name: greetedName }) : t("dashboard.titleAnonymous", { greeting: t(relativeDayGreeting()) })}
        description={t("dashboard.description")}
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("dashboard.totalCalls"), value: calls.error ? t("common.unavailable") : <KpiValue value={overview.data?.calls ?? calls.count} ready={ready} />, icon: PhoneCall, href: "/calls" },
          { label: t("dashboard.aiReviews"), value: analyses.error ? t("common.unavailable") : <KpiValue value={overview.data?.analyzed ?? analyses.count} ready={ready} />, icon: Bot, href: "/ai-reviews" },
          { label: t("dashboard.averageScore"), value: score === null ? t("common.unavailable") : <KpiValue value={Math.round(score)} ready={ready} />, icon: Sparkles },
          { label: t("dashboard.newLeads"), value: leads.error ? t("common.unavailable") : <KpiValue value={overview.data?.leads ?? leads.count} ready={ready} />, icon: ClipboardList, href: "/leads" },
        ].map((kpi) => {
          return <KpiCard key={kpi.label} {...kpi} loading={calls.loading || analyses.loading || leads.loading} />;
        })}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader title={t("dashboard.callActivity")} action={<span className="text-xs text-muted-foreground">{range ? t("calendar.rangeHint") : t("dashboard.sevenDays")}</span>} />
          <CardContent>
            {!ready ? (
              <div className="h-56 animate-pulse rounded-md bg-muted/60" />
            ) : (
              <ActivityChart timeline={fillTimeline(overview.data?.timeline ?? localTimeline, range)} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.aiPerformance")} />
          <CardContent>
            <AIScore score={avgScore} size="lg" />
            <div className="mt-5 space-y-3">
              {scoreBuckets.map((bucket) => (
                <div key={bucket.label} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm text-muted-foreground">{bucket.label}</span>
                  <Badge tone={bucket.tone}>{bucket.count}</Badge>
                </div>
              ))}
              {analyses.data.length > 0 && scoredAnalyses.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">{t("dashboard.scoringUnavailable")}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader title={t("dashboard.aiInsights")} eyebrow={t("dashboard.aiInsightsEyebrow")} />
          <CardContent className="space-y-3">
            {analyses.loading ? <LoadingState label={t("dashboard.loadingInsights")} /> : analyses.error ? <ErrorState title={t("dashboard.loadInsightsError")} description={analyses.error} onRetry={analyses.reload} /> : insights.length === 0 ? <EmptyState title={t("dashboard.noReviewsTitle")} description={t("dashboard.noReviewsDescription")} /> : insights.map((insight) => {
              const score = scoreNumber(insight.overall_score);
              const tone = scoreTone(score);
              const call = calls.data.find((item) => item.id === objectId(insight.call));
              return (
                <button key={insight.id} className="w-full rounded-lg border border-border p-4 text-left transition hover:border-indigo-300 hover:bg-muted/60" onClick={() => router.push(`/calls/${objectId(insight.call) ?? call?.id ?? insight.id}`)}>
                  <div className="mb-3 flex items-center justify-between">
                    <Badge tone={score === null ? "neutral" : tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success"}>{score === null ? t("common.notAnalyzed") : tone === "danger" ? t("dashboard.critical") : tone === "warning" ? t("dashboard.attention") : t("dashboard.positive")}</Badge>
                    <ScoreBadge score={insight.overall_score} />
                  </div>
                  <p className="font-medium">{insight.summary}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.seller")}: {labels.person(call?.operator, call?.operator_detail)} · {t("dashboard.callNumber", { id: objectId(insight.call) ?? t("common.na") })} · {formatDate(insight.created_at)}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.recentCalls")} />
          {calls.loading ? <LoadingState label={t("dashboard.loadingRecentCalls")} /> : calls.error ? <ErrorState title={t("dashboard.loadRecentCallsError")} description={calls.error} onRetry={calls.reload} /> : latestCalls.length === 0 ? <EmptyState title={t("dashboard.noConversationsTitle")} description={t("dashboard.noConversationsDescription")} /> : <DataTable
            data={latestCalls}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/calls/${row.id}`)}
            columns={[
              { header: t("resources.client"), cell: (row) => row.client_phone ?? t("common.unknown") },
              ...(isAdmin ? [{ header: t("calls.operator"), cell: (row: Call) => labels.person(row.operator, row.operator_detail) }] : []),
              { header: t("calls.direction"), cell: (row) => { const direction = row.direction ?? "unknown"; const known = (CALL_DIRECTIONS as readonly string[]).includes(direction); return <Badge tone={known && direction !== "unknown" ? "ai" : "neutral"}>{known ? t(`calls.directions.${direction}`) : direction}</Badge>; } },
              { header: t("calls.duration"), cell: (row) => formatDuration(row.duration) },
              { header: t("calls.stage"), cell: (row) => <StatusBadge value={row.stage} label={(CALL_STAGES as readonly string[]).includes(row.stage ?? "") ? t(`calls.stages.${row.stage}`) : undefined} title={row.stage === "failed" ? row.error ?? undefined : undefined} /> },
              { header: t("calls.aiScore"), cell: (row) => <ScoreBadge score={analysisFor(row, analyses.data)?.overall_score} /> },
              { header: t("calls.started"), cell: (row) => formatDate(row.started_at) },
            ]}
          />}
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader title={t("dashboard.leadPipeline")} />
          <CardContent>
            {statuses.error ? <ErrorState title={t("dashboard.loadPipelineError")} description={statuses.error} onRetry={statuses.reload} /> : statuses.data.length === 0 ? <EmptyState title={t("dashboard.noStatusesTitle")} description={t("dashboard.noStatusesDescription")} /> : <div className="grid gap-3 md:grid-cols-3">
              {byStatus.map(({ status, leads }) => (
                <div key={status.id} className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <StatusBadge value={status.name} color={status.color} />
                    <span className="text-xs text-muted-foreground">{leads.length}</span>
                  </div>
                  <div className="space-y-2">
                    {leads.map((lead) => (
                      <div key={lead.id} className="rounded-md border border-border bg-card p-3 text-sm">
                        <p className="line-clamp-2 font-medium">{lead.title}</p>
                        <p className="mt-1 text-muted-foreground">{resolveRef(lead.client, clients.data, lead.client_detail)?.name ?? resolveRef(lead.client, clients.data, lead.client_detail)?.phone ?? t("common.unassigned")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("dashboard.recentLeads")} />
          <CardContent className="space-y-3">
            {leads.error ? <ErrorState title={t("dashboard.loadRecentLeadsError")} description={leads.error} onRetry={leads.reload} /> : leads.data.length === 0 ? <EmptyState title={t("dashboard.noLeadsTitle")} description={t("dashboard.noLeadsDescription")} /> : leads.data.slice(0, 4).map((lead: Lead) => (
              <button key={lead.id} className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left hover:bg-muted" onClick={() => router.push(`/leads/${lead.id}`)}>
                <div>
                  <p className="text-sm font-medium">{lead.title}</p>
                  <p className="text-xs text-muted-foreground">{resolveRef(lead.client, clients.data, lead.client_detail)?.name ?? resolveRef(lead.client, clients.data, lead.client_detail)?.phone ?? `#${objectId(lead.client) ?? ""}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  {lead.created_via?.toLowerCase().includes("ai") ? <Badge tone="ai">{t("common.aiCreated")}</Badge> : null}
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
