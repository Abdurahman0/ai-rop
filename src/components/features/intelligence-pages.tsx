"use client";

import { useRouter } from "next/navigation";
import { analysesApi, callsApi, transcriptsApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { demoAnalyses, demoCalls, demoTranscripts } from "@/lib/data/demo";
import { objectId } from "@/lib/utils/format";
import { useApiItem } from "@/hooks/use-api-item";
import { useApiResource } from "@/hooks/use-api-resource";
import type { TranscriptSegment } from "@/types/domain";
import { Badge, ScoreBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { PageHeader } from "@/components/shell/page-header";

export function AIReviewsPage() {
  const router = useRouter();
  const t = useT();
  const { formatDate } = useFormatters();
  const analyses = useApiResource(analysesApi.list, demoAnalyses);
  const calls = useApiResource(callsApi.list, demoCalls);
  return (
    <>
      <PageHeader title={t("intelligence.reviewsTitle")} description={t("intelligence.reviewsDescription")} actions={<><Select label={t("intelligence.score")} value="" onChange={() => undefined} options={[{ label: t("common.all"), value: "" }, { label: t("intelligence.critical"), value: "critical" }, { label: t("intelligence.attention"), value: "attention" }, { label: t("intelligence.strong"), value: "strong" }]} /><Select label={t("intelligence.leadCreated")} value="" onChange={() => undefined} options={[{ label: t("common.all"), value: "" }, { label: t("common.yes"), value: "yes" }, { label: t("common.no"), value: "no" }]} /></>} />
      <Card>
        {analyses.loading ? <TableSkeleton /> : analyses.error ? <ErrorState title={t("intelligence.loadReviewsError")} description={analyses.error} onRetry={analyses.reload} /> : analyses.data.length === 0 ? <EmptyState title={t("intelligence.emptyReviewsTitle")} description={t("intelligence.emptyReviewsDescription")} /> : (
          <DataTable
            data={analyses.data}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/calls/${objectId(row.call) ?? row.id}`)}
            columns={[
              { header: t("intelligence.call"), cell: (row) => `#${objectId(row.call) ?? t("common.na")}` },
              { header: t("intelligence.summary"), cell: (row) => <span className="line-clamp-2">{row.summary ?? t("intelligence.noSummary")}</span> },
              { header: t("intelligence.score"), cell: (row) => <ScoreBadge score={row.overall_score} /> },
              { header: t("intelligence.leadCreated"), cell: (row) => row.lead_created ? <Badge tone="success">{t("common.yes")}</Badge> : <Badge>{t("common.no")}</Badge> },
              { header: t("intelligence.model"), cell: (row) => row.model_name ?? t("common.notRecorded") },
              { header: t("intelligence.created"), cell: (row) => formatDate(row.created_at) },
            ]}
          />
        )}
        {!analyses.loading && !analyses.error && analyses.data.length > 0 ? <Pagination page={analyses.meta.page} count={analyses.count} pageSize={analyses.meta.pageSize} onPageChange={analyses.setPage} /> : null}
      </Card>
      {!calls.error ? <div className="mt-4 grid gap-4 md:grid-cols-3">
        {calls.data.slice(0, 3).map((call) => (
          <Card key={call.id} className="p-4">
            <p className="text-sm font-medium">{t("dashboard.callNumber", { id: call.id })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{call.operator ?? t("common.unknown")} · {call.client_phone}</p>
          </Card>
        ))}
      </div> : null}
    </>
  );
}

export function TranscriptsPage() {
  const router = useRouter();
  const t = useT();
  const { formatDate } = useFormatters();
  const transcripts = useApiResource(transcriptsApi.list, demoTranscripts);
  return (
    <>
      <PageHeader title={t("intelligence.transcriptsTitle")} description={t("intelligence.transcriptsDescription")} />
      <Card>
        {transcripts.loading ? <TableSkeleton /> : transcripts.error ? <ErrorState title={t("intelligence.loadTranscriptsError")} description={transcripts.error} onRetry={transcripts.reload} /> : transcripts.data.length === 0 ? <EmptyState title={t("intelligence.emptyTranscriptsTitle")} description={t("intelligence.emptyTranscriptsDescription")} /> : (
          <DataTable
            data={transcripts.data}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/transcripts/${row.id}`)}
            columns={[
              { header: t("intelligence.call"), cell: (row) => `#${objectId(row.call) ?? t("common.na")}` },
              { header: t("intelligence.provider"), cell: (row) => row.provider ?? t("common.notRecorded") },
              { header: t("intelligence.preview"), cell: (row) => <span className="line-clamp-1 text-muted-foreground">{row.text ?? t("intelligence.segmentedTranscript")}</span> },
              { header: t("intelligence.createdAt"), cell: (row) => formatDate(row.created_at) },
            ]}
          />
        )}
        {!transcripts.loading && !transcripts.error && transcripts.data.length > 0 ? <Pagination page={transcripts.meta.page} count={transcripts.count} pageSize={transcripts.meta.pageSize} onPageChange={transcripts.setPage} /> : null}
      </Card>
    </>
  );
}

export function TranscriptDetail({ id }: { id: string }) {
  const t = useT();
  const transcriptItem = useApiItem(transcriptsApi.get, id, demoTranscripts.find((item) => String(item.id) === id));
  const transcript = transcriptItem.data;
  if (transcriptItem.loading) return <TableSkeleton />;
  if (transcriptItem.error) return <ErrorState title={t("intelligence.loadTranscriptError")} description={transcriptItem.error} onRetry={transcriptItem.reload} />;
  if (!transcript) return <EmptyState title={t("intelligence.transcriptNotFound")} description={t("intelligence.transcriptNotFoundDescription")} />;
  return (
    <>
      <PageHeader title={`#${transcript?.id ?? id}`} description={`${t("dashboard.callNumber", { id: objectId(transcript?.call) ?? t("common.na") })} · ${transcript?.provider ?? t("intelligence.providerNotRecorded")}`} />
      <Card>
        <CardHeader title={t("intelligence.fullTranscript")} />
        <CardContent className="space-y-3">
          {Array.isArray(transcript?.segments) ? (transcript.segments as TranscriptSegment[]).map((segment, index) => (
            <div key={index} className="rounded-lg border border-border bg-background/60 p-4">
              <Badge tone={segment.speaker?.toLowerCase().includes("customer") ? "ai" : "neutral"}>{segment.speaker ?? t("intelligence.speaker", { number: index + 1 })}</Badge>
              <p className="mt-3 leading-7">{segment.text}</p>
            </div>
          )) : <p className="whitespace-pre-wrap leading-8">{transcript?.text ?? t("intelligence.noTranscriptText")}</p>}
        </CardContent>
      </Card>
    </>
  );
}
