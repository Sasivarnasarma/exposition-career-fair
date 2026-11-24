"use client";

import { useRef } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { PrivacyNoticeContent } from "./notice-content";
import { Button } from "@/components/ui/button";

export function PrivacyNoticeTrigger({
  className = "rounded-sm text-primary underline underline-offset-4 hover:text-foreground",
  label = "Privacy Notice",
}: {
  className?: string;
  label?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className={className}>
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-8 sm:py-5">
            <div>
              <p className="mb-2 text-xs text-primary">Your information</p>
              <Dialog.Title
                ref={heading}
                tabIndex={-1}
                className="font-display text-3xl leading-tight outline-none sm:text-4xl"
              >
                Privacy notice
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close Privacy Notice"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-8">
            <PrivacyNoticeContent />
          </div>
          <div className="flex shrink-0 justify-end border-t border-border px-5 py-3 sm:px-8">
            <Dialog.Close asChild>
              <Button variant="outline">Back to the page</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
