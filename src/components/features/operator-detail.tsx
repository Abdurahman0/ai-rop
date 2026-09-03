"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PhoneCall, Sparkles, Target, Timer } from "lucide-react";
import { statsApi, usersApi } from "@/lib/api/client";
import { dictionaries } from "@/i18n/dictionaries";
import { useLocale, useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { useApiItem } from "@/hooks/use-api-item";
import { useStats } from "@/hooks/use-stats";
import type { ID, OperatorStatsDetail, TimelinePoint } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DateRangeFilter, type DateRange } from "@/components/ui/date-picker";
import { bandColor, CriteriaBars, DistributionBar, ScoreMeter, scoreBand } from "@/components/ui/score-meter";
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
 * The operator's score per day. Columns, not a line: the days are discrete and
 * a short window (often a single day) has nothing to join up. Each bar is
 * coloured by its band and carries its number, so the status is never colour
 * alone.
 */
function ScoreTrend({ timeline }: { timeline: TimelinePoint[] }) {
  const t = useT();
  const { locale } = useLocale();
  const [active, setActive] = useState<number | null>(null);
  const points = timeline.filter((point) => point.score !== null && point.score !== undefined);

  if (points.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t("users.noStats")}</p>;

  const W = 640;
  const H = 190;
  const padLeft = 30;
  const padRight = 14;
  const padTop = 22;
  const padBottom = 30;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;
  const slot = plotW / points.length;
  // wide enough to read at one day, never so wide it looks like a block
  const barW = Math.max(10, Math.min(56, slot - 10));
  const x = (index: number) => padLeft + slot * index + slot / 2;
  const y = (value: number) => padTop + (1 - value / 100) * plotH;
  const months = dictionaries[locale].calendar.months;
  const labelFor = (point: TimelinePoint) => {
    const day = new Date(`${point.date}T00:00:00`);
    return `${months[day.getMonth()].slice(0, 3)} ${day.getDate()}`;
  };
  const tickEvery = Math.max(1, Math.ceil(points.length / 8));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full" role="img" aria-label={t("users.score")} onMouseLeave={() => setActive(null)}>
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line x1={padLeft} x2={W - padRight} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-border" strokeWidth="1" />
            <text x={padLeft - 7} y={y(tick) + 4} textAnchor="end" fontSize="10" className="fill-current text-muted-foreground">{tick}</text>
          </g>
        ))}
        {/* where "good" starts, so a bar can be judged without the legend */}
        <line x1={padLeft} x2={W - padRight} y1={y(85)} y2={y(85)} stroke="currentColor" className="text-emerald-500/40" strokeWidth="1" strokeDasharray="4 4" />

        {points.map((point, index) => {
          const value = Number(point.score);
          const band = scoreBand(value);
          const height = Math.max(3, (value / 100) * plotH);
          return (
            <g key={point.date} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} tabIndex={0} aria-label={`${labelFor(point)}: ${Math.round(value)}`}>
              <rect x={x(index) - slot / 2} y={padTop} width={slot} height={plotH} fill="transparent" />
              <rect
                className="score-bar"
                x={x(index) - barW / 2}
                y={y(value)}
                width={barW}
                height={height}
                rx="4"
                fill={bandColor[band]}
                opacity={active === null || active === index ? 1 : 0.55}
                style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
              />
              <text x={x(index)} y={y(value) - 7} textAnchor="middle" fontSize="11" fontWeight="700" className="fill-current text-foreground">
                {Math.round(value)}
              </text>
              {index % tickEvery === 0 || index === points.length - 1 ? (
                <text x={x(index)} y={H - 10} textAnchor="middle" fontSize="10" className="fill-current text-muted-foreground">{labelFor(point)}</text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {(["strong", "attention", "critical"] as const).map((band) => (
          <span key={band} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: bandColor[band] }} aria-hidden />
            {t(`users.${band}`)}
          </span>
        ))}
        {active !== null ? (
          <span className="ml-auto text-foreground">
            {labelFor(points[active])} · {points[active].calls ?? 0} {t("users.calls").toLowerCase()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A stat tile: label, one value, and a second dimension underneath — a meter of
 * the ratio it belongs to, or a line of context. Proportional figures, not
 * tabular: at this size tabular digits read loose. The page's hero number is the
 * score, so these stay a step smaller.
 */
function StatTile({
  icon: Icon,
  label,
  value,
  unit,
  ratio,
  context,
}: {
  icon: typeof PhoneCall;
  label: string;
  value: React.ReactNode;
  unit?: string;
  ratio?: number | null;
  context?: string;
}) {
  return (
    <div className="group rounded-lg border border-border bg-card p-4 transition duration-[var(--motion-fast)] hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition duration-[var(--motion-fast)] group-hover:bg-primary/15">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-3 flex items-baseline gap-1 text-2xl font-semibold leading-none text-foreground">
        {value}
        {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
      </p>

      {ratio !== null && ratio !== undefined ? (
        // the unfilled track is a lighter step of the same hue, so the state
        // reads across the whole bar
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-[var(--motion-slow)] ease-[var(--motion-ease)]"
            style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
          />
        </div>
      ) : null}

      {context ? <p className={`text-xs text-muted-foreground ${ratio === null || ratio === undefined ? "mt-3" : "mt-2"}`}>{context}</p> : null}
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
  const totalTalkSeconds = durations.reduce((sum, value) => sum + value, 0);
  const avgCallSeconds = durations.length ? Math.round(totalTalkSeconds / durations.length) : null;

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

        <div className="grid gap-3 sm:grid-cols-2">
          <StatTile
            icon={PhoneCall}
            label={t("users.calls")}
            value={data.calls ?? 0}
            ratio={data.calls ? (data.analyzed ?? 0) / data.calls : null}
            context={t("users.callsContext", { analyzed: data.analyzed ?? 0, calls: data.calls ?? 0 })}
          />
          <StatTile
            icon={Sparkles}
            label={t("intelligence.reviewsTitle")}
            value={data.analyzed ?? 0}
            ratio={data.calls ? (data.analyzed ?? 0) / data.calls : null}
            context={t("users.reviewsContext", { percent: data.calls ? Math.round(((data.analyzed ?? 0) / data.calls) * 100) : 0 })}
          />
          <StatTile
            icon={Timer}
            label={t("users.avgCall")}
            value={formatDuration(avgCallSeconds)}
            context={totalTalkSeconds ? t("users.talkContext", { total: formatDuration(totalTalkSeconds) }) : undefined}
          />
          <StatTile
            icon={Target}
            label={t("users.conversion")}
            value={data.conversion_rate === undefined ? "—" : Math.round(data.conversion_rate * 100)}
            unit={data.conversion_rate === undefined ? undefined : "%"}
            ratio={data.conversion_rate ?? null}
            context={t("users.conversionContext", { leads: data.leads_created ?? 0, calls: data.calls ?? 0 })}
          />
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
