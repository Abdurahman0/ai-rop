"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { analysesApi, callsApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { demoAnalyses, demoCalls } from "@/lib/data/demo";
import { objectId, titleCase } from "@/lib/utils/format";
import { useApiResource } from "@/hooks/use-api-resource";
import type { Call } from "@/types/domain";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { CALL_DIRECTIONS, CALL_STAGES } from "@/types/domain";
import { AIScore } from "@/components/ui/ai-score";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/shell/page-header";

export function CallsPage() {
  const router = useRouter();
  const t = useT();
  const { formatDate, formatDuration } = useFormatters();
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("");
  const [stage, setStage] = useState("");
  const [date, setDate] = useState(new Date());
  const calls = useApiResource(callsApi.list, demoCalls);
  const analyses = useApiResource(analysesApi.list, demoAnalyses);
  const filtered = useMemo(
    () =>
      calls.data.filter((call) => {
        const text = `${call.client_phone ?? ""} ${call.operator ?? ""}`.toLowerCase();
        return text.includes(query.toLowerCase()) && (!direction || call.direction?.toLowerCase() === direction) && (!stage || call.stage?.toLowerCase() === stage);
      }),
    [calls.data, direction, query, stage],
  );

  return (
    <>
      <PageHeader
        title={t("calls.title")}
        description={t("calls.description")}
        actions={<><DatePicker value={date} onChange={setDate} /><Select label={t("calls.direction")} value={direction} onChange={setDirection} options={[{ label: t("common.all"), value: "" }, { label: t("calls.inbound"), value: "inbound" }, { label: t("calls.outbound"), value: "outbound" }]} /><Select label={t("calls.stage")} value={stage} onChange={setStage} options={[{ label: t("common.all"), value: "" }, ...CALL_STAGES.map((value) => ({ label: t(`calls.stages.${value}`), value }))]} /></>}
      />
      <Card>
        <div className="border-b border-border p-4"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("calls.searchPlaceholder")} /></div>
        {calls.loading ? <TableSkeleton /> : calls.error ? <ErrorState title={t("calls.loadError")} description={calls.error} onRetry={calls.reload} /> : filtered.length === 0 ? <EmptyState title={t("calls.emptyTitle")} description={t("calls.emptyDescription")} /> : (
          <DataTable
            data={filtered}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/calls/${row.id}`)}
            columns={[
              { header: t("calls.clientPhone"), cell: (row) => row.client_phone ?? t("common.unknown") },
              { header: t("calls.operator"), cell: (row) => row.operator ?? t("common.unassigned") },
              { header: t("calls.direction"), cell: (row) => { const direction = row.direction ?? "unknown"; const known = (CALL_DIRECTIONS as readonly string[]).includes(direction); return <Badge tone={known && direction !== "unknown" ? "ai" : "neutral"}>{known ? t(`calls.directions.${direction}`) : titleCase(direction)}</Badge>; } },
              { header: t("calls.started"), cell: (row) => formatDate(row.started_at) },
              { header: t("calls.duration"), cell: (row) => formatDuration(row.duration) },
              { header: t("calls.stage"), cell: (row) => <StatusBadge value={row.stage} label={(CALL_STAGES as readonly string[]).includes(row.stage ?? "") ? t(`calls.stages.${row.stage}`) : undefined} title={row.stage === "failed" ? row.error ?? undefined : undefined} /> },
              { header: t("calls.aiScore"), cell: (row: Call) => {
                const score = analyses.data.find((analysis) => objectId(analysis.call) === row.id)?.overall_score;
                return score === null || score === undefined ? <span className="text-xs text-muted-foreground">{t("common.notAnalyzed")}</span> : <AIScore score={score} size="sm" />;
              } },
              { header: t("calls.action"), cell: () => <span className="text-xs font-medium text-indigo-600">{t("common.review")}</span> },
            ]}
          />
        )}
        {!calls.loading && !calls.error && filtered.length > 0 ? <Pagination page={calls.meta.page} count={calls.count} pageSize={calls.meta.pageSize} onPageChange={calls.setPage} /> : null}
      </Card>
    </>
  );
}
