"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/client";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      status: "idle",
      error: null,
      login: async (username, password) => {
        set({ status: "loading", error: null });
        try {
          const tokens = await authApi.login({ username, password });
          set({ accessToken: tokens.access, refreshToken: tokens.refresh, status: "authenticated" });
        } catch (error) {
          set({ status: "error", error: error instanceof Error ? error.message : "auth.invalidCredentials" });
          throw error;
        }
      },
      refresh: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return null;
        try {
          const token = await authApi.refresh(refreshToken);
          set({ accessToken: token.access, status: "authenticated" });
          return token.access;
        } catch {
          get().logout();
          return null;
        }
      },
      logout: () => set({ accessToken: null, refreshToken: null, status: "idle", error: null }),
    }),
    {
      name: "ai-rop-auth",
      partialize: (state) => ({ refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state) => {
        if (state?.refreshToken) state.status = "authenticated";
      },
    },
  ),
);
