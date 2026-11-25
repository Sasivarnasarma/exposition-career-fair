import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCheck,
  GraduationCap,
} from "lucide-react";
import type { getCandidateList } from "@/server/admin/candidates";

type Candidate = Awaited<ReturnType<typeof getCandidateList>>["rows"][number];
export function CandidateCards({ rows }: { rows: Candidate[] }) {
  return (
    <ul
      aria-label="Candidate registrations"
      className="divide-y divide-border md:hidden"
    >
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={"/admin/registrations/" + encodeURIComponent(row.id)}
            prefetch={false}
            className="group block px-5 py-6 transition-colors hover:bg-secondary/50 focus-visible:-outline-offset-4"
            aria-label={"View " + row.fullName + " registration"}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold wrap-break-word group-hover:text-primary">
                  {row.fullName}
                </h2>
                <p className="mt-1 text-sm leading-6 break-all text-muted-foreground">
                  {row.email}
                </p>
              </div>
              <ArrowRight
                aria-hidden
                className="mt-1 size-5 shrink-0 text-primary"
              />
            </div>
            <dl className="mt-5 grid gap-4 text-sm leading-6">
              <div className="flex items-start gap-3">
                <GraduationCap
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-primary"
                />
                <div className="min-w-0">
                  <dt className="sr-only">Education</dt>
                  <dd className="wrap-break-word">
                    {row.institutionName}
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {row.degreeName} · {row.academicYearLabel}
                    </span>
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BriefcaseBusiness
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-primary"
                />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    First preference
                  </dt>
                  <dd>{row.firstPreferenceLabel}</dd>
                </div>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs " +
                  (row.emailVerifiedAt
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground")
                }
              >
                {row.emailVerifiedAt && (
                  <CheckCheck aria-hidden className="size-3.5" />
                )}
                {row.emailVerifiedAt ? "Verified email" : "Unverified email"}
              </span>
              <time
                dateTime={row.createdAt}
                className="text-xs text-muted-foreground"
              >
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Colombo",
                }).format(new Date(row.createdAt))}
              </time>
            </div>
            <p className="mt-3 font-mono text-xs leading-5 break-all text-muted-foreground">
              {row.reference}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
