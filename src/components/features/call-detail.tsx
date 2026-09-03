"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, Phone, Sparkles, UserRound } from "lucide-react";
import { analysesApi, callAudioPath, callsApi, transcriptsApi } from "@/lib/api/client";
import { useT } from "@/i18n/use-t";
import { useFormatters } from "@/i18n/use-formatters";
import { useLabels } from "@/i18n/use-labels";
import { demoAnalyses, demoCalls, demoTranscripts } from "@/lib/data/demo";
import { objectId, parseSkipReason, speakerIndex } from "@/lib/utils/format";
import { useApiItem } from "@/hooks/use-api-item";
import { useApiResource } from "@/hooks/use-api-resource";
import { CALL_DIRECTIONS, CALL_STAGES, SKIP_REASONS, type Analysis, type Call, type Transcript, type TranscriptSegment } from "@/types/domain";
import { Badge, ScoreBadge, StatusBadge } from "@/components/ui/badge";
import { AIScore, aiScoreLabel } from "@/components/ui/ai-score";
import { activeSegmentIndex, AudioPlayer, useTranscriptAudio, type TranscriptAudio } from "@/components/ui/audio-player";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExtractedFields } from "@/components/ui/extracted-fields";
import { AiEvaluationPanel } from "@/components/ui/structured-ai-data";
import { EmptyState, ErrorState } from "@/components/ui/states";

function CallMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function InsightShell({ tone, children }: { tone: "positive" | "attention" | "critical" | "neutral"; children: React.ReactNode }) {
  const styles = {
    positive: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10",
    attention: "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10",
    critical: "border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10",
    neutral: "border-border bg-background/60",
  };
  return <div className={`rounded-lg border p-4 ${styles[tone]}`}>{children}</div>;
}

function normalizeSpeaker(speaker: string | undefined, t: (key: string, vars?: Record<string, string | number>) => string) {
  // Provider-indexed labels carry no role information — keep them neutral.
  const index = speakerIndex(speaker);
  if (index !== null) return { label: t("transcript.speaker", { number: index }), side: "unknown" as const };
  const normalized = speaker?.toLowerCase() ?? "";
  if (/(client|customer|buyer|lead|клиент|mijoz)/.test(normalized)) return { label: t("transcript.client"), side: "client" as const };
  if (/(seller|sales|operator|agent|manager|менеджер|оператор|sotuvchi)/.test(normalized)) return { label: t("transcript.sales"), side: "sales" as const };
  return { label: speaker || t("transcript.unknownSpeaker"), side: "unknown" as const };
}

function formatSegmentTime(segment: TranscriptSegment) {
  if (segment.timestamp) return segment.timestamp;
  if (segment.start === undefined) return "";
  const minutes = Math.floor(segment.start / 60);
  const seconds = Math.floor(segment.start % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function TranscriptSkeleton() {
  return (
    <div className="space-y-4 p-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className={`grid animate-pulse gap-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] ${index % 2 ? "sm:grid-cols-[minmax(0,1fr)_6.5rem]" : ""}`}>
          <div className={`${index % 2 ? "sm:order-2" : ""} space-y-2`}>
            <div className="h-4 w-20 rounded-md bg-muted" />
            <div className="h-3 w-12 rounded-md bg-muted" />
          </div>
          <div className={`${index % 2 ? "sm:order-1 sm:ml-auto" : ""} w-full max-w-[56rem] rounded-lg border border-border bg-background/70 p-4`}>
            <div className="h-3 w-11/12 rounded-md bg-muted" />
            <div className="mt-3 h-3 w-8/12 rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TranscriptPanel({
  call,
  analysis,
  transcript,
  loading,
  error,
  onRetry,
  audio,
}: {
  call: Call;
  analysis?: Analysis;
  transcript?: Transcript;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  audio: TranscriptAudio;
}) {
  const t = useT();
  const { formatDate, formatTime, formatDuration } = useFormatters();
  const labels = useLabels();
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const segments = useMemo(() => (Array.isArray(transcript?.segments) ? (transcript.segments as TranscriptSegment[]) : []), [transcript]);
  const hasTranscriptText = !!transcript?.text;

  const playingIndex = audio.available ? activeSegmentIndex(segments, audio.currentTime) : -1;
  const listRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  // Keep the spoken line in view while playing, unless the reader scrolled away.
  useEffect(() => {
    if (!audio.playing || playingIndex < 0 || !followRef.current) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-segment-index="${playingIndex}"]`);
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [audio.playing, playingIndex]);

  return (
    <Card>
      <div className="border-b border-border px-5 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(34rem,0.9fr)] xl:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-indigo-500">{t("transcript.conversation")}</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{t("dashboard.callNumber", { id: call.id })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{labels.person(call.operator, call.operator_detail)} · {call.client_phone ?? t("transcript.client")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm lg:grid-cols-4">
            <CallMeta icon={<Clock className="h-4 w-4" />} label={t("transcript.date")} value={formatDate(call.started_at)} />
            <CallMeta icon={<Clock className="h-4 w-4" />} label={t("transcript.time")} value={formatTime(call.started_at)} />
            <CallMeta icon={<Phone className="h-4 w-4" />} label={t("calls.duration")} value={formatDuration(call.duration || (audio.duration || null))} />
            <CallMeta icon={<Sparkles className="h-4 w-4" />} label={t("calls.aiScore")} value={<ScoreBadge score={analysis?.overall_score} />} />
          </div>
        </div>
      </div>
      {loading ? <TranscriptSkeleton /> : error ? <ErrorState title={t("transcript.loadError")} description={error} onRetry={onRetry} /> : segments.length ? (
        <CardContent className="space-y-1" ref={listRef} onWheel={() => { followRef.current = false; }}>
          {segments.map((segment, index) => {
            const speaker = normalizeSpeaker(segment.speaker, t);
            const key = String(segment.id ?? `${segment.speaker ?? "speaker"}-${index}`);
            const spoken = playingIndex === index;
            const active = spoken || activeSegment === key;
            const played = audio.available && segment.start !== undefined && audio.currentTime > segment.start && !spoken;
            const time = formatSegmentTime(segment);
            const client = speaker.side === "client";
            return (
              <button
                key={key}
                type="button"
                data-segment-index={index}
                aria-current={spoken ? "true" : undefined}
                className={`group grid w-full gap-3 rounded-lg px-3 py-3 text-left transition duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[6.5rem_minmax(0,1fr)] ${
                  client ? "sm:grid-cols-[minmax(0,1fr)_6.5rem]" : ""
                } ${spoken ? "bg-primary/10 ring-1 ring-primary/30" : active ? "bg-primary/10" : "hover:bg-muted/70"}`}
                aria-label={audio.available ? t("player.jumpToSegment") : t("transcript.focusSegment")}
                onClick={() => {
                  setActiveSegment(key);
                  // Clicking a line scrubs the recording to it.
                  if (audio.available && segment.start !== undefined) {
                    followRef.current = true;
                    audio.seek(segment.start);
                  }
                }}
              >
                <div className={`${client ? "sm:order-2 sm:text-right" : ""}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${speaker.side === "sales" ? "text-indigo-600 dark:text-indigo-300" : client ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}`}>{speaker.label}</p>
                  {time ? <p className={`mt-1 text-xs transition ${active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>{time}</p> : null}
                </div>
                <div className={`${client ? "sm:order-1 sm:ml-auto" : ""} w-fit max-w-full sm:max-w-[56rem] rounded-lg border px-4 py-3 shadow-sm transition duration-[var(--motion-fast)] ${spoken ? "border-primary/40 bg-primary/5" : "border-border bg-background/70"}`}>
                  <p className={`leading-7 transition ${spoken ? "text-foreground" : played ? "text-muted-foreground" : "text-foreground"}`}>{segment.text ?? t("transcript.noTranscript")}</p>
                </div>
              </button>
            );
          })}
        </CardContent>
      ) : hasTranscriptText ? (
        <CardContent>
          <div className="rounded-lg border border-border bg-background/70 p-5 leading-8 text-foreground whitespace-pre-wrap">{transcript.text}</div>
        </CardContent>
      ) : (
        <EmptyState title={t("transcript.noTranscript")} description={t("transcript.noTranscriptDescription")} />
      )}
    </Card>
  );
}

export function CallDetail({ id }: { id: string }) {
  const t = useT();
  const { formatDate, formatDuration } = useFormatters();
  const labels = useLabels();
  const callItem = useApiItem(callsApi.get, id, demoCalls.find((item) => String(item.id) === id));
  // Private recording, fetched with the token; drives the transcript below.
  const audio = useTranscriptAudio(callItem.data?.has_audio ? callAudioPath(callItem.data.id) : null);
  const analyses = useApiResource(analysesApi.list, demoAnalyses);
  const transcripts = useApiResource(transcriptsApi.list, demoTranscripts);
  const call = callItem.data;
  const analysis = analyses.data.find((item) => String(objectId(item.call)) === String(call?.id));
  const transcript = transcripts.data.find((item) => String(objectId(item.call)) === String(call?.id));
  const scoreValue = analysis?.overall_score === null || analysis?.overall_score === undefined ? null : Number(analysis.overall_score);
  const directionLabel = (CALL_DIRECTIONS as readonly string[]).includes(call?.direction ?? "") ? t(`calls.directions.${call?.direction}`) : call?.direction ?? t("common.unknown");
  const skip = parseSkipReason(analysis?.skip_reason);
  const skipLabel = skip ? ((SKIP_REASONS as readonly string[]).includes(skip.code) ? t(`intelligence.skip.${skip.code}`) : skip.code) : "";

  if (callItem.loading) return <TranscriptSkeleton />;
  if (callItem.error) return <ErrorState title={t("callDetail.loadError")} description={callItem.error} onRetry={callItem.reload} />;
  if (!call) return <EmptyState title={t("callDetail.notFound")} description={t("callDetail.notFoundDescription")} />;

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500" href="/calls">
          <ArrowLeft className="h-4 w-4" />
          {t("callDetail.back")}
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge value={call.stage} label={(CALL_STAGES as readonly string[]).includes(call.stage ?? "") ? t(`calls.stages.${call.stage}`) : undefined} title={call.stage === "failed" ? call.error ?? undefined : undefined} />
          <Badge tone={call.direction && call.direction !== "unknown" ? "ai" : "neutral"}>{directionLabel}</Badge>
        </div>
      </div>
      {audio.available || audio.error ? (
        <div className="sticky top-16 z-20 -mx-4 mb-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <AudioPlayer audio={audio} />
        </div>
      ) : null}
      <section className="mb-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(36rem,1fr)] xl:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-indigo-500">{t("callDetail.review")}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{t("dashboard.callNumber", { id: call.id })}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{call.client_phone ?? t("callDetail.unknownPhone")} · {labels.person(call.operator, call.operator_detail)}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <CallMeta icon={<Phone className="h-4 w-4" />} label={t("callDetail.client")} value={call.client_phone ?? t("common.notRecorded")} />
            <CallMeta icon={<UserRound className="h-4 w-4" />} label={t("callDetail.operator")} value={labels.person(call.operator, call.operator_detail)} />
            <CallMeta icon={<Clock className="h-4 w-4" />} label={t("calls.duration")} value={formatDuration(call.duration || (audio.duration || null))} />
            <CallMeta icon={<Sparkles className="h-4 w-4" />} label={t("calls.started")} value={formatDate(call.started_at)} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem] xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-t border-border pt-3"><span className="text-muted-foreground">{t("callDetail.direction")}</span><Badge tone={call.direction && call.direction !== "unknown" ? "ai" : "neutral"}>{directionLabel}</Badge></div>
              <div className="flex justify-between gap-4 border-t border-border pt-3"><span className="text-muted-foreground">{t("callDetail.stage")}</span><StatusBadge value={call.stage} label={(CALL_STAGES as readonly string[]).includes(call.stage ?? "") ? t(`calls.stages.${call.stage}`) : undefined} /></div>
              {call.stage === "failed" && call.error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{call.error}</div> : null}
              <div className="flex justify-between gap-4 border-t border-border pt-3"><span className="text-muted-foreground">{t("callDetail.provider")}</span><span className="font-medium">{call.provider ?? t("common.notRecorded")}</span></div>
              <div className="flex justify-between gap-4 border-t border-border pt-3"><span className="text-muted-foreground">{t("callDetail.aiModel")}</span><span className="text-right font-medium">{analysis?.model_name ?? t("common.notRecorded")}</span></div>
              <div className="flex justify-between gap-4 border-t border-border pt-3"><span className="text-muted-foreground">{t("callDetail.reviewTime")}</span><span className="text-right font-medium">{formatDate(analysis?.created_at)}</span></div>
              </div>
            </CardContent>
          </Card>
          <InsightShell tone={scoreValue === null || !Number.isFinite(scoreValue) ? "neutral" : scoreValue >= 85 ? "positive" : scoreValue >= 70 ? "attention" : "critical"}>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-semibold text-foreground">{t("callDetail.aiSummary")}</h2>
            </div>
            <p className="leading-7 text-foreground">{analysis?.summary ?? t("callDetail.noSummary")}</p>
          </InsightShell>
          <Card>
            <CardHeader title={t("callDetail.aiEvaluation")} />
            <CardContent>
              <AiEvaluationPanel value={analysis?.evaluation} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title={t("callDetail.extractedData")} />
            <CardContent>
              <ExtractedFields value={analysis?.extracted_fields} />
            </CardContent>
          </Card>
          <TranscriptPanel call={call} analysis={analysis} transcript={transcript} loading={transcripts.loading} error={transcripts.error} onRetry={transcripts.reload} audio={audio} />
          <Card>
            <CardHeader title={t("callDetail.leadResult")} />
            <CardContent>
              {analysis?.lead_created ? (
                <div className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">{t("callDetail.leadCreated")}</span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>{t("callDetail.noLead")}</p>
                  {skip ? <p className="mt-1 text-foreground">{skip.detail ? `${skipLabel}: ${skip.detail}` : skipLabel}</p> : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="order-first lg:order-last lg:self-start">
          <Card className="lg:sticky lg:top-24 lg:z-20">
            <CardContent className="p-6">
              <AIScore score={analysis?.overall_score} size="lg" />
              <p className="mt-2 text-sm font-medium text-foreground">{aiScoreLabel(analysis?.overall_score, t)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
