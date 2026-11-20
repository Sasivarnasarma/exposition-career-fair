"use client";

import { useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { cn } from "@/lib/utils";

type Entry = { label: string; count: number };
type Breakdowns = Record<
  | "institutions"
  | "faculties"
  | "academicYears"
  | "positions"
  | "firstPreferences"
  | "opportunities"
  | "referrals",
  Entry[]
>;
const views = [
  { id: "education", label: "Education" },
  { id: "careers", label: "Career interests" },
  { id: "discovery", label: "Discovery" },
] as const;

function Breakdown({
  title,
  entries,
  note,
  total,
}: {
  title: string;
  entries: Entry[];
  note: string;
  total: number;
}) {
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
      {entries.length ? (
        <ol
          className="mt-6 max-h-80 space-y-5 overflow-y-auto pr-2"
          aria-label={title}
        >
          {entries.map((entry) => (
            <li key={entry.label}>
              <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0 break-words">{entry.label}</span>
                <span className="shrink-0 font-medium text-primary tabular-nums">
                  {entry.count.toLocaleString("en-US")}{" "}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {total ? Math.round((entry.count / total) * 100) : 0}%
                  </span>
                </span>
              </div>
              <div
                aria-hidden
                className="h-1.5 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#997042] to-primary motion-safe:transition-[width] motion-safe:duration-700"
                  style={{ width: `${(entry.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-6 flex min-h-28 items-center gap-3 text-sm text-muted-foreground">
          <ChartNoAxesCombined aria-hidden className="size-5 text-primary/60" />
          Breakdowns will appear as candidates register.
        </div>
      )}
    </section>
  );
}

export function DashboardBreakdowns({
  breakdowns,
  total,
}: {
  breakdowns: Breakdowns;
  total: number;
}) {
  const [view, setView] = useState<(typeof views)[number]["id"]>("education");
  return (
    <section aria-labelledby="audience-heading" className="mt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Understand your audience</p>
          <h2 id="audience-heading" className="mt-2 text-xl font-semibold">
            The candidate picture
          </h2>
        </div>
        <div
          role="group"
          aria-label="Breakdown view"
          className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1"
        >
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={view === item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-xs font-medium transition-colors",
                view === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={
          view === "education" ? "grid gap-4 xl:grid-cols-2" : "hidden"
        }
      >
        <Breakdown
          title="Institutions"
          entries={breakdowns.institutions}
          total={total}
          note="Candidates by institution, including unlisted institutions."
        />
        <Breakdown
          title="Academic year"
          entries={breakdowns.academicYears}
          total={total}
          note="One academic status per candidate, including recent graduates."
        />
        <div className="xl:col-span-2">
          <Breakdown
            title="Faculties"
            entries={breakdowns.faculties}
            total={total}
            note="Candidates grouped by their recorded faculty name."
          />
        </div>
      </div>
      <div
        className={view === "careers" ? "grid gap-4 xl:grid-cols-2" : "hidden"}
      >
        <Breakdown
          title="First preference"
          entries={breakdowns.firstPreferences}
          total={total}
          note="Exactly one first preference per candidate."
        />
        <Breakdown
          title="All selected positions"
          entries={breakdowns.positions}
          total={total}
          note="Candidates may select several positions. Percentages can total more than 100%."
        />
        <div className="xl:col-span-2">
          <Breakdown
            title="Opportunity types"
            entries={breakdowns.opportunities}
            total={total}
            note="Candidates may select several opportunities. Percentages can total more than 100%."
          />
        </div>
      </div>
      <div hidden={view !== "discovery"}>
        <Breakdown
          title="How candidates heard about us"
          entries={breakdowns.referrals}
          total={total}
          note="One referral source per candidate. Other responses are grouped under Other."
        />
      </div>
    </section>
  );
}
