"use client";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-12 sm:px-10">
      <TriangleAlert aria-hidden className="mb-6 size-8 text-primary" />
      <p className="eyebrow">Please try again</p>
      <h1 className="mt-3 text-2xl font-semibold">
        We couldn’t load this workspace.
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
        Your data has not been changed. Refresh this view, or sign in again if
        your session has ended.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/admin/login">Sign in again</Link>
        </Button>
      </div>
    </section>
  );
}
