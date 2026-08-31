"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type PaletteKey = "neutral" | "warm" | "cool" | "slate" | "blue" | "indigo" | "violet" | "green" | "rose" | "amber";
export type MotionMode = "full" | "reduced";

type Palette = {
  label: string;
  primary: string;
  background: string;
  card: string;
  muted: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  darkBackground: string;
  darkCard: string;
  darkMuted: string;
  darkBorder: string;
  darkPrimary: string;
};

export const palettes: Record<PaletteKey, Palette> = {
  neutral: { label: "Neutral", primary: "#4f46e5", background: "#f6f6f4", card: "#ffffff", muted: "#ededeb", border: "#dfdfdc", foreground: "#171717", mutedForeground: "#737373", darkBackground: "#08090b", darkCard: "#111317", darkMuted: "#1b1e24", darkBorder: "#2a2d35", darkPrimary: "#818cf8" },
  warm: { label: "Warm", primary: "#7c3aed", background: "#f8f5f0", card: "#fffdf9", muted: "#efe8dd", border: "#ded5c8", foreground: "#1f1a16", mutedForeground: "#756b60", darkBackground: "#11100e", darkCard: "#191713", darkMuted: "#242018", darkBorder: "#332c22", darkPrimary: "#a78bfa" },
  cool: { label: "Cool", primary: "#2563eb", background: "#f3f7f8", card: "#ffffff", muted: "#e7eff2", border: "#d6e0e4", foreground: "#111827", mutedForeground: "#667781", darkBackground: "#071014", darkCard: "#0e181d", darkMuted: "#17242a", darkBorder: "#25343b", darkPrimary: "#60a5fa" },
  slate: { label: "Slate", primary: "#475569", background: "#f5f6f7", card: "#ffffff", muted: "#e9ecef", border: "#d8dde3", foreground: "#111827", mutedForeground: "#64748b", darkBackground: "#090b0f", darkCard: "#11151b", darkMuted: "#1a2028", darkBorder: "#2b3440", darkPrimary: "#94a3b8" },
  blue: { label: "Blue", primary: "#2563eb", background: "#f5f8ff", card: "#ffffff", muted: "#eaf1ff", border: "#d7e2f7", foreground: "#111827", mutedForeground: "#64748b", darkBackground: "#071122", darkCard: "#0d1830", darkMuted: "#172644", darkBorder: "#26395f", darkPrimary: "#60a5fa" },
  indigo: { label: "Indigo", primary: "#4f46e5", background: "#f7f7ff", card: "#ffffff", muted: "#ececff", border: "#dcdcf7", foreground: "#15151f", mutedForeground: "#6b6b7a", darkBackground: "#090a16", darkCard: "#111225", darkMuted: "#1b1d35", darkBorder: "#2b2d4c", darkPrimary: "#818cf8" },
  violet: { label: "Violet", primary: "#7c3aed", background: "#faf7ff", card: "#ffffff", muted: "#f0eaff", border: "#dfd4f5", foreground: "#171321", mutedForeground: "#71657f", darkBackground: "#100a18", darkCard: "#191124", darkMuted: "#271a36", darkBorder: "#39264d", darkPrimary: "#a78bfa" },
  green: { label: "Green", primary: "#059669", background: "#f4f8f5", card: "#ffffff", muted: "#e8f1eb", border: "#d6e3da", foreground: "#111b16", mutedForeground: "#607166", darkBackground: "#07110c", darkCard: "#0f1a14", darkMuted: "#18271e", darkBorder: "#293a30", darkPrimary: "#34d399" },
  rose: { label: "Rose", primary: "#e11d48", background: "#fff7f8", card: "#ffffff", muted: "#fdebed", border: "#f2d4da", foreground: "#211316", mutedForeground: "#805f66", darkBackground: "#16090d", darkCard: "#211015", darkMuted: "#321922", darkBorder: "#4b2632", darkPrimary: "#fb7185" },
  amber: { label: "Amber", primary: "#d97706", background: "#fbf7ef", card: "#ffffff", muted: "#f3ead8", border: "#e3d4b9", foreground: "#211a0f", mutedForeground: "#776a55", darkBackground: "#130e06", darkCard: "#1d160b", darkMuted: "#2b2111", darkBorder: "#42331b", darkPrimary: "#fbbf24" },
};

type AppearanceState = {
  theme: ThemeMode;
  radius: number;
  colorPalette: PaletteKey;
  backgroundPalette: PaletteKey;
  surfacePalette: PaletteKey;
  sidebarPalette: PaletteKey;
  motion: MotionMode;
  setTheme: (theme: ThemeMode) => void;
  setRadius: (radius: number) => void;
  setColorPalette: (palette: PaletteKey) => void;
  setBackgroundPalette: (palette: PaletteKey) => void;
  setSurfacePalette: (palette: PaletteKey) => void;
  setSidebarPalette: (palette: PaletteKey) => void;
  setMotion: (motion: MotionMode) => void;
  reset: () => void;
};

const defaults = {
  theme: "light" as ThemeMode,
  radius: 8,
  colorPalette: "indigo" as PaletteKey,
  backgroundPalette: "neutral" as PaletteKey,
  surfacePalette: "neutral" as PaletteKey,
  sidebarPalette: "neutral" as PaletteKey,
  motion: "full" as MotionMode,
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      ...defaults,
      setTheme: (theme) => set({ theme }),
      setRadius: (radius) => set({ radius: Math.min(20, Math.max(0, Math.round(radius))) }),
      setColorPalette: (colorPalette) => set({ colorPalette }),
      setBackgroundPalette: (backgroundPalette) => set({ backgroundPalette }),
      setSurfacePalette: (surfacePalette) => set({ surfacePalette }),
      setSidebarPalette: (sidebarPalette) => set({ sidebarPalette }),
      setMotion: (motion) => set({ motion }),
      reset: () => set(defaults),
    }),
    { name: "ai-rop-appearance" },
  ),
);
