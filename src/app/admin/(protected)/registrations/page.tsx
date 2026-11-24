import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Search,
  SlidersHorizontal,
  UsersRound,
  CheckCheck,
} from "lucide-react";
import {
  getCandidateList,
  getCandidateOptions,
} from "@/server/admin/candidates";
import { parseAdminFilters } from "@/shared/admin-filters";
import { CandidateExports } from "@/components/admin/candidate-exports";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = { title: "Candidates" };
export const instant = false;
type SearchParams = Record<string, string | string[] | undefined>;
const filterKeys = [
  "eventId",
  "q",
  "institution",
  "faculty",
  "degree",
  "academicYear",
  "position",
  "opportunity",
  "verified",
] as const;
const selectStyle =
  "min-h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground";

function Field({
  label,
  name,
  value,
  choices,
  empty = "All",
}: {
  label: string;
  name: string;
  value?: string;
  choices: { value: string; label: string }[];
  empty?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-medium text-muted-foreground">
      {label}
      <select name={name} defaultValue={value ?? ""} className={selectStyle}>
        <option value="">{empty}</option>
        {value && !choices.some((choice) => choice.value === value) && (
          <option value={value}>{value} (unavailable)</option>
        )}
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  );
}

async function Candidates({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const raw = await searchParams;
  let filters: ReturnType<typeof parseAdminFilters>;
  try {
    filters = parseAdminFilters(raw);
  } catch {
    return (
      <section className="rounded-3xl border border-border bg-card p-8">
        <p className="eyebrow">Candidate directory</p>
        <h1 className="mt-3 text-3xl font-bold">Check your filters</h1>
        <p className="mt-3 text-muted-foreground">
          One or more filters are invalid. Clear them and start a new search.
        </p>
        <Link
          href="/admin/registrations"
          className={buttonVariants({ className: "mt-6" })}
        >
          Clear filters
        </Link>
      </section>
    );
  }
  const requestHeaders = await headers();
  const [data, options] = await Promise.all([
    getCandidateList(requestHeaders, filters),
    getCandidateOptions(requestHeaders),
  ]);
  const query = new URLSearchParams();
  for (const key of filterKeys) {
    const value = filters[key];
    if (value) query.set(key, value);
  }
  const pageHref = (page: number) => {
    const copy = new URLSearchParams(query);
    copy.set("page", String(page));
    return `/admin/registrations?${copy}`;
  };
  const exportQuery = new URLSearchParams(query);
  exportQuery.set("scope", "filtered");
  const allQuery = new URLSearchParams({ scope: "all" });
  if (filters.eventId) allQuery.set("eventId", filters.eventId);
  const filtered = filterKeys.some(
    (key) => key !== "eventId" && Boolean(filters[key]),
  );
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Colombo",
    }).format(new Date(value));
  const names = (values: string[]) =>
    values.map((value) => ({ value, label: value }));
  const ids = (values: { id: string; label: string }[]) =>
    values.map(({ id, label }) => ({ value: id, label }));
  return (
    <section className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Every connection starts here</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Candidate directory<span className="text-primary">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Explore registrations, understand career interests, and prepare your
            event with a clear view of every candidate.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3">
          <UsersRound aria-hidden className="size-5 text-primary" />
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {data.total.toLocaleString("en")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {filtered ? "Matching candidates" : "Event registrations"}
            </p>
          </div>
        </div>
      </div>
      <form
        key={query.toString()}
        action="/admin/registrations"
        method="get"
        className="rounded-3xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)_auto]">
          <label className="grid gap-2 text-xs font-medium text-muted-foreground">
            Search candidates
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-4 left-4 size-4"
              />
              <Input
                name="q"
                defaultValue={filters.q}
                placeholder="Name, email or registration reference"
                maxLength={120}
                className="pl-11"
              />
            </div>
          </label>
          <Field
            label="Event edition"
            name="eventId"
            value={filters.eventId}
            choices={options.events.map(({ id, name }) => ({
              value: id,
              label: name,
            }))}
            empty="Current event"
          />
          <Button type="submit">
            <Search aria-hidden />
            Apply filters
          </Button>
        </div>
        <details
          className="group mt-5 border-t border-border pt-4"
          open={filtered}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-primary">
            <SlidersHorizontal aria-hidden className="size-4" />
            Refine candidates
            <span className="ml-auto text-xs text-muted-foreground">
              Combine filters
            </span>
            <ArrowDownUp aria-hidden className="size-3.5" />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field
              label="Institution"
              name="institution"
              value={filters.institution}
              choices={names(options.institutions)}
            />
            <Field
              label="Faculty"
              name="faculty"
              value={filters.faculty}
              choices={names(options.faculties)}
            />
            <Field
              label="Degree programme"
              name="degree"
              value={filters.degree}
              choices={names(options.degrees)}
            />
            <Field
              label="Academic year"
              name="academicYear"
              value={filters.academicYear}
              choices={ids(options.academicYears)}
            />
            <Field
              label="Career position"
              name="position"
              value={filters.position}
              choices={ids(options.positions)}
            />
            <Field
              label="Opportunity type"
              name="opportunity"
              value={filters.opportunity}
              choices={ids(options.opportunities)}
            />
            <Field
              label="Email ownership"
              name="verified"
              value={filters.verified}
              choices={[
                { value: "verified", label: "Verified" },
                { value: "unverified", label: "Unverified" },
              ]}
            />
            <div className="flex items-end">
              <Link
                href={
                  filters.eventId
                    ? `/admin/registrations?eventId=${encodeURIComponent(filters.eventId)}`
                    : "/admin/registrations"
                }
                className={buttonVariants({
                  variant: "ghost",
                  className: "w-full",
                })}
              >
                Clear search & filters
              </Link>
            </div>
          </div>
        </details>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Exports include sensitive candidate details.
          <br />
          Store securely and follow the event retention policy.
        </p>
        <CandidateExports
          filteredUrl={`/api/admin/registrations/export?${exportQuery}`}
          allUrl={`/api/admin/registrations/export?${allQuery}`}
          count={data.total}
        />
      </div>
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        {data.rows.length > 0 ? (
          <>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <caption className="sr-only">
                  Candidate registrations, newest first. Open a candidate to
                  view their complete registration.
                </caption>
                <thead className="border-b border-border bg-secondary/35 text-[10px] tracking-wider text-muted-foreground uppercase">
                  <tr>
                    {[
                      "Candidate",
                      "Education",
                      "First preference",
                      "Email",
                      "Registered",
                      "Details",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-4 font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-primary/[0.025]"
                    >
                      <td className="max-w-64 px-5 py-5">
                        <Link
                          href={`/admin/registrations/${encodeURIComponent(row.id)}`}
                          prefetch={false}
                          className="block truncate font-semibold text-foreground hover:text-primary"
                        >
                          {row.fullName}
                        </Link>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {row.email}
                        </p>
                        <p className="mt-2 font-mono text-[10px] text-primary/80">
                          {row.reference}
                        </p>
                      </td>
                      <td className="max-w-60 px-5 py-5">
                        <p className="line-clamp-2 text-xs leading-5">
                          {row.institutionName}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {row.degreeName}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {row.academicYearLabel}
                        </p>
                      </td>
                      <td className="max-w-44 px-5 py-5 text-xs leading-5">
                        {row.firstPreferenceLabel}
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={
                            row.emailVerifiedAt
                              ? "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] text-primary"
                              : "inline-flex rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground"
                          }
                        >
                          {row.emailVerifiedAt && (
                            <CheckCheck aria-hidden className="size-3" />
                          )}
                          {row.emailVerifiedAt ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-xs whitespace-nowrap text-muted-foreground">
                        <time dateTime={row.createdAt}>
                          {formatDate(row.createdAt)}
                        </time>
                      </td>
                      <td className="px-5 py-5">
                        <Link
                          href={`/admin/registrations/${encodeURIComponent(row.id)}`}
                          prefetch={false}
                          aria-label={`View registration ${row.reference}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                            className: "px-3",
                          })}
                        >
                          <ArrowRight aria-hidden />
                          <span className="sr-only">View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav
              aria-label="Candidate pagination"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4"
            >
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                {((data.page - 1) * data.pageSize + 1).toLocaleString("en")}–
                {Math.min(data.page * data.pageSize, data.total).toLocaleString(
                  "en",
                )}{" "}
                of {data.total.toLocaleString("en")}
              </p>
              <div className="flex items-center gap-2">
                {data.page > 1 ? (
                  <Link
                    href={pageHref(data.page - 1)}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <ArrowLeft aria-hidden />
                    Previous
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    <ArrowLeft aria-hidden />
                    Previous
                  </Button>
                )}
                <span className="px-1 text-xs text-muted-foreground">
                  {data.page} / {Math.max(data.totalPages, 1)}
                </span>
                {data.page < data.totalPages ? (
                  <Link
                    href={pageHref(data.page + 1)}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Next
                    <ArrowRight aria-hidden />
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Next
                    <ArrowRight aria-hidden />
                  </Button>
                )}
              </div>
            </nav>
          </>
        ) : (
          <div className="px-6 py-20 text-center">
            <UsersRound
              aria-hidden
              className="mx-auto size-10 text-primary/50"
            />
            <h2 className="mt-5 text-xl font-semibold">
              {filtered
                ? "No candidates match these filters"
                : "Your next chapter starts here"}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              {filtered
                ? "Try a broader search or clear some filters to see more candidates."
                : "Registrations will appear here once candidates complete their application. There are no registrations for this event yet."}
            </p>
            {filtered && (
              <Link
                href={
                  filters.eventId
                    ? `/admin/registrations?eventId=${encodeURIComponent(filters.eventId)}`
                    : "/admin/registrations"
                }
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-6",
                })}
              >
                Clear search & filters
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          className="rounded-3xl border border-border bg-card p-10 text-sm text-muted-foreground"
        >
          Loading candidate directory…
        </div>
      }
    >
      <Candidates searchParams={searchParams} />
    </Suspense>
  );
}
