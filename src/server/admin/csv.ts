import "server-only";
import type { Prisma } from "../../generated/prisma/client";
import { getDatabase } from "../db";
import { requireAdmin } from "../auth/permissions";
import { AppError } from "../http/errors";
import {
  parseAdminFilters,
  type AdminFilters,
} from "../../shared/admin-filters";
import { candidateWhere, selectedEventId } from "./candidates";
import { consumeRateLimit, rateLimitKey } from "../security/rate-limit";

// Quoting protects delimiters; prefixing protects spreadsheet formula evaluation.
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s\u0000-\u001f\u007f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csvLine(values: unknown[]) {
  return values.map(csvCell).join(",") + "\r\n";
}
export const candidateCsvHeaders = [
  "Reference",
  "Event",
  "Full name",
  "Email",
  "Telephone",
  "District",
  "LinkedIn",
  "Portfolio",
  "Institution",
  "Faculty",
  "Degree",
  "Specialization",
  "Academic year",
  "Graduation year",
  "GPA",
  "First preference",
  "Selected positions",
  "Other position",
  "Opportunity types",
  "Referral source",
  "Other referral",
  "Email verified",
  "Email verified at",
  "Registered at",
  "Accuracy confirmed",
  "Event updates opted in",
  "Privacy agreed",
  "Privacy notice version",
  "Consent recorded at",
];
const csvSelect = {
  id: true,
  reference: true,
  event: { select: { name: true } },
  fullName: true,
  email: true,
  phone: true,
  district: { select: { label: true } },
  linkedInUrl: true,
  portfolioUrl: true,
  institutionName: true,
  facultyName: true,
  degreeName: true,
  specialization: true,
  academicYear: { select: { label: true } },
  graduationYear: true,
  gpa: true,
  firstPreference: { select: { position: { select: { label: true } } } },
  positions: {
    select: { position: { select: { label: true } } },
    orderBy: { positionId: "asc" },
  },
  otherPosition: true,
  opportunities: {
    select: { opportunity: { select: { label: true } } },
    orderBy: { opportunityId: "asc" },
  },
  referralSource: { select: { label: true } },
  referralOther: true,
  emailVerifiedAt: true,
  createdAt: true,
  consent: {
    select: {
      accurate: true,
      updates: true,
      privacyAgreed: true,
      privacyVersion: true,
      recordedAt: true,
    },
  },
} satisfies Prisma.RegistrationSelect;
type CsvRecord = Prisma.RegistrationGetPayload<{ select: typeof csvSelect }>;
export function candidateCsvRow(r: CsvRecord) {
  const yesNo = (value: boolean | undefined) =>
    value === undefined ? "" : value ? "Yes" : "No";
  return csvLine([
    r.reference,
    r.event.name,
    r.fullName,
    r.email,
    r.phone,
    r.district.label,
    r.linkedInUrl,
    r.portfolioUrl,
    r.institutionName,
    r.facultyName,
    r.degreeName,
    r.specialization,
    r.academicYear.label,
    r.graduationYear,
    r.gpa?.toString(),
    r.firstPreference.position.label,
    r.positions.map((v) => v.position.label).join("; "),
    r.otherPosition,
    r.opportunities.map((v) => v.opportunity.label).join("; "),
    r.referralSource.label,
    r.referralOther,
    yesNo(Boolean(r.emailVerifiedAt)),
    r.emailVerifiedAt?.toISOString(),
    r.createdAt.toISOString(),
    yesNo(r.consent?.accurate),
    yesNo(r.consent?.updates),
    yesNo(r.consent?.privacyAgreed),
    r.consent?.privacyVersion,
    r.consent?.recordedAt.toISOString(),
  ]);
}
export function exportFilters(params: URLSearchParams): {
  scope: "all" | "filtered";
  filters: AdminFilters;
} {
  const scopes = params.getAll("scope");
  if (scopes.length !== 1 || !["all", "filtered"].includes(scopes[0]))
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please choose filtered records or all event records.",
    );
  let filters: AdminFilters;
  try {
    filters = parseAdminFilters(params);
  } catch {
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please check the export filters.",
    );
  }
  const scope = scopes[0] as "all" | "filtered";
  return {
    scope,
    filters: scope === "all" ? { eventId: filters.eventId, page: 1 } : filters,
  };
}

export async function createCandidateExport(request: Request) {
  const actor = await requireAdmin(request.headers, "registrations:export");
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new AppError(
      "FORBIDDEN",
      403,
      "Open exports from the organiser workspace.",
    );
  const { scope, filters } = exportFilters(new URL(request.url).searchParams);
  const rate = await consumeRateLimit(
    rateLimitKey("admin-export", actor.userId),
    6,
    60,
  );
  if (!rate.allowed)
    throw new AppError(
      "RATE_LIMITED",
      429,
      "Please wait a minute before exporting again.",
    );
  const db = getDatabase();
  const where = candidateWhere(filters);
  const event = await db.eventEdition.findUnique({
    where: { id: selectedEventId(filters.eventId) },
    select: { id: true },
  });
  if (!event)
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please select an available event.",
    );
  const filterFields = Object.keys(filters).filter(
    (key) => key !== "page" && filters[key as keyof AdminFilters] !== undefined,
  );
  // Persist before streaming so interrupted downloads remain visible to organisers.
  const requestAudit = await db.auditEvent.create({
    data: {
      actorId: actor.userId,
      action: "REGISTRATIONS_EXPORT_REQUESTED",
      targetId: event.id,
      metadata: { scope, filterFields },
    },
    select: { id: true },
  });
  let cancelled = false;
  let wake: (() => void) | undefined;
  let markReady!: () => void;
  let markFailed!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    markFailed = reject;
  });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = async (text: string) => {
        if (cancelled || request.signal.aborted)
          throw new Error("Export cancelled");
        controller.enqueue(encoder.encode(text));
        if ((controller.desiredSize ?? 0) <= 0)
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 35000);
            wake = () => {
              clearTimeout(timer);
              resolve();
            };
          });
        if (cancelled || request.signal.aborted)
          throw new Error("Export cancelled");
      };
      request.signal.addEventListener(
        "abort",
        () => {
          cancelled = true;
          wake?.();
        },
        { once: true },
      );
      void db
        .$transaction(
          async (tx) => {
            // Repeatable-read gives every keyset batch and its audit one snapshot.
            const profile = await tx.adminProfile.findUnique({
              where: { userId: actor.userId },
              select: { active: true, role: true },
            });
            if (
              !profile?.active ||
              !["ADMIN", "SUPER_ADMIN"].includes(profile.role)
            )
              throw new AppError(
                "FORBIDDEN",
                403,
                "Administrator access is required.",
              );
            const event = await tx.eventEdition.findUnique({
              where: { id: selectedEventId(filters.eventId) },
              select: { id: true },
            });
            if (!event)
              throw new AppError(
                "INVALID_REQUEST",
                400,
                "Please select an available event.",
              );
            const count = await tx.registration.count({ where });
            markReady();
            await emit("\ufeff" + csvLine(candidateCsvHeaders));
            let cursor: string | undefined;
            let exported = 0;
            while (true) {
              const rows = await tx.registration.findMany({
                where,
                select: csvSelect,
                orderBy: { id: "asc" },
                take: 250,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
              });
              if (!rows.length) break;
              await emit(rows.map(candidateCsvRow).join(""));
              exported += rows.length;
              cursor = rows.at(-1)!.id;
            }
            if (exported !== count) throw new Error("Export count changed");
            await tx.auditEvent.create({
              data: {
                actorId: actor.userId,
                action: "REGISTRATIONS_EXPORTED",
                targetId: event.id,
                metadata: {
                  scope,
                  count: exported,
                  requestId: requestAudit.id,
                  filterFields,
                },
              },
            });
          },
          { isolationLevel: "RepeatableRead", timeout: 45000, maxWait: 10000 },
        )
        .then(() => {
          if (!cancelled) controller.close();
        })
        .catch((error) => {
          markFailed(error);
          if (!cancelled)
            controller.error(
              new Error("Export could not be completed. Please try again."),
            );
        });
    },
    pull() {
      wake?.();
      wake = undefined;
    },
    cancel() {
      cancelled = true;
      wake?.();
      wake = undefined;
    },
  });
  await ready;
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="career-fair-${scope}-registrations.csv"`,
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
