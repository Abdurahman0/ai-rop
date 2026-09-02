"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, Volume2 } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { API_URL } from "@/lib/api/client";
import { authBridge } from "@/lib/api/auth-bridge";
import type { TranscriptSegment } from "@/types/domain";

const SPEEDS = [1, 1.25, 1.5, 2];
const SKIP_SECONDS = 10;

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${`${total % 60}`.padStart(2, "0")}`;
}

/**
 * Index of the segment covering `time`. Segments carry `start`/`end` in seconds;
 * when `end` is missing the next segment's `start` closes the gap.
 */
export function activeSegmentIndex(segments: TranscriptSegment[], time: number) {
  for (let index = 0; index < segments.length; index += 1) {
    const start = segments[index].start;
    if (start === undefined) continue;
    const explicitEnd = segments[index].end;
    const nextStart = segments.slice(index + 1).find((segment) => segment.start !== undefined)?.start;
    const end = explicitEnd ?? nextStart ?? Number.POSITIVE_INFINITY;
    if (time >= start && time < end) return index;
  }
  return -1;
}

/**
 * Loads the recording. Recordings are private, so the endpoint is called with
 * the bearer token and played as a blob — an `<audio src>` cannot carry a
 * header. Both pieces of state are tagged with the URL they belong to, so a
 * change of source is reflected during render, not by a resetting effect.
 */
function useAudioSource(src?: string | null) {
  const external = !!src && /^https?:\/\//.test(src);
  const [blob, setBlob] = useState<{ src: string; url: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!src || external) return;

    let objectUrl: string | null = null;
    let cancelled = false;
    const base = API_URL.replace(/\/$/, "");
    const path = src.startsWith("/") ? src : `/${src}`;
    const token = authBridge.getAccessToken();

    fetch(`${base}${path.replace(/\/$/, "")}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.blob();
      })
      .then((downloaded) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(downloaded);
        setBlob({ src, url: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setFailure(src);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [external, src]);

  const resolved = !src ? null : external ? src : blob?.src === src ? blob.url : null;
  return { resolved, error: !!src && failure === src };
}

export function useTranscriptAudio(src?: string | null) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { resolved, error: sourceError } = useAudioSource(src);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRateState] = useState(1);
  const [failed, setFailed] = useState(false);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => setFailed(true));
    else audio.pause();
  }, []);

  const setRate = useCallback((next: number) => {
    setRateState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);

  const element = resolved ? (
    <audio
      ref={audioRef}
      src={resolved}
      preload="metadata"
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onEnded={() => setPlaying(false)}
      onError={() => setFailed(true)}
      // Fired when the source is swapped: reset playback from the element
      // itself rather than from an effect.
      onEmptied={() => {
        setCurrentTime(0);
        setPlaying(false);
        setFailed(false);
      }}
    />
  ) : null;

  return {
    element,
    available: !!resolved,
    error: sourceError || failed,
    currentTime,
    duration,
    playing,
    rate,
    seek,
    toggle,
    setRate,
    skip: (delta: number) => seek(currentTime + delta),
  };
}

export type TranscriptAudio = ReturnType<typeof useTranscriptAudio>;

export function AudioPlayer({ audio, className = "" }: { audio: TranscriptAudio; className?: string }) {
  const t = useT();
  const progress = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0;
  const label = useMemo(() => `${formatClock(audio.currentTime)} / ${formatClock(audio.duration)}`, [audio.currentTime, audio.duration]);

  if (audio.error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 ${className}`}>
        {t("player.loadError")}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-background/70 p-3 ${className}`}>
      {audio.element}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={audio.toggle}
          aria-label={audio.playing ? t("player.pause") : t("player.play")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition duration-[var(--motion-fast)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {audio.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => audio.skip(-SKIP_SECONDS)}
          aria-label={t("player.skipBack", { seconds: SKIP_SECONDS })}
          className="rounded-md p-2 text-muted-foreground transition duration-[var(--motion-fast)] hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => audio.skip(SKIP_SECONDS)}
          aria-label={t("player.skipForward", { seconds: SKIP_SECONDS })}
          className="rounded-md p-2 text-muted-foreground transition duration-[var(--motion-fast)] hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <input
            type="range"
            min={0}
            max={audio.duration || 0}
            step={0.1}
            value={audio.currentTime}
            onChange={(event) => audio.seek(Number(event.target.value))}
            aria-label={t("player.seek")}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--primary)]"
            style={{ background: `linear-gradient(to right, var(--primary) ${progress}%, var(--muted) ${progress}%)` }}
          />
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{label}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => audio.setRate(speed)}
              aria-pressed={audio.rate === speed}
              className={`rounded-md px-2 py-1 text-xs font-medium transition duration-[var(--motion-fast)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                audio.rate === speed ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {speed}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
