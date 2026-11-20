import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
export default function CandidateNotFound() {
  return (
    <section className="rounded-3xl border border-border bg-card px-6 py-16 text-center">
      <p className="eyebrow">Registration unavailable</p>
      <h1 className="mt-4 text-3xl font-bold">Candidate not found</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
        This registration may no longer be available. Return to the candidate
        directory to find the latest records.
      </p>
      <Link
        href="/admin/registrations"
        className={buttonVariants({ className: "mt-7" })}
      >
        Back to candidates
      </Link>
    </section>
  );
}
