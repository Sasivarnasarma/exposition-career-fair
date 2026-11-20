"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Turnstile } from "@/components/security/turnstile";

export function AcceptInvitation() {
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);
  const [invitationToken, setInvitationToken] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const onChallenge = useCallback(
    (token: string) => setChallengeToken(token),
    [],
  );
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get("token") || "";
    if (fragment.has("token"))
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    // The token stays only in component memory, including Strict Mode's replay.
    void Promise.resolve().then(() => {
      setInvitationToken(/^[A-Za-z0-9_-]{43}$/.test(token) ? token : "");
      setReady(true);
    });
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !invitationToken || !challengeToken) return;
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") || "");
    if (password !== values.get("confirmation")) {
      setMessage("The passwords do not match.");
      requestAnimationFrame(() => status.current?.focus());
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/invitations/accept", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: invitationToken,
          password,
          name: String(values.get("name") || "").trim(),
          turnstileToken: challengeToken,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Too many attempts. Please wait before trying again."
            : response.status >= 500
              ? "Invitations are temporarily unavailable. Please try again."
              : "This invitation is invalid, expired or already used. Check your details or request a new invitation from the super administrator.",
        );
      } else {
        if (result?.success !== true)
          throw new Error("Invalid acceptance response");
        setSuccess(true);
        setInvitationToken("");
        setMessage(
          "Your administrator account is ready. Sign in with your email address and the password you just created.",
        );
      }
    } catch {
      setMessage(
        "We could not confirm acceptance. Check your connection and try again. If the invitation was already accepted, you can sign in.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      setChallengeToken("");
      setChallengeAttempt((value) => value + 1);
      requestAnimationFrame(() => status.current?.focus());
    }
  }
  if (!ready)
    return (
      <p role="status" className="mt-8 text-sm text-muted-foreground">
        Checking invitation...
      </p>
    );
  return (
    <div className="mt-8">
      {message && (
        <div
          ref={status}
          tabIndex={-1}
          role={success ? "status" : "alert"}
          className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-7 outline-none"
        >
          {success && (
            <CheckCircle2 aria-hidden className="mb-3 size-6 text-primary" />
          )}
          {message}
        </div>
      )}
      {!invitationToken && !success && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-border p-4 text-sm leading-7"
        >
          This invitation link is missing or invalid. Open the original link
          from your invitation email, or ask the super administrator for a new
          invitation.
        </p>
      )}
      {invitationToken && !success && (
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="invitation-name" className="text-sm font-medium">
                Display name
              </label>
              <Input
                id="invitation-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="invitation-password"
                className="text-sm font-medium"
              >
                New password
              </label>
              <div className="relative">
                <Input
                  id="invitation-password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  className="pr-14"
                />
                <button
                  type="button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  aria-pressed={visible}
                  onClick={() => setVisible((value) => !value)}
                  className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
                >
                  {visible ? (
                    <EyeOff aria-hidden className="size-4" />
                  ) : (
                    <Eye aria-hidden className="size-4" />
                  )}
                </button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Use at least 12 characters.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="invitation-confirmation"
                className="text-sm font-medium"
              >
                Confirm password
              </label>
              <Input
                id="invitation-confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
              />
            </div>
          </fieldset>
          <Turnstile
            key={challengeAttempt}
            action="admin-invitation"
            onToken={onChallenge}
          />
          <Button
            type="submit"
            disabled={busy || !challengeToken}
            aria-busy={busy}
            className="w-full"
          >
            {busy ? (
              <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
            ) : (
              <ArrowRight aria-hidden />
            )}
            {busy ? "Accepting invitation..." : "Create administrator account"}
          </Button>
        </form>
      )}
      <div className="mt-6 flex flex-wrap gap-4">
        <Button asChild variant={success ? "default" : "outline"}>
          <Link href="/admin/login">Back to sign in</Link>
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground hover:text-primary"
        >
          Back to event
        </Link>
      </div>
    </div>
  );
}
