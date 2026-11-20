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
    db.registration.findMany({
      distinct: ["institutionName"],
      select: { institutionName: true },
      orderBy: { institutionName: "asc" },
    }),
    db.registration.findMany({
      distinct: ["facultyName"],
      select: { facultyName: true },
      orderBy: { facultyName: "asc" },
    }),
    db.registration.findMany({
      distinct: ["degreeName"],
      select: { degreeName: true },
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
  gpaScale: true,
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
    gpaScale: row.gpaScale?.toString() ?? null,
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
      const where = { eventId: id };
      const [
        event,
        total,
        verified,
        institutions,
        faculties,
        academicYears,
        positions,
        firstPreferences,
        opportunities,
        referrals,
        recent,
      ] = await Promise.all([
        tx.eventEdition.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            registrationOpen: true,
            registrationClosesAt: true,
          },
        }),
        tx.registration.count({ where }),
        tx.registration.count({
          where: { ...where, emailVerifiedAt: { not: null } },
        }),

        tx.registration.groupBy({
          by: ["institutionName"],
          where,
          _count: { _all: true },
          orderBy: { _count: { institutionName: "desc" } },
        }),
        tx.registration.groupBy({
          by: ["facultyName"],
          where,
          _count: { _all: true },
          orderBy: { _count: { facultyName: "desc" } },
        }),
        tx.registration.groupBy({
          by: ["academicYearId"],
          where,
          _count: { _all: true },
        }),
        tx.registrationPosition.groupBy({
          by: ["positionId"],
          where: { registration: where },
          _count: { _all: true },
        }),
        tx.registration.groupBy({
          by: ["firstPreferencePositionId"],
          where,
          _count: { _all: true },
        }),
        tx.registrationOpportunity.groupBy({
          by: ["opportunityId"],
          where: { registration: where },
          _count: { _all: true },
        }),
        tx.registration.groupBy({
          by: ["referralSourceId"],
          where,
          _count: { _all: true },
        }),
        tx.registration.findMany({
          where,
          select: candidateRowSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
      ]);
      const [options, positionLabels, opportunityLabels] = await Promise.all([
        tx.formOption.findMany({ select: { id: true, label: true } }),
        tx.careerPosition.findMany({ select: { id: true, label: true } }),
        tx.opportunityType.findMany({ select: { id: true, label: true } }),
      ]);
      const lookup = (values: { id: string; label: string }[]) =>
        new Map(values.map((v) => [v.id, v.label]));
      const optionMap = lookup(options),
        positionMap = lookup(positionLabels),
        opportunityMap = lookup(opportunityLabels);
      const sorted = (values: { label: string; count: number }[]) =>
        values.sort(
          (a, b) => b.count - a.count || a.label.localeCompare(b.label),
        );
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
          institutions: institutions.map((v) => ({
            label: v.institutionName,
            count: v._count._all,
          })),
          faculties: faculties.map((v) => ({
            label: v.facultyName,
            count: v._count._all,
          })),
          academicYears: sorted(
            academicYears.map((v) => ({
              label: optionMap.get(v.academicYearId) ?? "Unavailable",
              count: v._count._all,
            })),
          ),
          positions: sorted(
            positions.map((v) => ({
              label: positionMap.get(v.positionId) ?? "Unavailable",
              count: v._count._all,
            })),
          ),
          firstPreferences: sorted(
            firstPreferences.map((v) => ({
              label:
                positionMap.get(v.firstPreferencePositionId) ?? "Unavailable",
              count: v._count._all,
            })),
          ),
          opportunities: sorted(
            opportunities.map((v) => ({
              label: opportunityMap.get(v.opportunityId) ?? "Unavailable",
              count: v._count._all,
            })),
          ),
          referrals: sorted(
            referrals.map((v) => ({
              label: optionMap.get(v.referralSourceId) ?? "Unavailable",
              count: v._count._all,
            })),
          ),
        },
        recent: recent.map(serializeCandidateRow),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 20000, maxWait: 10000 },
  );
}
