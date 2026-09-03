"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LoginShowcase } from "@/components/features/login-showcase";

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
        <defs>
          <linearGradient id="wordmark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <g fill="url(#wordmark)">
          <rect x="6" y="26" width="7" height="12" rx="3.5" />
          <rect x="18" y="16" width="7" height="32" rx="3.5" />
          <rect x="30" y="8" width="7" height="48" rx="3.5" />
          <rect x="42" y="20" width="7" height="24" rx="3.5" />
          <rect x="54" y="28" width="6" height="8" rx="3" opacity="0.6" />
        </g>
      </svg>
      <span className="text-2xl font-semibold tracking-tight text-foreground">{"AI-rop"}</span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const { login, status, error } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // The store holds either a translation key ("auth.invalidCredentials") or a
  // ready-made backend sentence (403: the account belongs to no company).
  const errorMessage = error && /^[a-z][a-zA-Z]*(\.[a-zA-Z]+)+$/.test(error) ? t(error) : error;

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
    <main className="login-canvas relative min-h-screen overflow-hidden px-6 py-8 lg:px-10">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-[34rem] w-[34rem] rounded-full bg-violet-400/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[92rem] flex-col">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Wordmark />
          <LanguageSwitcher />
        </header>

        <div className="grid flex-1 items-center gap-10 pb-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-14">
          <section className="login-rise rounded-2xl border border-border bg-card/95 p-7 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl sm:p-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">{t("auth.welcomeBack")}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("auth.heroDescription")}</p>

            <form className="mt-8" onSubmit={onSubmit}>
              <label className="block text-sm font-medium text-foreground">
                {t("auth.username")}
                <div className="relative mt-2">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 pl-10"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="example@company.uz"
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
                className="group mt-7 h-12 w-full justify-between border-0 bg-gradient-to-r from-primary to-violet-500 text-base text-white shadow-lg shadow-primary/25 hover:brightness-110"
                type="submit"
                loading={status === "loading"}
              >
                <span className="mx-auto">{status === "loading" ? t("auth.signingIn") : t("auth.signIn")}</span>
                {status === "loading" ? null : <ArrowRight className="h-5 w-5 transition-transform duration-[var(--motion-fast)] group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">{t("app.intelligence")}</p>
          </section>

          <LoginShowcase />
        </div>
      </div>
    </main>
  );
}
