"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, PAGE_SIZE } from "@/lib/api/client";
import { listOf } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth-store";
import type { ApiList, ResourceMeta } from "@/types/domain";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ResourceState<T> = {
  data: T[];
  count: number;
  meta: ResourceMeta;
  loading: boolean;
  error: string | null;
  failed: boolean;
  setPage: (page: number) => void;
  reload: () => Promise<void>;
};

export function useApiResource<T>(
  loader: (token?: string | null, query?: Record<string, string | number | boolean | undefined | null>) => Promise<ApiList<T>>,
  fallback: T[],
  query?: Record<string, string | number | boolean | undefined | null>,
  /** Skips the request until the caller has what the query needs. */
  enabled = true,
): ResourceState<T> {
  const accessToken = useAuthStore((state) => state.accessToken);
  // Callers pass filter objects inline, so the identity changes every render.
  // Serializing gives the effect a stable dependency.
  const queryKey = JSON.stringify(query ?? {});
  const filters = useMemo(() => JSON.parse(queryKey) as typeof query, [queryKey]);
  const [page, setPage] = useState(Number(query?.page ?? 1));

  // A changed filter invalidates the current page number. Adjusting state
  // during render is the documented pattern for deriving from a changed input.
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (lastQueryKey !== queryKey) {
    setLastQueryKey(queryKey);
    setPage(1);
  }
  const [data, setData] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Held in a ref so an inline `[]` fallback cannot change the loader identity
  // on every render — that would re-run the effect in a loop.
  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  });

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    setFailed(false);
    try {
      // The client attaches the token itself and refreshes it on a 401.
      const payload = await loader(undefined, { ...filters, page });
      setData(listOf(payload));
      setCount(Array.isArray(payload) ? payload.length : payload.count ?? payload.results?.length ?? 0);
      setNext(Array.isArray(payload) ? null : payload.next ?? null);
      setPrevious(Array.isArray(payload) ? null : payload.previous ?? null);
      setIsDemo(false);
    } catch (err) {
      if (DEMO_MODE) {
        setData(fallbackRef.current);
        setCount(fallbackRef.current.length);
        setIsDemo(true);
      } else {
        setData([]);
        setCount(0);
        setIsDemo(false);
      }
      setNext(null);
      setPrevious(null);
      setFailed(true);
      setError(err instanceof ApiError ? err.friendlyMessage : err instanceof Error ? err.message : "errors.loadData");
    } finally {
      setLoading(false);
    }
  }, [enabled, filters, loader, page]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
    // accessToken is a dependency so the list reloads once sign-in completes.
  }, [accessToken, load]);

  return {
    data,
    count,
    meta: { count, next, previous, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)), isDemo },
    loading,
    error,
    failed,
    setPage,
    reload: load,
  };
}
