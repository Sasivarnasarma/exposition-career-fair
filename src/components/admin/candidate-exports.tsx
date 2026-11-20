"use client";

import { useState } from "react";
import { Download, Files, LoaderCircle } from "lucide-react";
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
  async function download(scope: "filtered" | "all") {
    if (
      scope === "all" &&
      !window.confirm(
        "Export every registration in the selected event? This includes candidates outside the current search and filters.",
      )
    )
      return;
    setPending(scope);
    setError("");
    try {
      const response = await fetch(scope === "all" ? allUrl : filteredUrl, {
        cache: "no-store",
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
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The export could not be completed. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="flex flex-col items-start gap-3 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending !== null}
          onClick={() => download("filtered")}
        >
          {pending === "filtered" ? (
            <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
          ) : (
            <Download aria-hidden />
          )}
          Export {count.toLocaleString("en")} matching
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => download("all")}
        >
          {pending === "all" ? (
            <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
          ) : (
            <Files aria-hidden />
          )}
          Export entire event
        </Button>
      </div>
      {pending && (
        <p role="status" className="text-xs text-muted-foreground">
          Preparing your CSV download...
        </p>
      )}
      {error && (
        <p role="alert" className="max-w-md text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
