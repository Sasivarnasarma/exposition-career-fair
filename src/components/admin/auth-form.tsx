"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/security/turnstile";

type Mode = "login" | "forgot" | "reset";
export function AuthForm({ mode }: { mode: Mode }) {
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const onToken = useCallback((value: string) => setToken(value), []);
  const [challenge, setChallenge] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);
  const alert = useRef<HTMLDivElement>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetReady, setResetReady] = useState(mode !== "reset");
  const initialized = useRef(false);
  useEffect(() => {
    if (mode !== "reset" || initialized.current) return;
    initialized.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const values = fragment.getAll("token");
    const value =
      values.length === 1 && /^[A-Za-z0-9_-]{20,256}$/.test(values[0])
        ? values[0]
        : null;
    if (fragment.has("token"))
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    void Promise.resolve().then(() => {
      setResetToken(value);
      setResetReady(true);
    });
  }, [mode]);
  const invalidReset =
    mode === "reset" && resetReady && (!resetToken || params.has("error"));
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !token || invalidReset) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    if (mode === "reset" && password !== data.get("confirmPassword")) {
      setMessage("The passwords do not match.");
      setBusy(false);
      pending.current = false;
      requestAnimationFrame(() => alert.current?.focus());
      return;
    }
    const endpoint =
      mode === "login"
        ? "sign-in/email"
        : mode === "forgot"
          ? "request-password-reset"
          : "reset-password";
    try {
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-captcha-response": token,
        },
        body: JSON.stringify(
          mode === "reset"
            ? { newPassword: password, token: resetToken }
            : {
                email: String(data.get("email") || "")
                  .trim()
                  .toLowerCase(),
                ...(mode === "login" ? { password } : {}),
              },
        ),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : mode === "reset" && response.status === 400
              ? "This reset link is invalid or expired. Please contact the organising committee."
              : response.status >= 500
                ? "Sign-in is temporarily unavailable. Please try again."
                : "Unable to complete this request. Check your details and try a new security check.",
        );
      } else if (mode === "login") {
        router.replace("/admin");
        router.refresh();
        return;
      } else {
        setSuccess(true);
        setMessage(
          mode === "forgot"
            ? "If an eligible organiser account exists, a reset message has been queued. Check your inbox and spam folder."
            : "Password updated. You can now sign in with your new password.",
        );
      }
    } catch {
      setMessage(
        "We could not connect. Please check your connection and try again.",
      );
    } finally {
      setBusy(false);
      pending.current = false;
      setToken("");
      setChallenge((v) => v + 1);
      requestAnimationFrame(() => alert.current?.focus());
    }
  }
  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {mode === "login" && params.get("reason") === "session" && (
        <p
          role="status"
          className="rounded-xl border border-border bg-secondary p-4 text-sm text-muted-foreground"
        >
          Please sign in to continue. Your session may have expired.
        </p>
      )}
      {invalidReset && (
        <p role="alert" className="rounded-xl border border-border p-4 text-sm">
          This reset link is missing or expired. Please contact the organising
          committee.
        </p>
      )}
      {message && (
        <div
          ref={alert}
          tabIndex={-1}
          role={success ? "status" : "alert"}
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 focus:outline-none"
        >
          {message}
        </div>
      )}
      {!resetReady && <p role="status">Loading reset link...</p>}
      {resetReady && !success && !invalidReset && (
        <>
          {mode !== "reset" && (
            <div className="grid gap-3">
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium"
              >
                Email address
              </label>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                disabled={busy}
                placeholder="you@example.org"
              />
            </div>
          )}
          {mode !== "forgot" && (
            <div className="grid gap-3">
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium"
              >
                {mode === "reset" ? "New password" : "Password"}
              </label>
              <div className="relative">
                <Input
                  id="admin-password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete={
                    mode === "reset" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "reset" ? 12 : undefined}
                  maxLength={128}
                  disabled={busy}
                  className="pr-14"
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  aria-controls="admin-password"
                  disabled={busy}
                  onClick={() => setVisible((v) => !v)}
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {visible ? (
                    <EyeOff aria-hidden className="size-4" />
                  ) : (
                    <Eye aria-hidden className="size-4" />
                  )}
                </button>
              </div>
              {mode === "reset" && (
                <p className="text-xs text-muted-foreground">
                  Use at least 12 characters.
                </p>
              )}
            </div>
          )}
          {mode === "reset" && (
            <div className="grid gap-3">
              <label
                htmlFor="admin-password-confirm"
                className="block text-sm font-medium"
              >
                Confirm new password
              </label>
              <Input
                id="admin-password-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                disabled={busy}
              />
            </div>
          )}
          <Turnstile
            key={challenge}
            action={mode === "login" ? "admin-login" : "admin-reset"}
            onToken={onToken}
          />
          <Button
            type="submit"
            disabled={busy || !token}
            className="w-full"
            aria-busy={busy}
          >
            {busy ? (
              <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
            ) : null}
            {mode === "login"
              ? "Sign in"
              : mode === "forgot"
                ? "Account recovery"
                : "Update password"}
            {!busy && <ArrowRight aria-hidden />}
          </Button>
        </>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link
          className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary"
          href={mode === "login" ? "/admin/forgot-password" : "/admin/login"}
        >
          {mode === "login" ? "Forgot your password?" : "Back to sign in"}
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary"
        >
          Back to event
        </Link>
      </div>
      {mode === "login" && (
        <p className="border-t border-border pt-5 text-xs leading-6 text-muted-foreground">
          Access is reserved for the organising committee. Contact the super
          administrator if you need an account.
        </p>
      )}
    </form>
  );
}
