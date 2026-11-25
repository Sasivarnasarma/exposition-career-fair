import { z } from "zod";
import { registrationDataSchema } from "./registration-data";

export type RegistrationDraft = {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    districtId: string;
    linkedInUrl: string;
    portfolioUrl: string;
  };
  academic: {
    institutionId: string;
    facultyId: string;
    degreeProgrammeId: string;
    institutionName: string;
    facultyName: string;
    degreeName: string;
    specialization: string;
    academicYearId: string;
    graduationYear: string;
    gpa: string;
  };
  preferences: {
    positionIds: string[];
    firstPreferencePositionId: string;
    otherPosition: string;
    opportunityIds: string[];
  };
  additional: {
    referralSourceId: string;
    referralOther: string;
    accurate: boolean;
    updates: boolean;
    privacyAgreed: boolean;
    privacyVersion: string;
  };
};
export type RegistrationOptions = {
  eventId: string;
  year: number;
  privacyVersion: string;
  canSubmit: boolean;
  districts: { id: string; label: string }[];
  academicYears: { id: string; label: string }[];
  referrals: { id: string; label: string }[];
  institutions: { id: string; name: string }[];
  faculties: { id: string; name: string; institutionId: string }[];
  programmes: { id: string; name: string; facultyId: string }[];
  categories: {
    id: string;
    label: string;
    positions: { id: string; label: string }[];
  }[];
  opportunities: { id: string; label: string }[];
};
export const steps = [
  "Personal details",
  "Academic background",
  "Career preferences",
  "Review & submit",
] as const;
export const sections = [
  "personal",
  "academic",
  "preferences",
  "additional",
] as const;
export function emptyDraft(privacyVersion: string): RegistrationDraft {
  return {
    personal: {
      fullName: "",
      email: "",
      phone: "+94",
      districtId: "",
      linkedInUrl: "",
      portfolioUrl: "",
    },
    academic: {
      institutionId: "",
      facultyId: "",
      degreeProgrammeId: "",
      institutionName: "",
      facultyName: "",
      degreeName: "",
      specialization: "",
      academicYearId: "",
      graduationYear: "",
      gpa: "",
    },
    preferences: {
      positionIds: [],
      firstPreferencePositionId: "",
      otherPosition: "",
      opportunityIds: [],
    },
    additional: {
      referralSourceId: "",
      referralOther: "",
      accurate: false,
      updates: true,
      privacyAgreed: false,
      privacyVersion,
    },
  };
}
export function hasRegistrationInput(values: RegistrationDraft): boolean {
  return Object.entries(values).some(([section, fields]) =>
    Object.entries(fields).some(([name, value]) => {
      if (name === "privacyVersion") return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean")
        return section === "additional" && name === "updates" ? !value : value;
      if (typeof value !== "string" || !value.trim()) return false;
      return !(
        section === "personal" &&
        name === "phone" &&
        value.replace(/\s/g, "") === "+94"
      );
    }),
  );
}

export function draftPayload(values: RegistrationDraft) {
  const { academic, personal } = values;
  const optionalNumber = (value: string) =>
    value.trim() === "" ? undefined : Number(value);
  return {
    personal: {
      ...personal,
      linkedInUrl: personal.linkedInUrl.trim() || undefined,
      portfolioUrl: personal.portfolioUrl.trim() || undefined,
    },
    academic: {
      ...academic,
      institutionId: academic.institutionId || undefined,
      facultyId: academic.facultyId || undefined,
      degreeProgrammeId: academic.degreeProgrammeId || undefined,
      graduationYear: academic.graduationYear.trim()
        ? Number(academic.graduationYear)
        : NaN,
      gpa: optionalNumber(academic.gpa),
    },
    preferences: values.preferences,
    additional: values.additional,
  };
}
// Bound and validate browser storage before restoring values into the form.
const string = z.string().max(2048);
const storedValues = z
  .object({
    personal: z
      .object({
        fullName: string,
        email: string,
        phone: string,
        districtId: string,
        linkedInUrl: string,
        portfolioUrl: string,
      })
      .strict(),
    academic: z
      .object({
        institutionId: string,
        facultyId: string,
        degreeProgrammeId: string,
        institutionName: string,
        facultyName: string,
        degreeName: string,
        specialization: string,
        academicYearId: string,
        graduationYear: string,
        gpa: string,
      })
      .strict(),
    preferences: z
      .object({
        positionIds: z.array(string).max(40),
        firstPreferencePositionId: string,
        otherPosition: string,
        opportunityIds: z.array(string).max(7),
      })
      .strict(),
    additional: z
      .object({
        referralSourceId: string,
        referralOther: string,
        accurate: z.boolean(),
        updates: z.boolean(),
        privacyAgreed: z.boolean(),
        privacyVersion: string,
      })
      .strict(),
  })
  .strict();
const stored = z
  .object({
    version: z.literal(1),
    eventId: string,
    savedAt: z.number(),
    step: z.number().int().min(0).max(3),
    values: storedValues,
    attempt: z
      .object({ key: z.uuid(), payload: z.string().max(32768) })
      .optional(),
  })
  .strict();
export function readDraft(
  raw: string | null,
  eventId: string,
  privacyVersion: string,
  now = Date.now(),
) {
  if (!raw || raw.length > 65536) return null;
  try {
    const result = stored.safeParse(JSON.parse(raw));
    if (
      !result.success ||
      result.data.eventId !== eventId ||
      result.data.savedAt > now ||
      now - result.data.savedAt > 86400000
    )
      return null;
    const data = result.data;
    // Consent is always reviewed again after restoring a draft.
    data.values.additional = {
      ...data.values.additional,
      accurate: false,
      privacyAgreed: false,
      privacyVersion,
    };
    return data;
  } catch {
    return null;
  }
}
export const registrationEnvelope = z
  .object({
    data: registrationDataSchema,
    idempotencyKey: z.uuid(),
    turnstileToken: z.string().trim().min(1).max(2048),
  })
  .strict();
