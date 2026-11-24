import { Suspense } from "react";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import photo from "@/assets/images/previous-fair-conversation.webp";
import { AuthForm } from "./auth-form";

export function AuthScreen({ mode }: { mode: "login" | "forgot" | "reset" }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-8 sm:py-14"
    >
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[0.85fr_1fr]">
        <aside
          className="relative hidden min-h-[36rem] overflow-hidden lg:block"
          aria-label="From the previous Career Fair"
        >
          <Image
            src={photo}
            alt="A candidate in conversation at the previous Exposition Career Fair"
            fill
            sizes="440px"
            className="object-cover"
            quality={90}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-9 text-white">
            <p className="mb-4 text-sm text-white/80">Exposition Career Fair</p>
            <p className="max-w-[14ch] font-display text-4xl leading-tight">
              Behind every opportunity, a conversation.
            </p>
            <p className="mt-5 max-w-xs text-sm leading-7 text-white/75">
              Your workspace for bringing candidates and opportunities together.
            </p>
          </div>
        </aside>
        <section className="min-w-0 px-5 py-8 sm:px-10 sm:py-11 lg:px-12">
          <p className="mb-7 inline-flex items-center gap-2 text-sm text-primary">
            <ShieldCheck aria-hidden className="size-4" />
            Organiser access
          </p>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            {mode === "login"
              ? "Welcome back."
              : mode === "forgot"
                ? "Recover your account."
                : "A fresh start."}
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
            {mode === "login"
              ? "Sign in to manage registrations and prepare for the Career Fair."
              : mode === "forgot"
                ? "Enter your organiser email to request a password-reset link."
                : "Choose a strong password for your organiser account."}
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
        </section>
      </div>
    </main>
  );
}
