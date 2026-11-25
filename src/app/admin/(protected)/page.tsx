import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import {
  ArrowUpRight,
  UsersRound,
  BadgeCheck,
  Clock3,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { getDashboardStats } from "@/server/admin/candidates";
import { site } from "@/config/site";
import { getDatabase } from "@/server/db";
import { parseAdminFilters } from "@/shared/admin-filters";
import { DashboardBreakdowns } from "@/components/admin/dashboard-breakdowns";
import { WorkspaceLoading } from "@/components/admin/workspace-loading";
import { Button } from "@/components/ui/button";

export const instant = false;
export const metadata = { title: "Overview" };
type Search = Record<string, string | string[] | undefined>;

async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const query = await searchParams;
  let eventId: string | undefined;
  try {
    eventId = parseAdminFilters({ eventId: query.eventId }).eventId;
  } catch {
    return (
      <section>
        <h1 className="text-2xl font-semibold">
          Choose a valid event edition.
        </h1>
        <Link
          href="/admin"
          className="mt-4 inline-block text-primary underline"
        >
          Return to overview
        </Link>
      </section>
    );
  }
  const stats = await getDashboardStats(await headers(), eventId);
  const events = await getDatabase().eventEdition.findMany({
    select: { id: true, name: true },
    orderBy: { year: "desc" },
  });
  const selectedId = stats.event?.id || eventId || "";
  const candidateHref = `/admin/registrations${selectedId ? `?eventId=${encodeURIComponent(selectedId)}` : ""}`;
  const percentage = stats.total
    ? Math.round((stats.verified / stats.total) * 100)
    : 0;
  const registrationOpen =
    site.registrationOpen && stats.event?.registrationOpen;
  const cards = [
    {
      label: "Registrations",
      value: stats.total,
      detail: "Accepted candidate submissions",
      icon: UsersRound,
    },
    {
      label: "Email verified",
      value: stats.verified,
      detail: `${percentage}% of registered candidates`,
      icon: BadgeCheck,
    },
    {
      label: "Awaiting verification",
      value: stats.unverified,
      detail: "Registration is already accepted",
      icon: Clock3,
    },
    {
      label: "Institutions",
      value: stats.institutionCount,
      detail: "Represented in this edition",
      icon: GraduationCap,
    },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-sm text-primary">
            {stats.event?.name || "Career Fair"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Event overview
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Registrations, candidate interests and the latest activity for this
            event.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href={candidateHref} prefetch={false}>
            View candidates <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <form action="/admin" className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="dashboard-event"
            className="text-xs font-medium text-muted-foreground"
          >
            Event edition
          </label>
          <select
            key={selectedId}
            id="dashboard-event"
            name="eventId"
            defaultValue={selectedId}
            className="min-h-11 max-w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="ghost" size="sm">
            Apply <ArrowRight aria-hidden />
          </Button>
        </form>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${registrationOpen ? "bg-emerald-400" : "bg-primary"}`}
          />
          {registrationOpen
            ? "Event registration enabled"
            : "Event registration closed"}
        </span>
      </div>
      <div className="mt-5 grid overflow-hidden rounded-2xl border border-border bg-card surface-panel sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <section
            key={label}
            className="border-border p-6 not-last:border-b sm:odd:border-r xl:not-last:border-r xl:not-last:border-b-0"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium text-muted-foreground">
                {label}
              </h2>
              <Icon aria-hidden className="size-4 text-primary" />
            </div>
            <p className="mt-5 text-4xl font-semibold tracking-tight tabular-nums">
              {value.toLocaleString("en-US")}
            </p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {detail}
            </p>
          </section>
        ))}
      </div>
      {!stats.event && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-border p-4 text-sm text-muted-foreground"
        >
          This event edition could not be found. Choose another edition above.
        </p>
      )}
      <DashboardBreakdowns breakdowns={stats.breakdowns} total={stats.total} />
      <section
        aria-labelledby="recent-heading"
        className="mt-10 overflow-hidden rounded-2xl border border-border bg-card"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2 id="recent-heading" className="text-xl font-semibold">
              Recent registrations
            </h2>
          </div>
          <Link
            href={candidateHref}
            prefetch={false}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs text-primary"
          >
            View all <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        </div>
        {stats.recent.length ? (
          <ul className="divide-y divide-border">
            {stats.recent.map((row) => (
              <li key={row.id}>
                <Link
                  prefetch={false}
                  href={`/admin/registrations/${encodeURIComponent(row.id)}`}
                  className="group flex flex-wrap items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-secondary/50 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium wrap-break-word group-hover:text-primary">
                      {row.fullName}
                    </p>
                    <p className="mt-1 text-xs wrap-break-word text-muted-foreground">
                      {row.institutionName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${row.emailVerifiedAt ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300" : "border-border text-muted-foreground"}`}
                    >
                      {row.emailVerifiedAt ? "Email verified" : "Unverified"}
                    </span>
                    <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Colombo",
                      }).format(new Date(row.createdAt))}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      className="size-4 text-muted-foreground group-hover:text-primary"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <UsersRound
              aria-hidden
              className="mx-auto mb-4 size-7 text-primary/60"
            />
            <h3 className="font-medium">No registrations yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Registrations will appear here when candidates submit their
              details. Choose an event above to view another edition.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
