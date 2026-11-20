import { z } from "zod";
import { normalizeEmail } from "./normalization";

const text = z
  .string()
  .trim()
  .min(1, "Please complete this field")
  .max(200, "Please use no more than 200 characters");
const optionalText = z.string().trim().max(200).optional();
const url = z
  .url()
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value))
  .optional();
export const registrationDataSchema = z
  .object({
    personal: z
      .object({
        fullName: text,
        email: z.string().trim().email().max(254).transform(normalizeEmail),
        phone: z
          .string()
          .trim()
          .min(7)
          .max(30)
          .regex(/^\+?[\d\s().-]+$/)
          .refine(
            (value) => {
              const digits = value.replace(/\D/g, "");
              return digits.length >= 7 && digits.length <= 15;
            },
            { message: "Please enter a valid contact number" },
          )
          .transform((value) => value.replace(/[\s().-]/g, "")),
        districtId: text,
        linkedInUrl: url,
        portfolioUrl: url,
      })
      .strict(),
    academic: z
      .object({
        institutionId: optionalText,
        facultyId: optionalText,
        degreeProgrammeId: optionalText,
        institutionName: text,
        facultyName: text,
        degreeName: text,
        specialization: optionalText,
        academicYearId: text,
        graduationYear: z
          .number({ error: "Enter a valid graduation year" })
          .int("Enter a whole year")
          .min(1950)
          .max(2200),
        gpa: z
          .number()
          .min(0)
          .max(99)
          .multipleOf(0.01, "Use no more than two decimal places")
          .optional(),
        gpaScale: z
          .number()
          .positive()
          .max(99)
          .multipleOf(0.01, "Use no more than two decimal places")
          .optional(),
      })
      .strict()
      .refine(
        (a) =>
          (a.gpa === undefined && a.gpaScale === undefined) ||
          (a.gpa !== undefined &&
            a.gpaScale !== undefined &&
            a.gpa <= a.gpaScale),
        {
          message:
            "Provide GPA and scale together, with GPA no greater than the scale",
          path: ["gpa"],
        },
      )
      .refine(
        (a) =>
          a.academicYearId !== "year-graduate" ||
          a.graduationYear <= new Date().getUTCFullYear(),
        {
          message: "For recent graduates, enter the year you graduated",
          path: ["graduationYear"],
        },
      ),
    preferences: z
      .object({
        positionIds: z
          .array(text)
          .min(1, "Choose at least one option")
          .max(40)
          .transform((ids) => [...new Set(ids)].sort()),
        firstPreferencePositionId: text,
        otherPosition: optionalText,
        opportunityIds: z
          .array(text)
          .min(1, "Choose at least one option")
          .max(7)
          .transform((ids) => [...new Set(ids)].sort()),
      })
      .strict()
      .refine((p) => p.positionIds.includes(p.firstPreferencePositionId), {
        message: "Choose a first preference from your selected positions",
        path: ["firstPreferencePositionId"],
      })
      .refine((p) => !p.positionIds.includes("other") || !!p.otherPosition, {
        message: "Specify the other career position",
        path: ["otherPosition"],
      }),
    additional: z
      .object({
        referralSourceId: text,
        referralOther: optionalText,
        accurate: z.literal(true, {
          error: "Please confirm that your information is accurate",
        }),
        updates: z.boolean(),
        privacyAgreed: z.literal(true, {
          error: "Please read and agree to the Privacy Notice",
        }),
        privacyVersion: text,
      })
      .strict()
      .refine(
        (a) => a.referralSourceId !== "referral-other" || !!a.referralOther,
        { message: "Specify the referral source", path: ["referralOther"] },
      ),
  })
  .strict();
export type RegistrationData = z.infer<typeof registrationDataSchema>;
