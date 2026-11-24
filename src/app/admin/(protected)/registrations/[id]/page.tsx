import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  GraduationCap,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { getCandidateDetail } from "@/server/admin/candidates";

export const metadata: Metadata = { title: "Registration details" };
export const instant = false;
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  }).format(new Date(value));
function safeWebsite(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
function Value({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm leading-6 break-words">
        {children || (
          <span className="text-muted-foreground">Not provided</span>
        )}
      </dd>
    </div>
  );
}
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-7">
      <h2 className="mb-6 flex items-center gap-3 text-base font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
function YesNo({ value }: { value: boolean }) {
  return (
    <span
      className={
        value
          ? "inline-flex items-center gap-1 text-primary"
          : "text-muted-foreground"
      }
    >
      {value && <Check aria-hidden className="size-3.5" />}
      {value ? "Yes" : "No"}
    </span>
  );
}
function Website({ value }: { value: string | null }) {
  const url = safeWebsite(value);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full items-center gap-1 text-primary underline-offset-4 hover:underline"
    >
      <span className="break-all">{url}</span>
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  ) : (
    <span className="text-muted-foreground">Not provided</span>
  );
}
const jobLabels: Record<string, string> = {
  REGISTRATION_CONFIRMATION: "Registration confirmation",
  CANDIDATE_VERIFICATION: "Email verification",
  ADMIN_INVITATION: "Administrator invitation",
  ADMIN_PASSWORD_RESET: "Password reset",
};
const stateLabels: Record<string, string> = {
  PENDING: "Queued",
  PROCESSING: "Sending",
  SENT: "Accepted by email provider",
  FAILED: "Delivery attempts ended",
  CANCELLED: "Cancelled",
};

async function Registration({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const candidate = await getCandidateDetail(await headers(), id);
  if (!candidate) notFound();
  return (
    <section className="space-y-7">
      <Link
        href={`/admin/registrations?eventId=${encodeURIComponent(candidate.event.id)}`}
        className="inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground hover:text-primary"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to candidates
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Registration / {candidate.reference}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight break-words sm:text-4xl">
            {candidate.fullName}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {candidate.event.name}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs text-primary">
          <ShieldCheck aria-hidden className="size-4" />
          Read-only candidate record
        </span>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Section
            title="Contact information"
            icon={<Mail aria-hidden className="size-5" />}
          >
            <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
              <Value label="Email address">{candidate.email}</Value>
              <Value label="Telephone">{candidate.phone}</Value>
              <Value label="District">{candidate.district.label}</Value>
              <Value label="LinkedIn">
                <Website value={candidate.linkedInUrl} />
              </Value>
              <Value label="GitHub / portfolio">
                <Website value={candidate.portfolioUrl} />
              </Value>
            </dl>
          </Section>
          <Section
            title="Academic background"
            icon={<GraduationCap aria-hidden className="size-5" />}
          >
            <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
              <Value label="Institution">{candidate.institutionName}</Value>
              <Value label="Faculty">{candidate.facultyName}</Value>
              <Value label="Degree programme">{candidate.degreeName}</Value>
              <Value label="Specialization">{candidate.specialization}</Value>
              <Value label="Academic year / status">
                {candidate.academicYear.label}
              </Value>
              <Value label="Graduation / expected graduation year">
                {candidate.graduationYear}
              </Value>
              <Value label="GPA">{candidate.gpa}</Value>
            </dl>
          </Section>
          <Section
            title="Career interests"
            icon={<BriefcaseBusiness aria-hidden className="size-5" />}
          >
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-medium text-primary">
                First preference
              </p>
              <p className="mt-2 text-lg font-semibold">
                {candidate.firstPreference.position.label}
              </p>
            </div>
            <dl className="mt-6 grid gap-6">
              <Value label="All selected career positions">
                <ul className="flex flex-wrap gap-2">
                  {candidate.positions.map(({ position }) => (
                    <li
                      key={position.id}
                      className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs"
                    >
                      {position.label}
                    </li>
                  ))}
                </ul>
              </Value>
              {candidate.otherPosition && (
                <Value label="Other position details">
                  {candidate.otherPosition}
                </Value>
              )}
              <Value label="Opportunity types">
                <ul className="flex flex-wrap gap-2">
                  {candidate.opportunities.map(({ opportunity }) => (
                    <li
                      key={opportunity.id}
                      className="rounded-full border border-border px-3 py-1.5 text-xs"
                    >
                      {opportunity.label}
                    </li>
                  ))}
                </ul>
              </Value>
              <Value label="How they heard about the event">
                {candidate.referralSource.label}
                {candidate.referralOther ? ` · ${candidate.referralOther}` : ""}
              </Value>
            </dl>
          </Section>
          <Section
            title="Consent record"
            icon={<ShieldCheck aria-hidden className="size-5" />}
          >
            {candidate.consent ? (
              <>
                <dl className="grid gap-6 sm:grid-cols-2">
                  <Value label="Information accuracy confirmed">
                    <YesNo value={candidate.consent.accurate} />
                  </Value>
                  <Value label="Privacy Notice accepted">
                    <YesNo value={candidate.consent.privacyAgreed} />
                  </Value>
                  <Value label="Optional event updates">
                    <YesNo value={candidate.consent.updates} />
                  </Value>
                  <Value label="Privacy Notice version">
                    {candidate.consent.privacyVersion}
                  </Value>
                  <Value label="Consent recorded">
                    <time dateTime={candidate.consent.recordedAt}>
                      {dateTime(candidate.consent.recordedAt)} (Sri Lanka)
                    </time>
                  </Value>
                </dl>
                <p className="mt-6 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
                  Registration does not grant permission to share this
                  candidate’s information with employers. Use candidate data
                  only for the purposes in the accepted Privacy Notice.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No consent record is available for this registration.
              </p>
            )}
          </Section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-card p-6">
            <BadgeCheck aria-hidden className="size-7 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">
              Registration accepted
            </h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              This application is stored successfully. Email ownership is
              tracked separately.
            </p>
            <dl className="mt-6 space-y-5">
              <Value label="Reference">
                <span className="font-mono text-primary">
                  {candidate.reference}
                </span>
              </Value>
              <Value label="Registered on">
                <time dateTime={candidate.createdAt}>
                  {dateTime(candidate.createdAt)} (Sri Lanka)
                </time>
              </Value>
              <Value label="Email ownership">
                <span
                  className={
                    candidate.emailVerifiedAt
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                >
                  {candidate.emailVerifiedAt ? "Verified" : "Unverified"}
                </span>
              </Value>
              {candidate.emailVerifiedAt && (
                <Value label="Verified on">
                  <time dateTime={candidate.emailVerifiedAt}>
                    {dateTime(candidate.emailVerifiedAt)} (Sri Lanka)
                  </time>
                </Value>
              )}
            </dl>
          </section>
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Mail aria-hidden className="size-4 text-primary" />
              Email activity
            </h2>
            {candidate.emailJobs.length ? (
              <ul className="mt-5 divide-y divide-border">
                {candidate.emailJobs.map((job, index) => (
                  <li
                    key={`${job.kind}-${index}`}
                    className="py-4 first:pt-0 last:pb-0"
                  >
                    <p className="text-xs font-medium">
                      {jobLabels[job.kind] ?? "Registration email"}
                    </p>
                    <p
                      className={`mt-1.5 text-xs ${job.state === "FAILED" ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {stateLabels[job.state] ?? "Unavailable"}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {job.attempts} attempt{job.attempts === 1 ? "" : "s"}
                      {job.sentAt ? ` · ${dateTime(job.sentAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                No email activity recorded.
              </p>
            )}
            <p className="mt-5 flex gap-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
              <CircleHelp aria-hidden className="mt-1 size-3.5 shrink-0" />
              Provider acceptance does not confirm inbox delivery or candidate
              verification.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}

export default function RegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="rounded-3xl border border-border bg-card p-10 text-sm text-muted-foreground"
        >
          Loading registration details…
        </div>
      }
    >
      <Registration params={params} />
    </Suspense>
  );
}
