"use client";

import { create } from "zustand";
import { usersApi } from "@/lib/api/client";
import type { User } from "@/types/domain";

type SessionState = {
  user: User | null;
  loading: boolean;
  load: () => Promise<void>;
  clear: () => void;
};

/**
 * The signed-in user. `role` drives what the UI offers: an operator only ever
 * sees their own leads and calls, and shared config is read-only for them.
 * The API enforces all of it too — hiding is only there to avoid dead ends.
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      set({ user: await usersApi.me(), loading: false });
    } catch {
      // A failure here must not block the app: the API stays the source of truth.
      set({ user: null, loading: false });
    }
  },
  clear: () => set({ user: null, loading: false }),
}));

/** Unknown role means admin — that is the documented server-side default. */
export function useIsAdmin() {
  const user = useSessionStore((state) => state.user);
  return user?.role !== "operator";
}
