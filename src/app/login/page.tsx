"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  PhoneCall,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { useT } from "@/i18n/use-t";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

const highlights = [
  { key: "auth.calls", icon: PhoneCall },
  { key: "auth.aiReview", icon: Sparkles },
  { key: "auth.leads", icon: UserPlus },
];

const waveform = [
  10, 22, 14, 34, 26, 44, 30, 52, 38, 28, 46, 20, 36, 24, 42, 16, 30, 12, 26, 18,
];

const SCORE = 87;
const RING_LENGTH = 2 * Math.PI * 26;

function ScoreRing() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="url(#score-gradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - SCORE / 100)}
      />
      <defs>
        <linearGradient id="score-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const { login, status, error } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const errorMessage = error?.includes(".") ? t(error) : error;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    try {
      await login(username, password);
      router.replace("/dashboard");
    } catch {
      // The store owns the user-facing error state.
    }
  }

  return (
    <main className="grid min-h-screen bg-background p-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-3">
      <aside className="login-panel relative hidden flex-col justify-between overflow-hidden rounded-lg p-10 text-white lg:flex">
        {/* ambient light + texture */}
        <div className="login-aurora pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/45 blur-3xl" />
        <div className="login-aurora-slow pointer-events-none absolute -bottom-48 -right-32 h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="login-panel-grid pointer-events-none absolute inset-0" />
        <div className="login-noise pointer-events-none absolute inset-0" />

        {/* decorative shapes */}
        <svg
          className="login-float pointer-events-none absolute -right-24 -top-24 h-[30rem] w-[30rem] text-white/[0.09]"
          viewBox="0 0 400 400"
          fill="none"
          aria-hidden
        >
          <circle cx="200" cy="200" r="60" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="110" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="200" r="199" stroke="currentColor" strokeWidth="1" />
        </svg>
        <svg
          className="pointer-events-none absolute bottom-8 left-6 h-40 w-40 text-white/20"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <defs>
            <pattern id="login-dots" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#login-dots)" />
        </svg>
        <div className="login-float-slow pointer-events-none absolute right-1/3 top-24 h-24 w-24 rotate-[18deg] rounded-[28%] border border-white/15 bg-white/[0.04] backdrop-blur-sm" />

        {/* content */}
        <div className="login-rise relative inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#0b0b12]">
            AI
          </div>
          <span className="text-sm font-medium">{t("app.name")}</span>
        </div>

        <div className="login-rise relative max-w-xl [animation-delay:80ms]">
          <h1 className="text-balance text-[2.9rem] font-semibold leading-[1.08] tracking-tight">
            {t("auth.heroTitle")}
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/55">
            {t("auth.heroDescription")}
          </p>
        </div>

        {/* floating product mockup */}
        <div className="pointer-events-none absolute -right-10 bottom-40 hidden w-[22rem] xl:block">
          <div className="login-rise [animation-delay:220ms]">
          <div className="login-float rounded-lg border border-white/12 bg-white/[0.07] p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <ScoreRing />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-white/40">
                  {t("auth.aiReview")}
                </p>
                <p className="mt-1 text-2xl font-semibold">{SCORE}/100</p>
              </div>
            </div>
            <div className="mt-5 flex h-14 items-end gap-[3px]">
              {waveform.map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-full bg-gradient-to-t from-primary/40 to-cyan-300/70"
                  style={{ height: `${height + 8}%` }}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-white/45">
              <span className="inline-flex items-center gap-2">
                <span className="login-pulse h-2 w-2 rounded-full bg-emerald-400" />
                {t("auth.calls")}
              </span>
              <span className="font-mono">04:12</span>
            </div>
          </div>
          </div>

          <div className="login-rise -mt-4 ml-14 w-56 [animation-delay:320ms]">
          <div className="login-float-slow rounded-lg border border-white/12 bg-white/[0.09] p-4 shadow-xl shadow-black/40 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-400 text-xs font-semibold">
                AI
              </div>
              <div>
                <p className="text-sm font-medium">{t("auth.leads")}</p>
                <p className="text-xs text-white/45">+12 · 24h</p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="login-rise relative flex flex-wrap gap-2 [animation-delay:160ms]">
          {highlights.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-medium backdrop-blur"
            >
              <Icon className="h-4 w-4 text-white/70" />
              {t(key)}
            </div>
          ))}
        </div>
      </aside>

      <section className="relative flex items-center justify-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <svg
          className="pointer-events-none absolute -bottom-6 -left-6 h-48 w-48 text-foreground/[0.07]"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <defs>
            <pattern id="login-dots-light" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#login-dots-light)" />
        </svg>

        <div className="absolute right-0 top-0 z-10">
          <LanguageSwitcher />
        </div>

        <form className="login-rise relative w-full max-w-sm" onSubmit={onSubmit}>
          <div className="mb-9">
            <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm shadow-primary/25 lg:hidden">
              AI
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {t("auth.welcomeBack")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t("auth.subtitle")}
            </p>
          </div>

          <label className="block text-sm font-medium text-foreground">
            {t("auth.username")}
            <div className="relative mt-2">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-10"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="mt-5 block text-sm font-medium text-foreground">
            {t("auth.password")}
            <div className="relative mt-2">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 pl-10 pr-11"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition duration-[var(--motion-fast)] hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-5 animate-[toast-in_var(--motion-fast)_ease-out] rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              {errorMessage}
            </p>
          ) : null}

          <Button
            className="group mt-7 h-11 w-full"
            variant="primary"
            type="submit"
            loading={status === "loading"}
          >
            {status === "loading" ? t("auth.signingIn") : t("auth.signIn")}
            {status === "loading" ? null : (
              <ArrowRight className="h-4 w-4 transition-transform duration-[var(--motion-fast)] group-hover:translate-x-0.5" />
            )}
          </Button>

          <p className="mt-8 text-xs text-muted-foreground">{t("app.intelligence")}</p>
        </form>
      </section>
    </main>
  );
}
