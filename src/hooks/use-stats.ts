"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";

type StatsState<T> = {
  data: T | null;
  loading: boolean;
  /** 403 = this role may not read these aggregates; not an error to shout about. */
  forbidden: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/** Loads one aggregate from /api/stats/*, keyed on the query it was asked for. */
export function useStats<T>(loader: (query?: Record<string, string | number | undefined>) => Promise<T>, query?: Record<string, string | number | undefined>, enabled = true): StatsState<T> {
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryKey = JSON.stringify(query ?? {});
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setData(await loader(JSON.parse(queryKey)));
    } catch (err) {
      setData(null);
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError(err instanceof ApiError ? err.friendlyMessage : err instanceof Error ? err.message : "errors.loadData");
    } finally {
      setLoading(false);
    }
  }, [enabled, loader, queryKey]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, [accessToken, load]);

  return { data, loading, forbidden, error, reload: load };
}
