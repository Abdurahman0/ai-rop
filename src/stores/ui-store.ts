"use client";

import { create } from "zustand";

type Toast = {
  id: string;
  title: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
};

type UiState = {
  mobileNavOpen: boolean;
  toasts: Toast[];
  setMobileNavOpen: (open: boolean) => void;
  toast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  toasts: [],
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  toast: (toast) => set((state) => ({ toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
