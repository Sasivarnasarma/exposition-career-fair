"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/security/turnstile";
import {
  verificationEmailSchema,
  verificationResponseStatus,
  verificationTokenFromHash,
} from "@/shared/verification-contract";

type Outcome = "verified" | "already-verified" | "invalid" | null;

export function VerificationScreen() {
  const [link, setLink] = useState<{ ready: boolean; token: string | null }>({
    ready: false,
    token: null,
  });
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const pending = useRef(false);
  const [verificationError, setVerificationError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendSucceeded, setResendSucceeded] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const onToken = useCallback((token: string) => setChallengeToken(token), []);
  const status = useRef<HTMLDivElement>(null);
  const resendStatus = useRef<HTMLDivElement>(null);
  const emailField = useRef<HTMLInputElement>(null);
  const capturedLink = useRef<{ token: string | null } | null>(null);
  const verified = outcome === "verified" || outcome === "already-verified";

  useEffect(() => {
    let alive = true;
    function readLink() {
      if (!alive) return;
      const hasFragment = !!window.location.hash;
      const token = hasFragment
        ? verificationTokenFromHash(window.location.hash)
        : (capturedLink.current?.token ?? null);
      capturedLink.current = { token };
      // Link secrets stay in memory, outside request URLs and browser history.
      if (
        window.location.hash ||
        new URLSearchParams(window.location.search).has("token")
      ) {
        const params = new URLSearchParams(window.location.search);
        params.delete("token");
        const search = params.toString();
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.pathname}${search ? `?${search}` : ""}`,
        );
      }
      setLink({ ready: true, token });
      setOutcome(null);
      setVerificationError("");
    }
    void Promise.resolve().then(readLink);
    window.addEventListener("hashchange", readLink);
    return () => {
      alive = false;
      window.removeEventListener("hashchange", readLink);
    };
  }, []);

  async function verifyEmail() {
    if (pending.current || !link.token) return;
    pending.current = true;
    setBusy("verify");
    setVerificationError("");
    try {
      const response = await fetch("/api/verification/consume", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: link.token }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        if (response.status === 400 || response.status === 403) {
          setOutcome("invalid");
          setLink({ ready: true, token: null });
        } else
          setVerificationError(
            response.status === 429
              ? "Too many attempts. Please wait before trying again."
              : "Verification is temporarily unavailable. Please try again.",
          );
        return;
      }
      const result = verificationResponseStatus(await response.json());
      if (!result) throw new Error("Invalid verification response");
      setOutcome(result);
      setLink({ ready: true, token: null });
    } catch {
      setVerificationError(
        "We could not confirm verification. Please check your connection and try again.",
      );
    } finally {
      pending.current = false;
      setBusy(null);
      requestAnimationFrame(() => status.current?.focus());
    }
  }

  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const parsed = verificationEmailSchema.safeParse(email);
    setEmailError("");
    setResendMessage("");
    setResendSucceeded(false);
    if (!parsed.success) {
      setEmailError("Enter the email address used for your registration.");
      emailField.current?.focus();
      return;
    }
    if (!challengeToken) {
      setResendMessage(
        "Please complete the security check before requesting a new link.",
      );
      return;
    }
    pending.current = true;
    setBusy("resend");
    try {
      const response = await fetch("/api/verification/resend", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: parsed.data,
          turnstileToken: challengeToken,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        setResendMessage(
          response.status === 429
            ? "Too many requests. Please wait before trying again."
            : response.status >= 500
              ? "We could not process the request right now. Please try again."
              : "The request could not be accepted. Complete a new security check and try again.",
        );
        return;
      }
      const result = await response.json();
      if (!result || result.success !== true)
        throw new Error("Invalid resend response");
      setResendSucceeded(true);
      setResendMessage(
        "If an eligible registration exists and its email address has not already been verified, a verification message has been queued. Please check your inbox and spam folder.",
      );
    } catch {
      setResendMessage(
        "We could not connect. Your email is still here; please try again.",
      );
    } finally {
      pending.current = false;
      setBusy(null);
      setChallengeToken("");
      setChallengeAttempt((value) => value + 1);
      requestAnimationFrame(() => resendStatus.current?.focus());
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container flex flex-1 items-center justify-center py-12 sm:py-20"
    >
      <Card className="w-full max-w-2xl border-primary/20">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="icon-well">
            {verified ? (
              <CheckCircle2 aria-hidden className="size-6" />
            ) : (
              <MailCheck aria-hidden className="size-6" />
            )}
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck aria-hidden className="size-4 text-primary" />
            No account needed
          </span>
        </div>
        <p className="eyebrow">Exposition Career Fair</p>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
          {verified ? "Your email is verified." : "Confirm your email."}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {verified
            ? "The organising team can now recognise this address as verified for your registration."
            : "Verify the address used for your Career Fair pre-registration. This confirms email ownership; it does not create a candidate account."}
        </p>
        <div
          ref={status}
          tabIndex={-1}
          className="mt-7 outline-none"
          role="status"
          aria-live="polite"
        >
          {!link.ready ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle
                aria-hidden
                className="size-4 motion-safe:animate-spin"
              />
              Preparing your verification link...
            </p>
          ) : verified ? (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm leading-7">
              {outcome === "already-verified"
                ? "This email address was already verified. You do not need to verify it again."
                : "Email verification is complete. Your pre-registration remains separate from interview selection and job offers."}
            </div>
          ) : outcome === "invalid" ? (
            <p className="rounded-2xl border border-border p-5 text-sm leading-7">
              This link is invalid, expired, or no longer available. Request a
              fresh link below using the email address from your registration.
            </p>
          ) : link.token ? (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">
                Ready when you are. Use the button below to confirm this email
                address.
              </p>
              <Button
                onClick={verifyEmail}
                disabled={!!busy}
                aria-busy={busy === "verify"}
              >
                {busy === "verify" ? (
                  <LoaderCircle
                    aria-hidden
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <CheckCircle2 aria-hidden />
                )}
                {busy === "verify" ? "Verifying..." : "Verify email"}
              </Button>
            </div>
          ) : (
            <p className="rounded-2xl border border-border p-5 text-sm leading-7">
              Open the full verification link from your email, or request
              another link below. A registration reference alone cannot verify
              an email address.
            </p>
          )}
          {verificationError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-7"
            >
              {verificationError}
            </p>
          )}
        </div>
        {!verified && link.ready && (
          <section
            className="mt-9 border-t border-border pt-8"
            aria-labelledby="resend-title"
          >
            <h2 id="resend-title" className="text-xl font-semibold">
              Need a new link?
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Use the email address you registered with. Submitting this request
              does not create another registration.
            </p>
            <form noValidate onSubmit={resend} className="mt-6 space-y-5">
              <div className="grid gap-3">
                <label
                  htmlFor="verification-email"
                  className="block text-sm font-medium"
                >
                  Registration email
                </label>
                <Input
                  ref={emailField}
                  id="verification-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  disabled={!!busy}
                  required
                  aria-invalid={!!emailError}
                  aria-describedby={
                    emailError ? "verification-email-error" : undefined
                  }
                  placeholder="you@example.org"
                />
                {emailError && (
                  <p
                    id="verification-email-error"
                    className="text-sm text-destructive"
                  >
                    {emailError}
                  </p>
                )}
              </div>
              <Turnstile
                key={challengeAttempt}
                action="candidate-resend"
                onToken={onToken}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={!!busy || !challengeToken}
                aria-busy={busy === "resend"}
              >
                {busy === "resend" ? (
                  <LoaderCircle
                    aria-hidden
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <RotateCw aria-hidden />
                )}
                {busy === "resend"
                  ? "Requesting..."
                  : "Request a verification link"}
              </Button>
              {resendMessage && (
                <div
                  ref={resendStatus}
                  tabIndex={-1}
                  role={resendSucceeded ? "status" : "alert"}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-7 outline-none"
                >
                  {resendMessage}
                </div>
              )}
            </form>
          </section>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-primary hover:underline hover:underline-offset-4"
          >
            Back to the Career Fair
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center rounded-lg text-muted-foreground hover:text-primary"
          >
            Privacy Notice
          </Link>
        </div>
        <noscript>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Please enable JavaScript to confirm your email address or request a
            new link.
          </p>
        </noscript>
      </Card>
    </main>
  );
}
