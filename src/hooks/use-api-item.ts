"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import type { ID } from "@/types/domain";
import { DEMO_MODE } from "./use-api-resource";

type ItemState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useApiItem<T>(
  loader: (id: ID, token?: string | null) => Promise<T>,
  /** Skips the request entirely when there is no id yet. */
  id: ID | null | undefined,
  fallback?: T,
): ItemState<T> {
  const accessToken = useAuthStore((state) => state.accessToken);
  const enabled = id !== undefined && id !== null && id !== "";
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fallbackRef = useRef(fallback);
  useEffect(() => {
    fallbackRef.current = fallback;
  });

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      setData(await loader(id as ID));
    } catch (err) {
      setData(DEMO_MODE && fallbackRef.current ? fallbackRef.current : null);
      setError(err instanceof ApiError ? err.friendlyMessage : err instanceof Error ? err.message : "errors.loadData");
    } finally {
      setLoading(false);
    }
  }, [enabled, id, loader]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, [accessToken, load]);

  return { data, loading, error, reload: load };
}
