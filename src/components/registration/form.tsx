"use client";
import Image from "next/image";
import { saveDraft } from "./draft-storage";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Turnstile } from "@/components/security/turnstile";
import photo from "@/assets/images/previous-fair-conversation.webp";
import { registrationDataSchema } from "@/shared/registration-data";
import {
  draftPayload,
  emptyDraft,
  readDraft,
  sections,
  steps,
  type RegistrationDraft,
  type RegistrationOptions,
} from "@/shared/registration-form";
import {
  PersonalStep,
  AcademicStep,
  PreferencesStep,
  ReviewStep,
} from "./steps";

export function RegistrationForm({
  options,
}: {
  options: RegistrationOptions;
}) {
  const router = useRouter();
  const methods = useForm<RegistrationDraft>({
    defaultValues: emptyDraft(options.privacyVersion),
    shouldUnregister: false,
  });
  const { getValues, subscribe, reset, clearErrors, setError } = methods;
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [recovery, setRecovery] = useState<ReturnType<typeof readDraft>>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const completed = useRef(false);
  const attempt = useRef<{ key: string; payload: string } | undefined>(
    undefined,
  );
  const [token, setToken] = useState("");
  const onToken = useCallback((value: string) => setToken(value), []);
  const [challenge, setChallenge] = useState(0);
  const [message, setMessage] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<{ path: string; step: number } | null>(null);
  const status = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const storageKey = `exposition-registration:${options.eventId}`;
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => {
      try {
        const saved = readDraft(
          sessionStorage.getItem(storageKey),
          options.eventId,
          options.privacyVersion,
        );
        if (alive) setRecovery(saved);
      } catch {
        if (alive) setStorageFailed(true);
      }
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [storageKey, options.eventId, options.privacyVersion]);
  useEffect(() => {
    if (!ready || recovery) return;
    function save() {
      if (completed.current) return;
      try {
        saveDraft(
          storageKey,
          options.eventId,
          step,
          getValues(),
          attempt.current,
        );
      } catch {
        setStorageFailed(true);
      }
    }
    save();
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: save,
    });
    const hasData = () => {
      const data = getValues();
      return (
        !completed.current &&
        !!(
          data.personal.fullName ||
          data.personal.email ||
          data.personal.phone ||
          data.academic.institutionName ||
          data.preferences.positionIds.length
        )
      );
    };
    function beforeUnload(event: BeforeUnloadEvent) {
      if (hasData()) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    function navigate(event: MouseEvent) {
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        !hasData() ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = new URL(anchor.href);
      if (
        target.pathname === location.pathname &&
        target.origin === location.origin
      )
        return;
      if (
        !window.confirm(
          "Leave this form? Your draft stays in this tab unless you clear it.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", navigate, true);
    };
  }, [
    ready,
    recovery,
    storageKey,
    getValues,
    subscribe,
    options.eventId,
    step,
  ]);
  function go(next: number) {
    setStep(next);
    setMessage("");
    setToken("");
    setChallenge((value) => value + 1);
    pendingFocus.current = { path: "heading", step: next };
  }
  function finishStepTransition() {
    if (!pendingFocus.current) return;
    if (heading.current?.textContent !== steps[pendingFocus.current.step])
      return;
    const target =
      pendingFocus.current.path === "heading"
        ? heading.current
        : document.getElementById(`field-${pendingFocus.current.path}`);
    if (!target) return;
    target.focus();
    target.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "start",
    });
    pendingFocus.current = null;
  }

  function focusError(path: string) {
    pendingFocus.current = {
      path,
      step: Math.max(
        0,
        sections.findIndex((section) => path.startsWith(section)),
      ),
    };
    requestAnimationFrame(finishStepTransition);
  }
  function validate(currentOnly: boolean) {
    clearErrors();
    const payload = draftPayload(getValues());
    const section = sections[step];
    const result = currentOnly
      ? registrationDataSchema.shape[section].safeParse(payload[section])
      : registrationDataSchema.safeParse(payload);
    if (result.success) return result.data;
    const issues = result.error.issues.map((issue) => ({
      ...issue,
      field: [currentOnly ? section : "", ...issue.path]
        .filter(Boolean)
        .join("."),
    }));
    for (const issue of issues)
      setError(issue.field as FieldPath<RegistrationDraft>, {
        type: "validate",
        message: issue.message,
      });
    const first = issues[0].field;
    if (!currentOnly) {
      const targetStep = sections.findIndex((sectionName) =>
        first.startsWith(sectionName),
      );
      if (targetStep >= 0 && targetStep !== step) setStep(targetStep);
    }
    focusError(first);
    setMessage("Please check the highlighted fields before continuing.");
    return null;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (step < 3) {
      if (validate(true)) go(step + 1);
      return;
    }
    if (!options.canSubmit) return;
    const data = validate(false);
    if (!data) return;
    if (!token) {
      setMessage("Please complete a new security check.");
      requestAnimationFrame(() => status.current?.focus());
      return;
    }
    const payload = JSON.stringify(data);
    if (!attempt.current || attempt.current.payload !== payload)
      attempt.current = { key: crypto.randomUUID(), payload };
    try {
      saveDraft(
        storageKey,
        options.eventId,
        step,
        getValues(),
        attempt.current,
      );
    } catch {
      setStorageFailed(true);
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          idempotencyKey: attempt.current.key,
          turnstileToken: token,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const errors = result?.error?.fieldErrors;
        if (errors && typeof errors === "object") {
          const fields = Object.entries(errors).filter(
            ([name, value]) =>
              sections.some((section) => name.startsWith(`${section}.`)) &&
              typeof value === "string",
          );
          for (const [name, value] of fields)
            setError(name as FieldPath<RegistrationDraft>, {
              type: "server",
              message: String(value),
            });
          if (fields.length) {
            const index = sections.findIndex((section) =>
              fields[0][0].startsWith(section),
            );
            if (index >= 0) setStep(index);
            focusError(fields[0][0]);
          }
        }
        setMessage(
          typeof result?.error?.message === "string"
            ? result.error.message
            : "We could not submit your registration. Please try again.",
        );
        requestAnimationFrame(() => status.current?.focus());
        return;
      }
      if (
        !result ||
        typeof result.reference !== "string" ||
        result.next !== "/registration/success"
      )
        throw new Error("Invalid receipt");
      completed.current = true;
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* Receipt remains available even if storage is restricted. */
      }
      router.replace("/registration/success");
      router.refresh();
    } catch {
      setMessage(
        "We could not confirm submission. Your information is still here. Complete a fresh security check and retry; the same request will not be saved twice.",
      );
      requestAnimationFrame(() => status.current?.focus());
    } finally {
      pending.current = false;
      setBusy(false);
      setToken("");
      setChallenge((value) => value + 1);
    }
  }
  function fresh() {
    attempt.current = undefined;
    reset(emptyDraft(options.privacyVersion));
    setRecovery(null);
    setStep(0);
    setMessage("");
    setToken("");
    setChallenge((value) => value + 1);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      setStorageFailed(true);
    }
  }
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="site-container py-12 sm:py-20"
    >
      <div className="mb-10 max-w-2xl">
        <p className="eyebrow">Exposition Career Fair {options.year}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Make your next move.
        </h1>
        <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
          Tell us about yourself and the opportunities you&apos;re looking for.
          Four steps to start a new conversation.
        </p>
      </div>
      {!options.canSubmit && (
        <div
          role="status"
          className="mb-7 rounded-2xl border border-primary/25 bg-primary/5 p-5 text-sm leading-7"
        >
          Pre-registration is not open yet. You can explore the form; privacy
          agreement and submission will become available when registration
          opens.
        </div>
      )}
      <div className="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-12">
        <aside className="space-y-7 lg:sticky lg:top-8">
          <nav aria-label="Registration progress">
            <ol className="grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-5">
              {steps.map((label, index) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => go(index)}
                    disabled={index >= step || busy || !!recovery || !ready}
                    aria-current={index === step ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${label}${index < step ? ", complete" : ""}`}
                    className="flex w-full flex-col items-center gap-2 rounded-xl py-2 text-center disabled:cursor-default lg:flex-row lg:gap-4 lg:text-left"
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${index === step ? "border-primary bg-primary text-primary-foreground shadow-[0_0_24px_#b8894f30]" : index < step ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {index < step ? (
                        <Check aria-hidden className="size-4" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span
                      className={`text-[10px] leading-4 sm:text-xs lg:text-sm ${index === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                    >
                      {label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div className="hidden overflow-hidden rounded-3xl border border-border lg:block">
            <div className="relative aspect-[4/3]">
              <Image
                src={photo}
                alt="A conversation at the previous Exposition Career Fair"
                fill
                sizes="260px"
                className="object-cover"
                quality={90}
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-background to-transparent"
              />
            </div>
            <div className="relative -mt-5 p-5">
              <p className="text-sm font-medium">
                One conversation.
                <br />A new direction.
              </p>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                A moment from the previous Career Fair.
              </p>
            </div>
          </div>
          <p className="hidden items-start gap-2 text-xs leading-6 text-muted-foreground lg:flex">
            <LockKeyhole
              aria-hidden
              className="mt-1 size-4 shrink-0 text-primary"
            />
            Your details are for the organising team. No candidate account is
            needed.
          </p>
        </aside>
        <Card className="min-w-0 p-5 sm:p-8 lg:p-10">
          <div className="mb-7 flex items-center justify-between gap-4">
            <p className="text-xs font-medium tracking-widest whitespace-nowrap text-primary uppercase">
              Step {step + 1} of 4
            </p>
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              Registration
            </span>
          </div>
          <div className="mb-8 h-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${(step + 1) * 25}%` }}
            />
          </div>
          {!ready ? (
            <p role="status" className="py-10 text-sm text-muted-foreground">
              Preparing your form...
            </p>
          ) : recovery ? (
            <div className="py-8">
              <h2 className="text-2xl font-semibold">
                Pick up where you left off.
              </h2>
              <p className="mt-4 mb-6 text-sm leading-7 text-muted-foreground">
                A saved draft is available in this tab. You&apos;ll review the
                accuracy confirmation and privacy agreement again before
                submitting.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    reset(recovery.values);
                    attempt.current = recovery.attempt;
                    setStep(recovery.step);
                    setRecovery(null);
                  }}
                >
                  Restore draft
                </Button>
                <Button variant="outline" onClick={fresh}>
                  Start fresh
                </Button>
              </div>
            </div>
          ) : (
            <FormProvider {...methods}>
              <form noValidate onSubmit={submit}>
                <fieldset disabled={busy} className="min-w-0">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.section
                      key={step}
                      initial={reduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0, y: -8 }}
                      transition={{ duration: reduced ? 0 : 0.18 }}
                      onAnimationComplete={finishStepTransition}
                      aria-labelledby="registration-step-title"
                    >
                      <h2
                        ref={heading}
                        id="registration-step-title"
                        tabIndex={-1}
                        className="mb-2 scroll-mt-8 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
                      >
                        {steps[step]}
                      </h2>
                      <p className="mb-8 text-sm leading-7 text-muted-foreground">
                        {
                          [
                            "Start with the best way for the organisers to reach you.",
                            "Your institution and programme do not need to be listed to register.",
                            "Choose the paths that match your interests and ambitions.",
                            "Take a moment to check your details before sending them.",
                          ][step]
                        }
                      </p>
                      {step === 0 ? (
                        <PersonalStep options={options} />
                      ) : step === 1 ? (
                        <AcademicStep options={options} />
                      ) : step === 2 ? (
                        <PreferencesStep options={options} />
                      ) : (
                        <ReviewStep options={options} onEdit={go} />
                      )}
                    </motion.section>
                  </AnimatePresence>
                </fieldset>
                {message && (
                  <div
                    ref={status}
                    tabIndex={-1}
                    role="alert"
                    className="mt-7 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm leading-7 outline-none"
                  >
                    {message}
                  </div>
                )}
                {step === 3 && options.canSubmit && (
                  <div className="mt-7">
                    <Turnstile
                      key={challenge}
                      action="registration"
                      onToken={onToken}
                    />
                  </div>
                )}
                <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                  <Button
                    variant="ghost"
                    disabled={busy || step === 0}
                    onClick={() => go(step - 1)}
                  >
                    <ArrowLeft aria-hidden />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      busy || (step === 3 && (!options.canSubmit || !token))
                    }
                    aria-busy={busy}
                  >
                    {busy ? (
                      <LoaderCircle
                        aria-hidden
                        className="motion-safe:animate-spin"
                      />
                    ) : null}
                    {step < 3
                      ? "Continue"
                      : busy
                        ? "Submitting..."
                        : "Submit pre-registration"}
                    {step < 3 && <ArrowRight aria-hidden />}
                  </Button>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs leading-6 text-muted-foreground">
                  <p>
                    {storageFailed
                      ? "Draft recovery is unavailable in this browser. Keep this tab open."
                      : "Your draft stays in this tab. Clear it on a shared device."}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm("Clear this draft and start again?"))
                        fresh();
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 hover:text-primary"
                  >
                    <RotateCcw aria-hidden className="size-3" />
                    Clear draft
                  </button>
                </div>
              </form>
            </FormProvider>
          )}
        </Card>
      </div>
    </main>
  );
}
