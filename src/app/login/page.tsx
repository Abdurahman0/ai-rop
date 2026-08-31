"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

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
    <main className="relative flex min-h-screen overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-12rem] h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.55),transparent_34%)] dark:bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.05),transparent_34%)]" />
      </div>
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden min-h-[560px] flex-col justify-between p-8 lg:flex">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border bg-card/70 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">AI</div>
            <span className="text-sm font-medium text-foreground">{t("app.name")}</span>
          </div>
          <div className="max-w-xl">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-5xl font-semibold leading-tight tracking-normal text-foreground">{t("auth.heroTitle")}</h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">{t("auth.heroDescription")}</p>
            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
              {["auth.calls", "auth.aiReview", "auth.leads"].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-card/70 px-4 py-3 text-sm font-medium text-foreground shadow-sm backdrop-blur">
                  {t(item)}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center">
          <form className="w-full max-w-md animate-[login-card_360ms_ease-out] rounded-lg border border-border bg-card/90 p-7 shadow-2xl shadow-black/10 backdrop-blur-xl" onSubmit={onSubmit}>
            <div className="mb-7">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground shadow-sm">AI</div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("app.name")}</p>
                  <p className="text-xs text-muted-foreground">{t("app.intelligence")}</p>
                </div>
              </div>
              <h2 className="text-2xl font-semibold tracking-normal text-foreground">{t("auth.welcomeBack")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.subtitle")}</p>
            </div>
            <label className="block text-sm font-medium text-foreground">
              {t("auth.username")}
              <Input className="mt-2" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
            </label>
            <label className="mt-4 block text-sm font-medium text-foreground">
              {t("auth.password")}
              <div className="relative mt-2">
                <Input className="pr-11" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
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
              <p className="mt-4 animate-[toast-in_var(--motion-fast)_ease-out] rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {errorMessage}
              </p>
            ) : null}
            <Button className="mt-6 w-full" variant="primary" type="submit" loading={status === "loading"} icon={<LockKeyhole className="h-4 w-4" />}>
              {status === "loading" ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
