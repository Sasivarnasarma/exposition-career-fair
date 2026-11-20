import { Suspense } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AuthForm } from "./auth-form";
export function AuthScreen({ mode }: { mode: "login" | "forgot" | "reset" }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative site-container flex flex-1 items-center justify-center py-12 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]"
      />
      <Card className="w-full max-w-lg border-primary/20 shadow-[0_24px_100px_#00000040]">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
            <LockKeyhole aria-hidden className="size-5" />
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="size-4 text-primary" />
            Organiser access
          </span>
        </div>
        <p className="eyebrow">Exposition Career Fair</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {mode === "login"
            ? "Welcome back."
            : mode === "forgot"
              ? "Recover your account."
              : "Set a new password."}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {mode === "login"
            ? "Sign in to your organiser workspace."
            : mode === "forgot"
              ? "Request a password-reset link for your organiser account."
              : "Choose a strong password to keep your organiser account secure."}
        </p>
        <Suspense
          fallback={
            <p role="status" className="mt-8 text-sm text-muted-foreground">
              Loading secure form...
            </p>
          }
        >
          <AuthForm mode={mode} />
        </Suspense>
      </Card>
    </main>
  );
}
