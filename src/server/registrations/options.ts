import "server-only";
import { getDatabase } from "../db";
import { registrationSettings } from "./config";
import type { RegistrationOptions } from "../../shared/registration-form";
export async function registrationOptions(): Promise<RegistrationOptions> {
  const db = getDatabase();
  const settings = registrationSettings();
  const [
    event,
    options,
    institutions,
    faculties,
    programmes,
    categories,
    opportunities,
  ] = await Promise.all([
    db.eventEdition.findUniqueOrThrow({ where: { id: settings.eventId } }),
    db.formOption.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, kind: true },
    }),
    db.institution.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.faculty.findMany({
      where: { active: true, institution: { active: true } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, institutionId: true },
    }),
    db.degreeProgramme.findMany({
      where: {
        active: true,
        faculty: { active: true, institution: { active: true } },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, facultyId: true },
    }),
    db.careerCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        label: true,
        positions: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true },
        },
      },
    }),
    db.opportunityType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true },
    }),
  ]);
  return {
    eventId: event.id,
    year: event.year,
    privacyVersion: event.privacyVersion,
    canSubmit:
      settings.enabled &&
      event.registrationOpen &&
      !event.privacyVersion.startsWith("draft") &&
      (!event.registrationClosesAt || event.registrationClosesAt > new Date()),
    districts: options.filter((o) => o.kind === "DISTRICT"),
    academicYears: options.filter((o) => o.kind === "ACADEMIC_YEAR"),
    referrals: options.filter((o) => o.kind === "REFERRAL_SOURCE"),
    institutions,
    faculties,
    programmes,
    categories,
    opportunities,
  };
}
