"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PhoneCall, Sparkles, Target, Timer } from "lucide-react";
import { statsApi, usersApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { useApiItem } from "@/hooks/use-api-item";
import { useStats } from "@/hooks/use-stats";
import type { ID, OperatorStatsDetail, TimelinePoint } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-picker";
import { CriteriaBars, DistributionBar, ScoreMeter, scoreBand } from "@/components/ui/score-meter";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { PageHeader } from "@/components/shell/page-header";

function startOfDayISO(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
}

function endOfDayISO(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
}

/**
 * One operator's score over the window. A single series whose job is the trend,
 * so it is drawn in one hue — no legend needed, the card title names it.
 */
function ScoreTrend({ timeline }: { timeline: TimelinePoint[] }) {
  const t = useT();
  const [active, setActive] = useState<number | null>(null);
  const points = timeline.filter((point) => point.score !== null && point.score !== undefined);

  if (points.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t("users.noStats")}</p>;

  const W = 640;
  const H = 180;
  const pad = 26;
  const x = (index: number) => (points.length === 1 ? W / 2 : pad + (index / (points.length - 1)) * (W - pad * 2));
  const y = (value: number) => pad + (1 - value / 100) * (H - pad * 2);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(Number(point.score))}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label={t("users.score")} onMouseLeave={() => setActive(null)}>
      <defs>
        <clipPath id="trend-reveal">
          <rect className="chart-wipe" x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      {/* the score bands, so a point reads as good or bad without a legend */}
      {[
        { from: 85, to: 100, className: "text-emerald-500/10" },
        { from: 70, to: 85, className: "text-amber-500/10" },
        { from: 0, to: 70, className: "text-red-500/10" },
      ].map((band) => (
        <rect key={band.from} x={pad} y={y(band.to)} width={W - pad * 2} height={y(band.from) - y(band.to)} className={`fill-current ${band.className}`} />
      ))}
      {[0, 50, 100].map((tick) => (
        <g key={tick}>
          <line x1={pad} x2={W - pad} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-border" strokeWidth="1" />
          <text x={pad - 6} y={y(tick) + 4} textAnchor="end" fontSize="10" className="fill-current text-muted-foreground">{tick}</text>
        </g>
      ))}
      <g clipPath="url(#trend-reveal)">
        <path d={path} fill="none" stroke="var(--series-calls)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {points.map((point, index) => (
        <g key={point.date} onMouseEnter={() => setActive(index)} tabIndex={0} onFocus={() => setActive(index)} aria-label={`${point.date}: ${point.score}`}>
          <rect x={x(index) - 14} y={pad} width="28" height={H - pad * 2} fill="transparent" />
          <circle className="chart-dot" cx={x(index)} cy={y(Number(point.score))} r={active === index ? 5 : 3.5} fill="var(--series-calls)" stroke="var(--card)" strokeWidth="2" />
          {active === index ? (
            <g className="pointer-events-none">
              <rect x={Math.min(Math.max(x(index) - 46, 4), W - 96)} y={y(Number(point.score)) - 42} width="92" height="34" rx="7" fill="var(--card)" stroke="var(--border)" />
              <text x={Math.min(Math.max(x(index) - 46, 4), W - 96) + 8} y={y(Number(point.score)) - 27} fontSize="10" className="fill-current text-muted-foreground">{point.date}</text>
              <text x={Math.min(Math.max(x(index) - 46, 4), W - 96) + 8} y={y(Number(point.score)) - 14} fontSize="12" fontWeight="700" className="fill-current text-foreground">
                {Math.round(Number(point.score))} · {point.calls ?? 0} {t("users.calls").toLowerCase()}
              </text>
            </g>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof PhoneCall; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function OperatorDetail({ id }: { id: string }) {
  const t = useT();
  const { formatDate, formatDuration } = useFormatters();
  const [range, setRange] = useState<DateRange | null>(null);
  const query = useMemo(
    () => ({
      started_after: range ? startOfDayISO(range.from) : undefined,
      started_before: range ? endOfDayISO(range.to) : undefined,
    }),
    [range],
  );
  const loader = useMemo(() => (params?: Record<string, string | number | undefined>) => statsApi.operator(id as ID, params), [id]);
  const stats = useStats<OperatorStatsDetail>(loader, query);
  const user = useApiItem(usersApi.get, id);

  if (stats.loading) return <TableSkeleton />;
  if (stats.forbidden) return <EmptyState title={t("users.statsForbidden")} description={t("users.notFoundDescription")} />;
  if (stats.error) return <ErrorState title={t("users.loadError")} description={stats.error} onRetry={stats.reload} />;
  if (!stats.data) return <EmptyState title={t("users.notFound")} description={t("users.notFoundDescription")} />;

  const data = stats.data;
  const name = data.operator?.name || user.data?.name || user.data?.username || String(id);
  // The detail response carries no talk-time fields, so the average comes from
  // the scored calls it does list — null when there is nothing to average.
  const durations = (data.recent_calls ?? []).map((call) => call.duration_seconds).filter((value): value is number => typeof value === "number" && value > 0);
  const avgCallSeconds = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null;

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          href="/users"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("callDetail.back")}
        </Link>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <PageHeader
        title={name}
        description={user.data?.email || data.operator?.username || ""}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("users.score")}</p>
          <div className="mt-3">
            <ScoreMeter score={data.overall_score} size="lg" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Badge tone={scoreBand(data.overall_score) === "strong" ? "success" : scoreBand(data.overall_score) === "attention" ? "warning" : scoreBand(data.overall_score) === "critical" ? "danger" : "neutral"}>
              {t(`users.${scoreBand(data.overall_score) === "none" ? "attention" : scoreBand(data.overall_score)}`)}
            </Badge>
            {data.score_trend !== null && data.score_trend !== undefined ? (
              <span className={`text-xs ${data.score_trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {data.score_trend >= 0 ? "+" : ""}
                {data.score_trend.toFixed(1)} {t("users.trend")}
              </span>
            ) : null}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{t("users.distribution")}</p>
            <DistributionBar distribution={data.score_distribution} />
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={PhoneCall} label={t("users.calls")} value={data.calls ?? 0} />
          <Metric icon={Sparkles} label={t("intelligence.reviewsTitle")} value={data.analyzed ?? 0} />
          <Metric icon={Timer} label={t("users.avgCall")} value={formatDuration(avgCallSeconds)} />
          <Metric icon={Target} label={t("users.conversion")} value={data.conversion_rate === undefined ? "—" : `${Math.round(data.conversion_rate * 100)}%`} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={t("users.score")} eyebrow={t("dashboard.callActivity")} />
          <CardContent>
            <ScoreTrend timeline={data.timeline ?? []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title={t("users.criteria")} />
          <CardContent>
            <CriteriaBars criteria={data.criteria} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={t("users.byClient")} />
        {(data.by_client ?? []).length === 0 ? (
          <EmptyState title={t("users.noStats")} description={t("users.emptyDescription")} />
        ) : (
          <DataTable
            data={data.by_client ?? []}
            rowKey={(row) => String(row.client.id)}
            columns={[
              {
                header: t("resources.client"),
                cell: (row) => (
                  <Link className="font-medium text-primary hover:underline" href={`/clients/${row.client.id}`}>
                    {row.client.name || row.client.phone}
                  </Link>
                ),
              },
              { header: t("users.calls"), cell: (row) => <span className="tabular-nums">{row.calls}</span> },
              { header: t("users.score"), cell: (row) => <span className="w-24 block"><ScoreMeter score={row.overall_score} size="sm" /></span> },
              {
                header: t("users.worstCall"),
                cell: (row) =>
                  row.worst_call ? (
                    <Link className="text-primary hover:underline" href={`/calls/${row.worst_call.id}`}>
                      {row.worst_call.score === null ? "—" : Math.round(row.worst_call.score)}
                    </Link>
                  ) : (
                    "—"
                  ),
              },
              { header: t("users.lastCall"), cell: (row) => formatDate(row.last_call_at) },
            ]}
          />
        )}
      </Card>

      <Card className="mt-4">
        <CardHeader title={t("users.recentCalls")} />
        {(data.recent_calls ?? []).length === 0 ? (
          <EmptyState title={t("users.noStats")} description={t("users.emptyDescription")} />
        ) : (
          <CardContent className="space-y-2">
            {(data.recent_calls ?? []).map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-start gap-4 rounded-lg border border-border bg-background/60 p-4 transition duration-[var(--motion-fast)] hover:border-primary/40 hover:bg-muted"
              >
                <span className="w-20 shrink-0"><ScoreMeter score={call.overall_score} size="sm" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {call.client?.name || call.client?.phone || t("common.unknown")}
                    <span className="text-xs font-normal text-muted-foreground">
                      {formatDate(call.started_at)} · {formatDuration(call.duration_seconds ?? null)}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{call.summary}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        )}
      </Card>
    </>
  );
}
