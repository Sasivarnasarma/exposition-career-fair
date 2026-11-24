import "server-only";
import { Prisma } from "../../generated/prisma/client";
import { getDatabase } from "../db";
import { requireAdmin } from "../auth/permissions";
import {
  type AdminFilters,
  adminFiltersSchema,
} from "../../shared/admin-filters";
import { AppError } from "../http/errors";

export const candidatePageSize = 25;
export function selectedEventId(eventId?: string) {
  return eventId || process.env.REGISTRATION_EVENT_ID || "issue-22-2027";
}
export function candidateWhere(
  filters: AdminFilters,
): Prisma.RegistrationWhereInput {
  const parsed = adminFiltersSchema.safeParse(filters);
  if (!parsed.success)
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please check the search and filter values.",
    );
  const f = parsed.data;
  const q = f.q?.replace(/[\\%_]/g, "\\$&");
  return {
    eventId: selectedEventId(f.eventId),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { reference: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(f.institution ? { institutionName: f.institution } : {}),
    ...(f.faculty ? { facultyName: f.faculty } : {}),
    ...(f.degree ? { degreeName: f.degree } : {}),
    ...(f.academicYear ? { academicYearId: f.academicYear } : {}),
    ...(f.position ? { positions: { some: { positionId: f.position } } } : {}),
    ...(f.opportunity
      ? { opportunities: { some: { opportunityId: f.opportunity } } }
      : {}),
    ...(f.verified
      ? { emailVerifiedAt: f.verified === "verified" ? { not: null } : null }
      : {}),
  };
}
export const candidateRowSelect = {
  id: true,
  reference: true,
  fullName: true,
  email: true,
  institutionName: true,
  degreeName: true,
  academicYear: { select: { label: true } },
  firstPreference: { select: { position: { select: { label: true } } } },
  emailVerifiedAt: true,
  createdAt: true,
} satisfies Prisma.RegistrationSelect;
type CandidateRow = Prisma.RegistrationGetPayload<{
  select: typeof candidateRowSelect;
}>;
export function serializeCandidateRow(row: CandidateRow) {
  return {
    id: row.id,
    reference: row.reference,
    fullName: row.fullName,
    email: row.email,
    institutionName: row.institutionName,
    degreeName: row.degreeName,
    academicYearLabel: row.academicYear.label,
    firstPreferenceLabel: row.firstPreference.position.label,
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
export async function getCandidateList(
  headers: Headers,
  filters: AdminFilters,
) {
  await requireAdmin(headers, "registrations:read");
  const where = candidateWhere(filters);
  return getDatabase().$transaction(
    async (tx) => {
      const total = await tx.registration.count({ where });
      const totalPages = Math.max(1, Math.ceil(total / candidatePageSize));
      const page = Math.min(filters.page, totalPages);
      const rows = await tx.registration.findMany({
        where,
        select: candidateRowSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * candidatePageSize,
        take: candidatePageSize,
      });
      return {
        rows: rows.map(serializeCandidateRow),
        total,
        page,
        pageSize: candidatePageSize,
        totalPages,
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 15000, maxWait: 10000 },
  );
}
export async function getCandidateOptions(headers: Headers) {
  await requireAdmin(headers, "registrations:read");
  const db = getDatabase();
  const [
    events,
    institutions,
    faculties,
    degrees,
    academicYears,
    positions,
    opportunities,
  ] = await Promise.all([
    db.eventEdition.findMany({
      select: { id: true, name: true },
      orderBy: { year: "desc" },
    }),
    db.registration.groupBy({
      by: ["institutionName"],
      orderBy: { institutionName: "asc" },
    }),
    db.registration.groupBy({
      by: ["facultyName"],
      orderBy: { facultyName: "asc" },
    }),
    db.registration.groupBy({
      by: ["degreeName"],
      orderBy: { degreeName: "asc" },
    }),
    db.formOption.findMany({
      where: { kind: "ACADEMIC_YEAR" },
      select: { id: true, label: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.careerPosition.findMany({
      select: { id: true, label: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    db.opportunityType.findMany({
      select: { id: true, label: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return {
    events,
    institutions: institutions.map((v) => v.institutionName),
    faculties: faculties.map((v) => v.facultyName),
    degrees: degrees.map((v) => v.degreeName),
    academicYears,
    positions,
    opportunities,
  };
}
export const candidateDetailSelect = {
  id: true,
  event: { select: { id: true, name: true } },
  reference: true,
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
  otherPosition: true,
  positions: { select: { position: { select: { id: true, label: true } } } },
  opportunities: {
    select: { opportunity: { select: { id: true, label: true } } },
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
  emailJobs: {
    select: { kind: true, state: true, attempts: true, sentAt: true },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.RegistrationSelect;
export async function getCandidateDetail(headers: Headers, id: string) {
  await requireAdmin(headers, "registrations:read");
  if (!id || id.length > 120) return null;
  const row = await getDatabase().registration.findUnique({
    where: { id },
    select: candidateDetailSelect,
  });
  if (!row) return null;
  return {
    ...row,
    gpa: row.gpa?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
    emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    consent: row.consent
      ? { ...row.consent, recordedAt: row.consent.recordedAt.toISOString() }
      : null,
    emailJobs: row.emailJobs.map((job) => ({
      ...job,
      sentAt: job.sentAt?.toISOString() ?? null,
    })),
  };
}
export async function getDashboardStats(headers: Headers, eventId?: string) {
  await requireAdmin(headers, "dashboard:read");
  const id = selectedEventId(eventId);
  if (id.length > 120)
    throw new AppError("INVALID_REQUEST", 400, "Please select a valid event.");
  return getDatabase().$transaction(
    async (tx) => {
      const event = await tx.eventEdition.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          registrationOpen: true,
          registrationClosesAt: true,
        },
      });
      // Aggregate the same event snapshot in PostgreSQL, rather than making a
      // separate network round trip for each count, group and label catalog.
      const groups = await tx.$queryRaw<
        { kind: string; label: string; count: number }[]
      >`
      WITH candidates AS MATERIALIZED (
        SELECT "id", "institutionName", "facultyName", "academicYearId",
          "firstPreferencePositionId", "referralSourceId", "emailVerifiedAt"
        FROM "Registration" WHERE "eventId" = ${id}
      )
      SELECT 'totals'::text AS kind, 'accepted'::text AS label, COUNT(*)::integer AS count FROM candidates
      UNION ALL
      SELECT 'totals', 'verified', (COUNT(*) FILTER (WHERE "emailVerifiedAt" IS NOT NULL))::integer FROM candidates
      UNION ALL
      SELECT 'institutions', "institutionName", COUNT(*)::integer FROM candidates GROUP BY "institutionName"
      UNION ALL
      SELECT 'faculties', "facultyName", COUNT(*)::integer FROM candidates GROUP BY "facultyName"
      UNION ALL
      SELECT 'academicYears', o."label", COUNT(*)::integer FROM candidates c JOIN "FormOption" o ON o."id" = c."academicYearId" GROUP BY o."id", o."label"
      UNION ALL
      SELECT 'positions', p."label", COUNT(*)::integer FROM candidates c JOIN "RegistrationPosition" s ON s."registrationId" = c."id" JOIN "CareerPosition" p ON p."id" = s."positionId" GROUP BY p."id", p."label"
      UNION ALL
      SELECT 'firstPreferences', p."label", COUNT(*)::integer FROM candidates c JOIN "CareerPosition" p ON p."id" = c."firstPreferencePositionId" GROUP BY p."id", p."label"
      UNION ALL
      SELECT 'opportunities', o."label", COUNT(*)::integer FROM candidates c JOIN "RegistrationOpportunity" s ON s."registrationId" = c."id" JOIN "OpportunityType" o ON o."id" = s."opportunityId" GROUP BY o."id", o."label"
      UNION ALL
      SELECT 'referrals', o."label", COUNT(*)::integer FROM candidates c JOIN "FormOption" o ON o."id" = c."referralSourceId" GROUP BY o."id", o."label"
    `;
      const recent = await tx.registration.findMany({
        where: { eventId: id },
        select: candidateRowSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
      });
      const entries = (kind: string) =>
        groups
          .filter((g) => g.kind === kind)
          .map(({ label, count }) => ({ label, count }))
          .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      const total =
        groups.find((g) => g.kind === "totals" && g.label === "accepted")
          ?.count ?? 0;
      const verified =
        groups.find((g) => g.kind === "totals" && g.label === "verified")
          ?.count ?? 0;
      const institutions = entries("institutions");
      return {
        event: event
          ? {
              ...event,
              registrationOpen:
                event.registrationOpen &&
                (!event.registrationClosesAt ||
                  event.registrationClosesAt > new Date()),
              registrationClosesAt:
                event.registrationClosesAt?.toISOString() ?? null,
            }
          : null,
        total,
        verified,
        unverified: total - verified,
        institutionCount: institutions.length,
        breakdowns: {
          institutions,
          faculties: entries("faculties"),
          academicYears: entries("academicYears"),
          positions: entries("positions"),
          firstPreferences: entries("firstPreferences"),
          opportunities: entries("opportunities"),
          referrals: entries("referrals"),
        },
        recent: recent.map(serializeCandidateRow),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 20000, maxWait: 10000 },
  );
}
