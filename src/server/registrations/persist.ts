import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { getDatabase } from "../db";
import { AppError } from "../http/errors";
import { registrationDataSchema } from "../../shared/registration-data";

// Internal persistence layer only. The public endpoint must verify origin,
// rate limits and Turnstile before calling this function (later phases).
export async function persistRegistration(
  eventId: string,
  input: unknown,
  requestKey: string,
) {
  const key = z.uuid().safeParse(requestKey);
  const parsed = registrationDataSchema.safeParse(input);
  if (!key.success || !parsed.success)
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please check your registration information.",
    );
  const data = parsed.data;
  const requestHash = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  const db = getDatabase();
  const receipt = (record: { reference: string; requestHash: string }) => {
    if (record.requestHash !== requestHash)
      throw new AppError(
        "CONFLICT",
        409,
        "This request was already used for different information.",
      );
    return { reference: record.reference, replay: true };
  };
  try {
    return await db.$transaction(async (tx) => {
      const previous = await tx.registration.findUnique({
        where: {
          eventId_idempotencyKey: { eventId, idempotencyKey: key.data },
        },
        select: { reference: true, requestHash: true },
      });
      if (previous) return receipt(previous);
      const event = await tx.eventEdition.findUnique({
        where: { id: eventId },
      });
      if (
        !event?.registrationOpen ||
        (event.registrationClosesAt && event.registrationClosesAt <= new Date())
      )
        throw new AppError(
          "FORBIDDEN",
          403,
          "Registration is currently closed.",
        );
      if (
        event.privacyVersion !== data.additional.privacyVersion ||
        event.privacyVersion.startsWith("draft")
      )
        throw new AppError(
          "CONFLICT",
          409,
          "Please review the current privacy notice.",
        );
      const options = await tx.formOption.findMany({
        where: {
          id: {
            in: [
              data.personal.districtId,
              data.academic.academicYearId,
              data.additional.referralSourceId,
            ],
          },
          active: true,
        },
      });
      const expected = [
        [data.personal.districtId, "DISTRICT"],
        [data.academic.academicYearId, "ACADEMIC_YEAR"],
        [data.additional.referralSourceId, "REFERRAL_SOURCE"],
      ];
      if (
        expected.some(
          ([id, kind]) => !options.some((o) => o.id === id && o.kind === kind),
        )
      )
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "Please select valid form options.",
        );
      const positionCount = await tx.careerPosition.count({
        where: { id: { in: data.preferences.positionIds }, active: true },
      });
      const opportunityCount = await tx.opportunityType.count({
        where: { id: { in: data.preferences.opportunityIds }, active: true },
      });
      if (
        positionCount !== data.preferences.positionIds.length ||
        opportunityCount !== data.preferences.opportunityIds.length
      )
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "Please select valid career preferences.",
        );
      if (
        data.academic.institutionId &&
        !(await tx.institution.findFirst({
          where: { id: data.academic.institutionId, active: true },
        }))
      )
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "Please select a valid institution or enter its name.",
        );
      if (
        data.academic.facultyId &&
        !(await tx.faculty.findFirst({
          where: {
            id: data.academic.facultyId,
            institutionId: data.academic.institutionId || "",
            active: true,
          },
        }))
      )
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "Please select a faculty belonging to your institution or enter its name.",
        );
      if (
        data.academic.degreeProgrammeId &&
        !(await tx.degreeProgramme.findFirst({
          where: {
            id: data.academic.degreeProgrammeId,
            facultyId: data.academic.facultyId || "",
            active: true,
          },
        }))
      )
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "Please select a degree belonging to your faculty or enter its name.",
        );
      const id = randomUUID();
      const reference = `EXPO-${event.year}-${randomUUID().replaceAll("-", "").toUpperCase()}`;
      await tx.registration.create({
        data: {
          id,
          eventId,
          reference,
          idempotencyKey: key.data,
          requestHash,
          fullName: data.personal.fullName,
          email: data.personal.email,
          phone: data.personal.phone,
          districtId: data.personal.districtId,
          linkedInUrl: data.personal.linkedInUrl,
          portfolioUrl: data.personal.portfolioUrl,
          ...data.academic,
          firstPreferencePositionId: data.preferences.firstPreferencePositionId,
          otherPosition: data.preferences.positionIds.includes("other")
            ? data.preferences.otherPosition
            : null,
          referralSourceId: data.additional.referralSourceId,
          referralOther:
            data.additional.referralSourceId === "referral-other"
              ? data.additional.referralOther
              : null,
        },
      });
      await tx.registrationPosition.createMany({
        data: data.preferences.positionIds.map((positionId) => ({
          registrationId: id,
          positionId,
        })),
      });
      await tx.registrationOpportunity.createMany({
        data: data.preferences.opportunityIds.map((opportunityId) => ({
          registrationId: id,
          opportunityId,
        })),
      });
      await tx.consentRecord.create({
        data: {
          registrationId: id,
          accurate: true,
          updates: data.additional.updates,
          privacyAgreed: true,
          privacyVersion: event.privacyVersion,
        },
      });
      await tx.emailJob.create({
        data: {
          registrationId: id,
          kind: "REGISTRATION_CONFIRMATION",
          dedupeKey: `registration-confirmation:${id}`,
        },
      });
      return { reference, replay: false };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      const previous = await db.registration.findUnique({
        where: {
          eventId_idempotencyKey: { eventId, idempotencyKey: key.data },
        },
        select: { reference: true, requestHash: true },
      });
      if (previous) return receipt(previous);
      throw new AppError(
        "CONFLICT",
        409,
        "A registration already exists for this email address. To change your details, please contact the organisers.",
      );
    }
    throw new AppError(
      "UNAVAILABLE",
      503,
      "We could not save your registration. Please try again.",
    );
  }
}
