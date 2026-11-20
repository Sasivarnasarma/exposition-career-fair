"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="site-container flex-1 py-20">
      <h1 className="text-3xl font-bold">Access is temporarily unavailable.</h1>
      <p className="mt-4 mb-8 text-muted-foreground">
        Please try again. If the problem continues, contact the organising
        committee.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/admin/login">Back to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
