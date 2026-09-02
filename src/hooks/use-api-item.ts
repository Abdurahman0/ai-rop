"use client";

import { useCallback, useEffect, useState } from "react";
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
  id: ID,
  fallback?: T,
): ItemState<T> {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader(id));
    } catch (err) {
      setData(DEMO_MODE && fallback ? fallback : null);
      setError(err instanceof ApiError ? err.friendlyMessage : err instanceof Error ? err.message : "errors.loadData");
    } finally {
      setLoading(false);
    }
  }, [fallback, id, loader]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, [accessToken, load]);

  return { data, loading, error, reload: load };
}
