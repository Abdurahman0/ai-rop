"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
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
): ResourceState<T> {
  const { accessToken, refresh } = useAuthStore();
  const [page, setPage] = useState(Number(query?.page ?? 1));
  const [data, setData] = useState<T[]>([]);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFailed(false);
    const effectiveQuery = { ...query, page };
    try {
      const payload = await loader(accessToken, effectiveQuery);
      setData(listOf(payload));
      setCount(Array.isArray(payload) ? payload.length : payload.count ?? payload.results?.length ?? 0);
      setNext(Array.isArray(payload) ? null : payload.next ?? null);
      setPrevious(Array.isArray(payload) ? null : payload.previous ?? null);
      setIsDemo(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const token = await refresh();
        if (token) {
          const payload = await loader(token, effectiveQuery);
          setData(listOf(payload));
          setCount(Array.isArray(payload) ? payload.length : payload.count ?? payload.results?.length ?? 0);
          setNext(Array.isArray(payload) ? null : payload.next ?? null);
          setPrevious(Array.isArray(payload) ? null : payload.previous ?? null);
          setIsDemo(false);
          setLoading(false);
          return;
        }
      }
      if (DEMO_MODE) {
        setData(fallback);
        setCount(fallback.length);
        setNext(null);
        setPrevious(null);
        setIsDemo(true);
      } else {
        setData([]);
        setCount(0);
        setNext(null);
        setPrevious(null);
        setIsDemo(false);
      }
      setFailed(true);
      setError(err instanceof ApiError ? err.friendlyMessage : err instanceof Error ? err.message : "errors.loadData");
    } finally {
      setLoading(false);
    }
  }, [accessToken, fallback, loader, page, query, refresh]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, [load]);

  const pageSize = data.length || Number(query?.page_size ?? 20);
  return {
    data,
    count,
    meta: { count, next, previous, page, pageSize, totalPages: Math.max(1, Math.ceil(count / Math.max(1, pageSize))), isDemo },
    loading,
    error,
    failed,
    setPage,
    reload: load,
  };
}
