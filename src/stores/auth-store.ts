"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError, authApi } from "@/lib/api/client";
import { setAuthBridge } from "@/lib/api/auth-bridge";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
  /** Set when the backend refuses every endpoint because the user has no company. */
  forbidden: string | null;
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
      forbidden: null,
      login: async (username, password) => {
        set({ status: "loading", error: null });
        try {
          const tokens = await authApi.login({ username, password });
          set({ accessToken: tokens.access, refreshToken: tokens.refresh, status: "authenticated", error: null, forbidden: null });
        } catch (error) {
          set({ status: "error", error: authErrorKey(error) });
          throw error;
        }
      },
      refresh: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return null;
        try {
          const tokens = await authApi.refresh(refreshToken);
          // Refresh tokens rotate — keep the new one or the next refresh fails.
          set({
            accessToken: tokens.access,
            refreshToken: tokens.refresh ?? refreshToken,
            status: "authenticated",
            error: null,
          });
          return tokens.access;
        } catch {
          get().logout();
          return null;
        }
      },
      logout: () => set({ accessToken: null, refreshToken: null, status: "idle", error: null, forbidden: null }),
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

/** Maps a failed sign-in onto a translatable message key. */
function authErrorKey(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 0) return "auth.networkError";
    if (error.status === 401 || error.status === 400) return "auth.invalidCredentials";
    // 403 = the account exists but belongs to no company; show the backend reason.
    return error.friendlyMessage;
  }
  return error instanceof Error ? error.message : "auth.invalidCredentials";
}

// Gives the API client access to the tokens without a circular import.
setAuthBridge({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: () => useAuthStore.getState().refresh(),
  onUnauthorized: () => useAuthStore.getState().logout(),
  onForbidden: (message) => {
    if (useAuthStore.getState().forbidden !== message) useAuthStore.setState({ forbidden: message });
  },
});
