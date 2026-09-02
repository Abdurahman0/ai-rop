"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analysesApi, callAudioPath, callsApi, transcriptsApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { useLabels } from "@/i18n/use-labels";
import { demoAnalyses, demoCalls, demoTranscripts } from "@/lib/data/demo";
import { objectId, parseSkipReason, speakerIndex } from "@/lib/utils/format";
import { useApiItem } from "@/hooks/use-api-item";
import { useApiResource } from "@/hooks/use-api-resource";
import { SKIP_REASONS, type TranscriptSegment } from "@/types/domain";
import { Badge, ScoreBadge } from "@/components/ui/badge";
import { activeSegmentIndex, AudioPlayer, useTranscriptAudio } from "@/components/ui/audio-player";
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
  const labels = useLabels();
  const [scoreFilter, setScoreFilter] = useState("");
  const [leadFilter, setLeadFilter] = useState("");
  const analyses = useApiResource(analysesApi.list, demoAnalyses);
  const calls = useApiResource(callsApi.list, demoCalls);
  const filtered = useMemo(
    () =>
      analyses.data.filter((analysis) => {
        if (leadFilter === "yes" && !analysis.lead_created) return false;
        if (leadFilter === "no" && analysis.lead_created) return false;
        if (!scoreFilter) return true;
        // overall_score is not produced by the backend yet: unscored rows drop
        // out of every score filter rather than counting as zero.
        const score = analysis.overall_score === null || analysis.overall_score === undefined ? null : Number(analysis.overall_score);
        if (score === null || !Number.isFinite(score)) return false;
        if (scoreFilter === "critical") return score < 70;
        if (scoreFilter === "attention") return score >= 70 && score < 85;
        return score >= 85;
      }),
    [analyses.data, leadFilter, scoreFilter],
  );

  return (
    <>
      <PageHeader title={t("intelligence.reviewsTitle")} description={t("intelligence.reviewsDescription")} actions={<><Select label={t("intelligence.score")} value={scoreFilter} onChange={setScoreFilter} options={[{ label: t("common.all"), value: "" }, { label: t("intelligence.critical"), value: "critical" }, { label: t("intelligence.attention"), value: "attention" }, { label: t("intelligence.strong"), value: "strong" }]} /><Select label={t("intelligence.leadCreated")} value={leadFilter} onChange={setLeadFilter} options={[{ label: t("common.all"), value: "" }, { label: t("common.yes"), value: "yes" }, { label: t("common.no"), value: "no" }]} /></>} />
      <Card>
        {analyses.loading ? <TableSkeleton /> : analyses.error ? <ErrorState title={t("intelligence.loadReviewsError")} description={analyses.error} onRetry={analyses.reload} /> : filtered.length === 0 ? <EmptyState title={t("intelligence.emptyReviewsTitle")} description={t("intelligence.emptyReviewsDescription")} /> : (
          <DataTable
            data={filtered}
            rowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/calls/${objectId(row.call) ?? row.id}`)}
            columns={[
              { header: t("intelligence.call"), cell: (row) => `#${objectId(row.call) ?? t("common.na")}` },
              { header: t("intelligence.summary"), cell: (row) => <span className="line-clamp-2">{row.summary ?? t("intelligence.noSummary")}</span> },
              { header: t("intelligence.score"), cell: (row) => <ScoreBadge score={row.overall_score} /> },
              { header: t("intelligence.leadCreated"), cell: (row) => row.lead_created ? <Badge tone="success">{t("common.yes")}</Badge> : <span className="flex items-center gap-2"><Badge>{t("common.no")}</Badge><SkipReason reason={row.skip_reason} /></span> },
              { header: t("intelligence.model"), cell: (row) => row.model_name ?? t("common.notRecorded") },
              { header: t("intelligence.created"), cell: (row) => formatDate(row.created_at) },
            ]}
          />
        )}
        {!analyses.loading && !analyses.error && filtered.length > 0 ? <Pagination page={analyses.meta.page} count={analyses.count} pageSize={analyses.meta.pageSize} onPageChange={analyses.setPage} /> : null}
      </Card>
      {!calls.error ? <div className="mt-4 grid gap-4 md:grid-cols-3">
        {calls.data.slice(0, 3).map((call) => (
          <Card key={call.id} className="p-4">
            <p className="text-sm font-medium">{t("dashboard.callNumber", { id: call.id })}</p>
            <p className="mt-1 text-sm text-muted-foreground">{labels.person(call.operator, call.operator_detail)} · {call.client_phone}</p>
          </Card>
        ))}
      </div> : null}
    </>
  );
}

/** Renders why an analyzed call did not open a lead. */
export function SkipReason({ reason }: { reason?: string | null }) {
  const t = useT();
  const parsed = parseSkipReason(reason);
  if (!parsed) return null;
  const known = (SKIP_REASONS as readonly string[]).includes(parsed.code);
  const label = known ? t(`intelligence.skip.${parsed.code}`) : parsed.code;
  return <span className="text-xs text-muted-foreground">{parsed.detail ? `${label}: ${parsed.detail}` : label}</span>;
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
  const callId = objectId(transcript?.call);
  // The recording hangs off the call, so it is fetched alongside the transcript.
  const callItem = useApiItem(callsApi.get, callId, demoCalls.find((item) => String(item.id) === String(callId)));
  const call = callItem.data;
  const segments = useMemo(() => (Array.isArray(transcript?.segments) ? (transcript.segments as TranscriptSegment[]) : []), [transcript]);
  const audio = useTranscriptAudio(call?.has_audio && callId ? callAudioPath(callId) : null);
  const playingIndex = audio.available ? activeSegmentIndex(segments, audio.currentTime) : -1;
  const listRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  useEffect(() => {
    if (!audio.playing || playingIndex < 0 || !followRef.current) return;
    listRef.current?.querySelector<HTMLElement>(`[data-segment-index="${playingIndex}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [audio.playing, playingIndex]);

  if (transcriptItem.loading) return <TableSkeleton />;
  if (transcriptItem.error) return <ErrorState title={t("intelligence.loadTranscriptError")} description={transcriptItem.error} onRetry={transcriptItem.reload} />;
  if (!transcript) return <EmptyState title={t("intelligence.transcriptNotFound")} description={t("intelligence.transcriptNotFoundDescription")} />;

  return (
    <>
      <PageHeader title={`#${transcript.id ?? id}`} description={`${t("dashboard.callNumber", { id: callId ?? t("common.na") })} · ${transcript.provider ?? t("intelligence.providerNotRecorded")}`} />
      <Card>
        <CardHeader title={t("intelligence.fullTranscript")} />
        {audio.available || audio.error ? (
          <div className="border-b border-border px-5 pb-4">
            <AudioPlayer audio={audio} />
          </div>
        ) : null}
        <CardContent className="space-y-3" ref={listRef} onWheel={() => { followRef.current = false; }}>
          {segments.length ? segments.map((segment, index) => {
            const spoken = playingIndex === index;
            return (
              <button
                key={index}
                type="button"
                data-segment-index={index}
                aria-current={spoken ? "true" : undefined}
                disabled={!audio.available || segment.start === undefined}
                onClick={() => {
                  followRef.current = true;
                  if (segment.start !== undefined) audio.seek(segment.start);
                }}
                className={`block w-full rounded-lg border p-4 text-left transition duration-[var(--motion-fast)] disabled:cursor-default ${
                  spoken ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background/60"
                } ${audio.available && segment.start !== undefined ? "hover:bg-muted/70" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <Badge tone={spoken ? "ai" : "neutral"}>{t("intelligence.speaker", { number: speakerIndex(segment.speaker) ?? index + 1 })}</Badge>
                  {segment.start !== undefined ? <span className="font-mono text-xs text-muted-foreground">{formatSeconds(segment.start)}</span> : null}
                </div>
                <p className={`mt-3 leading-7 ${spoken ? "text-foreground" : "text-foreground"}`}>{segment.text}</p>
              </button>
            );
          }) : <p className="whitespace-pre-wrap leading-8">{transcript.text ?? t("intelligence.noTranscriptText")}</p>}
        </CardContent>
      </Card>
    </>
  );
}

/** `MM:SS` from a segment offset in seconds. */
function formatSeconds(value: number) {
  const total = Math.max(0, Math.floor(value));
  return `${Math.floor(total / 60)}:${`${total % 60}`.padStart(2, "0")}`;
}
