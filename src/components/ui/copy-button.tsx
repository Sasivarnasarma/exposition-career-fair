"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

export function CopyButton({
  value,
  label = "Copy reference",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="ghost"
        aria-label={copied ? "Reference copied" : label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setFailed(false);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2500);
          } catch {
            setFailed(true);
          }
        }}
        className="min-w-36 justify-start px-3"
      >
        {copied ? (
          <Check aria-hidden className="text-primary" />
        ) : (
          <Copy aria-hidden />
        )}
        <span aria-live="polite">{copied ? "Copied" : label}</span>
      </Button>
      {failed && (
        <p role="status" className="text-xs leading-5 text-muted-foreground">
          Select the reference above and copy it manually.
        </p>
      )}
    </div>
  );
}
