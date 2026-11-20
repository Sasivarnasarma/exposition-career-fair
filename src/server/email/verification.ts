import "server-only";
import { getDatabase } from "../db";
import { AppError } from "../http/errors";
import { registrationSettings } from "../registrations/config";
import {
  candidateTokenValid,
  hashEmailToken,
  randomEmailToken,
} from "./tokens";
import { queueEmail } from "./queue";
import { emailAppOrigin, emailSender } from "./config";
import { encryptEmailPayload } from "./crypto";
export async function consumeCandidateToken(token: string) {
  if (!candidateTokenValid(token))
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "This verification link is invalid or expired. Please request a new one.",
    );
  return getDatabase().$transaction(
    async (tx) => {
      const value = await tx.candidateVerification.findUnique({
        where: { tokenHash: hashEmailToken(token) },
        include: { registration: { select: { emailVerifiedAt: true } } },
      });
      if (!value)
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "This verification link is invalid or expired. Please request a new one.",
        );
      if (value.consumedAt) return { status: "already-verified" as const };
      const now = new Date();
      if (value.expiresAt <= now)
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "This verification link is invalid or expired. Please request a new one.",
        );
      const claimed = await tx.candidateVerification.updateMany({
        where: { id: value.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (!claimed.count) return { status: "already-verified" as const };
      const updated = await tx.registration.updateMany({
        where: { id: value.registrationId, emailVerifiedAt: null },
        data: { emailVerifiedAt: now },
      });
      await tx.emailJob.updateMany({
        where: {
          registrationId: value.registrationId,
          kind: "CANDIDATE_VERIFICATION",
          state: "PENDING",
        },
        data: {
          state: "CANCELLED",
          payloadCiphertext: null,
          lastErrorCode: "ALREADY_VERIFIED",
        },
      });
      return {
        status: updated.count
          ? ("verified" as const)
          : ("already-verified" as const),
      };
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
export async function queueCandidateResend(email: string) {
  // Configuration is checked for known and unknown addresses alike.
  emailSender();
  encryptEmailPayload({});
  const { eventId } = registrationSettings();
  return getDatabase().$transaction(
    async (tx) => {
      const record = await tx.registration.findUnique({
        where: { eventId_email: { eventId, email } },
      });
      if (!record || record.emailVerifiedAt) return;
      await tx.$queryRaw`SELECT "id" FROM "Registration" WHERE "id"=${record.id} FOR UPDATE`;
      if (
        (
          await tx.registration.findUnique({
            where: { id: record.id },
            select: { emailVerifiedAt: true },
          })
        )?.emailVerifiedAt
      )
        return;
      const dedupeKey = `candidate-verification:${record.id}:${Math.floor(Date.now() / 300000)}`;
      if (await tx.emailJob.findUnique({ where: { dedupeKey } })) return;
      const token = randomEmailToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const url = new URL("/verify-email", emailAppOrigin());
      url.hash = `token=${token}`;
      await tx.candidateVerification.create({
        data: {
          registrationId: record.id,
          tokenHash: hashEmailToken(token),
          expiresAt,
        },
      });
      await queueEmail(tx, {
        kind: "CANDIDATE_VERIFICATION",
        to: record.email,
        recipientName: record.fullName,
        reference: record.reference,
        actionUrl: url.toString(),
        dedupeKey,
        registrationId: record.id,
        expiresAt,
      });
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
