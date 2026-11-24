"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { CheckCircle2, Download, Files, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CandidateExports({
  filteredUrl,
  allUrl,
  count,
}: {
  filteredUrl: string;
  allUrl: string;
  count: number;
}) {
  const [pending, setPending] = useState<"filtered" | "all" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const alert = useRef<HTMLParagraphElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  async function download(scope: "filtered" | "all") {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 65000);
    setPending(scope);
    setError("");
    setNotice("");
    try {
      const response = await fetch(scope === "all" ? allUrl : filteredUrl, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(
          typeof result?.error?.message === "string"
            ? result.error.message
            : "The export could not be completed. Please try again.",
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `career-fair-${scope}-registrations.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (mounted.current) setNotice("CSV download started.");
    } catch (caught) {
      if (mounted.current)
        setError(
          timedOut
            ? "The download took too long. Please try again, or narrow your filters."
            : caught instanceof TypeError
              ? "We could not download the CSV. Check your connection and try again."
              : caught instanceof Error
                ? caught.message
                : "The export could not be completed. Please try again.",
        );
    } finally {
      window.clearTimeout(timeout);
      active.current = null;
      if (mounted.current) setPending(null);
    }
  }
  return (
    <div className="flex min-w-0 flex-col items-start gap-3 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending !== null || count === 0}
          aria-busy={pending === "filtered"}
          onClick={() => void download("filtered")}
        >
          {pending === "filtered" ? (
            <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
          ) : (
            <Download aria-hidden />
          )}
          Export {count.toLocaleString("en")} matching
        </Button>
        <Dialog.Root open={confirmAll} onOpenChange={setConfirmAll}>
          <Dialog.Trigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={pending !== null}
              aria-busy={pending === "all"}
            >
              {pending === "all" ? (
                <LoaderCircle
                  aria-hidden
                  className="motion-safe:animate-spin"
                />
              ) : (
                <Files aria-hidden />
              )}
              Export entire event
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
            <Dialog.Content
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancel.current?.focus();
              }}
              className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <span
                  aria-hidden
                  className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <Files className="size-5" />
                </span>
                <Dialog.Close
                  aria-label="Close export confirmation"
                  className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X aria-hidden className="size-5" />
                </Dialog.Close>
              </div>
              <Dialog.Title className="text-xl font-semibold">
                Export the entire event?
              </Dialog.Title>
              <Dialog.Description className="mt-3 text-sm leading-7 text-muted-foreground">
                This includes every candidate in the selected event, even if a
                search or filter is active. The CSV contains private candidate
                information.
              </Dialog.Description>
              <p className="mt-4 rounded-xl border border-border bg-background p-4 text-xs leading-6 text-muted-foreground">
                Store the file securely and follow the event retention policy.
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Dialog.Close asChild>
                  <Button ref={cancel} variant="outline">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  onClick={() => {
                    setConfirmAll(false);
                    void download("all");
                  }}
                >
                  <Download aria-hidden />
                  Export entire event
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div aria-live="polite" aria-atomic="true" className="max-w-md text-sm">
        {pending ? (
          <p role="status" className="text-muted-foreground">
            Preparing your CSV download...
          </p>
        ) : notice ? (
          <p
            role="status"
            className="inline-flex items-center gap-2 text-primary"
          >
            <CheckCircle2 aria-hidden className="size-4" />
            {notice}
          </p>
        ) : count === 0 ? (
          <p className="text-xs text-muted-foreground">
            No matching candidates to export.
          </p>
        ) : null}
      </div>
      {error && (
        <p
          ref={alert}
          tabIndex={-1}
          role="alert"
          className="max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
