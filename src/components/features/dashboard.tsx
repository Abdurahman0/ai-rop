"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Bot, ClipboardList, PhoneCall, Sparkles, type LucideIcon } from "lucide-react";
import { analysesApi, callsApi, clientsApi, leadsApi, leadStatusesApi } from "@/lib/api/client";
import { dictionaries } from "@/i18n/dictionaries";
import { useLocale, useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { demoAnalyses, demoCalls, demoClients, demoLeads, demoStatuses } from "@/lib/data/demo";
import { objectId, relativeDayGreeting, resolveRef, scoreTone } from "@/lib/utils/format";
import { useApiResource } from "@/hooks/use-api-resource";
import { CALL_DIRECTIONS, CALL_STAGES, type Analysis, type Call, type Lead } from "@/types/domain";
import { Badge, ScoreBadge, StatusBadge } from "@/components/ui/badge";
import { AIScore } from "@/components/ui/ai-score";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
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

function KpiCard({ label, value, icon: Icon, href, loading }: { label: string; value: ReactNode; icon: LucideIcon; href?: string; loading: boolean }) {
  const content = (
    <Card className={`p-5 ${href ? "group hover:border-primary/40 hover:shadow-md" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-indigo-500 transition duration-[var(--motion-fast)] group-hover:scale-110" />
      </div>
      <p className="mt-4 text-3xl font-semibold">{loading ? "..." : value}</p>
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

function MiniChart({ calls, analyses }: { calls: Call[]; analyses: Analysis[] }) {
  const t = useT();
  const { locale } = useLocale();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const points = days.map((day) => calls.filter((call) => call.started_at && new Date(call.started_at).toDateString() === day.toDateString()).length);
  const analyzed = days.map((day) =>
    analyses.filter((analysis) => {
      const call = calls.find((item) => item.id === objectId(analysis.call));
      return call?.started_at && new Date(call.started_at).toDateString() === day.toDateString();
    }).length,
  );
  const max = Math.max(1, ...points, ...analyzed);
  const yFor = (value: number) => 190 - (value / max) * 140;
  const xFor = (index: number) => 24 + index * 110;
  const labelFor = (date: Date) => `${dictionaries[locale].calendar.months[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
  const activeX = activeIndex === null ? 0 : xFor(activeIndex);
  const activeY = activeIndex === null ? 0 : yFor(Math.max(points[activeIndex] ?? 0, analyzed[activeIndex] ?? 0));
  const tooltipX = activeX > 540 ? activeX - 174 : activeX + 18;
  const tooltipY = Math.max(12, Math.min(126, activeY - 54));
  return (
    <div className="h-56">
      <svg viewBox="0 0 700 220" className="h-full w-full" role="img" aria-label={t("dashboard.callActivity")}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 90, 140, 190].map((y) => (
          <line key={y} x1="24" x2="684" y1={y} y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />
        ))}
        <path d={`M24 ${yFor(points[0] ?? 0)} ${points.map((p, i) => `L ${xFor(i)} ${yFor(p)}`).join(" ")} L684 210 L24 210 Z`} fill="url(#area)" />
        <path d={`M24 ${yFor(points[0] ?? 0)} ${points.map((p, i) => `L ${xFor(i)} ${yFor(p)}`).join(" ")}`} fill="none" stroke="#4f46e5" strokeWidth="3" />
        <path d={`M24 ${yFor(analyzed[0] ?? 0)} ${analyzed.map((p, i) => `L ${xFor(i)} ${yFor(p)}`).join(" ")}`} fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="6 6" />
        {days.map((day, index) => {
          const x = xFor(index);
          const callY = yFor(points[index] ?? 0);
          const reviewY = yFor(analyzed[index] ?? 0);
          const active = activeIndex === index;
          return (
            <g key={day.toISOString()} className="cursor-pointer" onMouseEnter={() => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)} onFocus={() => setActiveIndex(index)} onBlur={() => setActiveIndex(null)} tabIndex={0} aria-label={`${labelFor(day)} ${t("dashboard.chartCalls")} ${points[index] ?? 0}, ${t("dashboard.chartAiReviews")} ${analyzed[index] ?? 0}`}>
              <line x1={x} x2={x} y1="30" y2="196" stroke="currentColor" strokeWidth="1" className={`text-border transition-opacity duration-[var(--motion-fast)] ${active ? "opacity-100" : "opacity-0"}`} />
              <circle cx={x} cy={callY} r={active ? 6 : 4} fill="#4f46e5" stroke="var(--card)" strokeWidth="3" />
              <circle cx={x} cy={reviewY} r={active ? 6 : 4} fill="#10b981" stroke="var(--card)" strokeWidth="3" />
              <circle cx={x} cy="110" r="34" fill="transparent" />
            </g>
          );
        })}
        {activeIndex !== null ? (
          <g className="animate-[tooltip-in_var(--motion-fast)_var(--motion-ease)] pointer-events-none">
            <rect x={tooltipX} y={tooltipY} width="156" height="78" rx="var(--radius)" fill="var(--card)" stroke="var(--border)" />
            <text x={tooltipX + 12} y={tooltipY + 21} fill="var(--foreground)" fontSize="13" fontWeight="700">{labelFor(days[activeIndex])}</text>
            <text x={tooltipX + 12} y={tooltipY + 45} fill="var(--muted-foreground)" fontSize="12">{t("dashboard.chartCalls")}</text>
            <text x={tooltipX + 126} y={tooltipY + 45} fill="var(--foreground)" fontSize="12" fontWeight="700" textAnchor="end">{points[activeIndex]}</text>
            <text x={tooltipX + 12} y={tooltipY + 64} fill="var(--muted-foreground)" fontSize="12">{t("dashboard.chartAiReviews")}</text>
            <text x={tooltipX + 126} y={tooltipY + 64} fill="var(--foreground)" fontSize="12" fontWeight="700" textAnchor="end">{analyzed[activeIndex]}</text>
          </g>
        ) : null}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("dashboard.recentCallsCount", { count: calls.length })}</span>
        <span>{t("dashboard.analyzedCount", { count: analyses.length })}</span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const router = useRouter();
  const t = useT();
  const { formatDate, formatDuration } = useFormatters();
  const [date, setDate] = useState(new Date());
  const calls = useApiResource(callsApi.list, demoCalls);
  const analyses = useApiResource(analysesApi.list, demoAnalyses);
  const leads = useApiResource(leadsApi.list, demoLeads);
  const statuses = useApiResource(leadStatusesApi.list, demoStatuses);
  const clients = useApiResource(clientsApi.list, demoClients);
  const scoredAnalyses = analyses.data.map((item) => scoreNumber(item.overall_score)).filter((score): score is number => score !== null);
  const avgScore = scoredAnalyses.length ? Math.round(scoredAnalyses.reduce((sum, score) => sum + score, 0) / scoredAnalyses.length) : null;
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
  const scoreBuckets = [
    { label: t("dashboard.strongConversations"), count: scoredAnalyses.filter((score) => score >= 85).length, tone: "success" as const },
    { label: t("dashboard.needsAttention"), count: scoredAnalyses.filter((score) => score >= 70 && score < 85).length, tone: "warning" as const },
    { label: t("dashboard.critical"), count: scoredAnalyses.filter((score) => score < 70).length, tone: "danger" as const },
  ];
  const byStatus = useMemo(() => statuses.data.map((status) => ({ status, leads: leads.data.filter((lead) => objectId(lead.status) === status.id) })), [leads.data, statuses.data]);

  return (
    <>
      <PageHeader
        title={t("dashboard.title", { greeting: t(relativeDayGreeting()) })}
        description={t("dashboard.description")}
        actions={<DatePicker value={date} onChange={setDate} />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t("dashboard.totalCalls"), value: calls.error ? t("common.unavailable") : calls.count, icon: PhoneCall, href: "/calls" },
          { label: t("dashboard.aiReviews"), value: analyses.error ? t("common.unavailable") : analyses.count, icon: Bot, href: "/ai-reviews" },
          { label: t("dashboard.averageScore"), value: analyses.error || avgScore === null ? t("common.unavailable") : avgScore, icon: Sparkles },
          { label: t("dashboard.newLeads"), value: leads.error ? t("common.unavailable") : leads.count, icon: ClipboardList, href: "/leads" },
        ].map((kpi) => {
          return <KpiCard key={kpi.label} {...kpi} loading={calls.loading || analyses.loading || leads.loading} />;
        })}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader title={t("dashboard.callActivity")} action={<div className="flex gap-1"><Badge tone="ai">{t("dashboard.sevenDays")}</Badge><Badge>{t("dashboard.thirtyDays")}</Badge></div>} />
          <CardContent>
            <MiniChart calls={calls.data} analyses={analyses.data} />
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
                  <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.seller")}: {call?.operator ?? t("common.unknown")} · {t("dashboard.callNumber", { id: objectId(insight.call) ?? t("common.na") })} · {formatDate(insight.created_at)}</p>
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
              { header: t("calls.operator"), cell: (row) => row.operator ?? t("common.unassigned") },
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
                        <p className="font-medium">{lead.title}</p>
                        <p className="mt-1 text-muted-foreground">{resolveRef(lead.client, clients.data)?.name ?? resolveRef(lead.client, clients.data)?.phone ?? t("common.unassigned")}</p>
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
                  <p className="text-xs text-muted-foreground">{resolveRef(lead.client, clients.data)?.name ?? resolveRef(lead.client, clients.data)?.phone ?? `#${objectId(lead.client) ?? ""}`}</p>
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
