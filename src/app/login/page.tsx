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
    <main className="grid min-h-screen bg-background p-3 lg:grid-cols-2 lg:gap-3">
      <aside className="login-panel relative hidden flex-col justify-between overflow-hidden rounded-lg p-10 text-white lg:flex">
        <div className="login-panel-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-violet-500/25 blur-3xl" />

        <div className="login-rise relative inline-flex w-fit items-center gap-3 rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#0b0b12]">
            AI
          </div>
          <span className="text-sm font-medium">{t("app.name")}</span>
        </div>

        <div className="login-rise relative max-w-xl [animation-delay:80ms]">
          <h1 className="text-balance text-5xl font-semibold leading-[1.1] tracking-tight">
            {t("auth.heroTitle")}
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/60">
            {t("auth.heroDescription")}
          </p>
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

      <section className="relative flex items-center justify-center px-4 py-10">
        <div className="absolute right-0 top-0">
          <LanguageSwitcher />
        </div>

        <form className="login-rise w-full max-w-sm" onSubmit={onSubmit}>
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
