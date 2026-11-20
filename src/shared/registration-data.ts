import { z } from "zod";
import { normalizeEmail } from "./normalization";

const text = z.string().trim().min(1).max(200);
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
          .regex(/^[+\d\s().-]+$/)
          .refine(
            (value) => {
              const digits = value.replace(/\D/g, "");
              return digits.length >= 7 && digits.length <= 15;
            },
            { message: "Please enter a valid contact number" },
          ),
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
        graduationYear: z.number().int().min(1950).max(2200),
        gpa: z.number().min(0).max(99).optional(),
        gpaScale: z.number().positive().max(99).optional(),
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
        },
      ),
    preferences: z
      .object({
        positionIds: z
          .array(text)
          .min(1)
          .max(40)
          .transform((ids) => [...new Set(ids)].sort()),
        firstPreferencePositionId: text,
        otherPosition: optionalText,
        opportunityIds: z
          .array(text)
          .min(1)
          .max(7)
          .transform((ids) => [...new Set(ids)].sort()),
      })
      .strict()
      .refine((p) => p.positionIds.includes(p.firstPreferencePositionId), {
        message: "First preference must be selected",
      })
      .refine((p) => !p.positionIds.includes("other") || !!p.otherPosition, {
        message: "Specify the other career position",
      }),
    additional: z
      .object({
        referralSourceId: text,
        referralOther: optionalText,
        accurate: z.literal(true),
        updates: z.boolean(),
        privacyAgreed: z.literal(true),
        privacyVersion: text,
      })
      .strict()
      .refine(
        (a) => a.referralSourceId !== "referral-other" || !!a.referralOther,
        { message: "Specify the referral source" },
      ),
  })
  .strict();
export type RegistrationData = z.infer<typeof registrationDataSchema>;
