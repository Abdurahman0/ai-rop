"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";
import { LogOut, Menu, Moon, RefreshCw, ShieldAlert, Sun, X } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { useAuthStore } from "@/stores/auth-store";
import { useSessionStore } from "@/stores/session-store";
import { palettes, useAppearanceStore } from "@/stores/appearance-store";
import { useUiStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { navGroups } from "./nav";

function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const { setMobileNavOpen } = useUiStore();
  const t = useT();
  const user = useSessionStore((state) => state.user);
  const operator = user?.role === "operator";
  return (
    <aside className={`${mobile ? "flex w-full" : "fixed inset-y-0 left-0 z-40 hidden w-68 border-r border-border bg-sidebar lg:flex"} shrink-0 flex-col`}>
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">AI</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{t("app.name")}</p>
          <p className="text-xs text-muted-foreground">{t("app.tagline")}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]">
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{t(group.labelKey)}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition duration-[var(--motion-fast)] ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {user ? (
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
            {(user.name || user.username || "?").slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.name || user.username}</p>
            <p className="text-xs text-muted-foreground">{t(operator ? "roles.operator" : "roles.admin")}</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function ToastViewport() {
  const { toasts, dismissToast } = useUiStore();
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => window.setTimeout(() => dismissToast(toast.id), 4200));
    return () => timers.forEach(window.clearTimeout);
  }, [dismissToast, toasts]);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-80 space-y-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          className={`w-full animate-[toast-in_var(--motion-normal)_ease-out] rounded-lg border bg-card px-4 py-3 text-left text-sm shadow-xl transition hover:bg-muted ${
            toast.tone === "danger" ? "border-red-300" : toast.tone === "success" ? "border-emerald-300" : toast.tone === "warning" ? "border-amber-300" : toast.tone === "info" ? "border-indigo-300" : "border-border"
          }`}
          onClick={() => dismissToast(toast.id)}
        >
          {toast.title}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { accessToken, refreshToken, refresh, logout, forbidden } = useAuthStore();
  const { user, load: loadUser, clear: clearUser } = useSessionStore();
  const { theme, radius, colorPalette, backgroundPalette, surfacePalette, sidebarPalette, motion, setTheme } = useAppearanceStore();
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();
  const [mounted, setMounted] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loadingLine, setLoadingLine] = useState(false);
  const [themeWave, setThemeWave] = useState<{ id: number; x: number; y: number; r: number; color: string } | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = theme === "dark" || (theme === "system" && systemDark);
    const color = palettes[colorPalette];
    const background = palettes[backgroundPalette];
    const surface = palettes[surfacePalette];
    const sidebar = palettes[sidebarPalette];
    root.classList.toggle("dark", dark);
    root.classList.toggle("motion-reduced", motion === "reduced");
    root.style.setProperty("--radius", `${radius}px`);
    root.style.setProperty("--primary", dark ? color.darkPrimary : color.primary);
    root.style.setProperty("--background", dark ? background.darkBackground : background.background);
    root.style.setProperty("--card", dark ? surface.darkCard : surface.card);
    root.style.setProperty("--sidebar", dark ? sidebar.darkCard : sidebar.card);
    root.style.setProperty("--muted", dark ? surface.darkMuted : surface.muted);
    root.style.setProperty("--border", dark ? surface.darkBorder : surface.border);
    root.style.setProperty("--foreground", dark ? "#f3f4f6" : surface.foreground);
    root.style.setProperty("--muted-foreground", dark ? "#a3a3a3" : surface.mutedForeground);
  }, [backgroundPalette, colorPalette, motion, radius, sidebarPalette, surfacePalette, theme]);

  useEffect(() => {
    if (!mounted || pathname === "/login" || accessToken) return;
    if (refreshToken) {
      void refresh().then((token) => {
        if (!token) router.replace("/login");
      });
      return;
    }
    router.replace("/login");
  }, [accessToken, mounted, pathname, refresh, refreshToken, router]);

  // Who is signed in, and with which role — read once per session.
  useEffect(() => {
    if (!mounted || !accessToken || user) return;
    void loadUser();
  }, [accessToken, loadUser, mounted, user]);

  useEffect(() => {
    if (!mounted || pathname === "/login") return;
    const frame = window.requestAnimationFrame(() => setLoadingLine(true));
    const timer = window.setTimeout(() => setLoadingLine(false), motion === "reduced" ? 120 : 520);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [mounted, motion, pathname]);

  function cycleTheme(event: MouseEvent<HTMLButtonElement>) {
    const next = theme === "dark" ? "light" : "dark";
    if (motion === "reduced") {
      setTheme(next);
      return;
    }
    // A circle of the incoming background grows from the button until it covers
    // the screen; the theme flips underneath it, then the circle fades away.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const background = palettes[backgroundPalette];
    setThemeWave({ id: Date.now(), x, y, r: radius, color: next === "dark" ? background.darkBackground : background.background });
    window.setTimeout(() => setTheme(next), 300);
    window.setTimeout(() => setThemeWave(null), 640);
  }

  function confirmLogout() {
    clearUser();
    logout();
    setLogoutOpen(false);
    router.replace("/login");
  }

  if (!mounted) return null;
  if (pathname === "/login") return <>{children}</>;

  // No company means every endpoint answers 403 — show one clear reason rather
  // than a shell full of broken panels.
  if (forbidden) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">{t("shell.noCompanyTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{forbidden}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("shell.noCompanyHint")}</p>
          <Button className="mt-6 w-full" variant="primary" icon={<LogOut className="h-4 w-4" />} onClick={confirmLogout}>
            {t("common.logout")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {loadingLine ? <div className="page-loading-line" /> : null}
      {themeWave ? (
        <div
          key={themeWave.id}
          className="theme-wave"
          style={{ left: themeWave.x, top: themeWave.y, width: themeWave.r * 2, height: themeWave.r * 2, background: themeWave.color }}
        />
      ) : null}
      <Sidebar />
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label={t("common.closeNavigation")} onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[86vw] flex-col border-r border-border bg-card shadow-xl">
            <div className="flex justify-end p-3">
              <button className="rounded-md p-2 hover:bg-muted" onClick={() => setMobileNavOpen(false)} aria-label={t("common.closeNavigation")}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-68">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setMobileNavOpen(true)} aria-label={t("common.openNavigation")}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => router.refresh()}>
              {t("common.refresh")}
            </Button>
            <Button className="overflow-hidden" icon={theme === "dark" ? <Sun className="h-4 w-4 theme-icon" /> : <Moon className="h-4 w-4 theme-icon" />} onClick={cycleTheme} aria-label={t("common.toggleTheme")} />
            <Button
              variant="danger"
              icon={<LogOut className="h-4 w-4" />}
              onClick={() => setLogoutOpen(true)}
            >
              {t("common.logout")}
            </Button>
          </div>
        </header>
        <main key={pathname} className="main-route-transition flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
      <ToastViewport />
      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title={t("shell.confirmLogoutTitle")}
        description={t("shell.confirmLogoutDescription")}
        confirmLabel={t("shell.confirmLogout")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
