import "server-only";
import { randomUUID } from "node:crypto";
import type { EmailJob } from "../../generated/prisma/client";
import { getDatabase } from "../db";
import { site } from "../../config/site";
import { deliveryEnabled, emailAppOrigin } from "./config";
import { decryptEmailPayload, encryptEmailPayload } from "./crypto";
import { messageSchema, prepareEmail } from "./queue";
import { randomEmailToken, hashEmailToken } from "./tokens";
import {
  EmailSendError,
  sendWithResend,
  type EmailTransport,
} from "./transport";

const LEASE_SECONDS = 300;
const MAX_ATTEMPTS = 6;
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
export type WorkerOptions = {
  maxJobs?: number;
  jobIds?: string[];
  transport?: EmailTransport;
};
async function claim(jobIds?: string[]) {
  const lease = randomUUID();
  const ids = jobIds || [];
  const rows = await getDatabase().$queryRaw<EmailJob[]>`
    UPDATE "EmailJob" SET "state"='PROCESSING', "leaseToken"=${lease}, "lockedAt"=CURRENT_TIMESTAMP,
      "firstAttemptAt"=COALESCE("firstAttemptAt", CURRENT_TIMESTAMP), "attempts"="attempts"+1
    WHERE "id"=(SELECT "id" FROM "EmailJob"
      WHERE (("state"='PENDING' AND "availableAt"<=CURRENT_TIMESTAMP) OR
        ("state"='PROCESSING' AND "lockedAt"<CURRENT_TIMESTAMP-${LEASE_SECONDS}*INTERVAL '1 second'))
        AND (${ids.length === 0} OR "id"=ANY(${ids}::text[]))
      ORDER BY "availableAt", "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *`;
  return rows[0] || null;
}
async function finish(
  job: EmailJob,
  state: "SENT" | "FAILED" | "CANCELLED",
  code?: string,
  providerId?: string,
) {
  await getDatabase().emailJob.updateMany({
    where: { id: job.id, state: "PROCESSING", leaseToken: job.leaseToken },
    data: {
      state,
      lastErrorCode: code || null,
      providerId: providerId || null,
      sentAt: state === "SENT" ? new Date() : null,
      lockedAt: null,
      leaseToken: null,
      payloadCiphertext: null,
    },
  });
}
async function payload(job: EmailJob) {
  if (job.payloadCiphertext)
    return messageSchema.parse(decryptEmailPayload(job.payloadCiphertext));
  if (job.kind !== "REGISTRATION_CONFIRMATION" || !job.registrationId)
    throw new EmailSendError("MISSING_PAYLOAD", false);
  const db = getDatabase();
  return db.$transaction(
    async (tx) => {
      const current = await tx.emailJob.findFirst({
        where: { id: job.id, state: "PROCESSING", leaseToken: job.leaseToken },
      });
      if (!current) return null;
      if (current.payloadCiphertext)
        return messageSchema.parse(
          decryptEmailPayload(current.payloadCiphertext),
        );
      const registration = await tx.registration.findUniqueOrThrow({
        where: { id: job.registrationId! },
      });
      const token = randomEmailToken();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const url = new URL("/verify-email", emailAppOrigin());
      url.hash = `token=${token}`;
      const message = prepareEmail({
        kind: "REGISTRATION_CONFIRMATION",
        to: registration.email,
        recipientName: registration.fullName,
        reference: registration.reference,
        actionUrl: url.toString(),
        mainWebsite: site.mainWebsite,
        dedupeKey: job.dedupeKey,
      });
      await tx.candidateVerification.create({
        data: {
          registrationId: registration.id,
          tokenHash: hashEmailToken(token),
          expiresAt,
        },
      });
      await tx.emailJob.update({
        where: { id: job.id },
        data: { payloadCiphertext: encryptEmailPayload(message), expiresAt },
      });
      return message;
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
async function obsolete(job: EmailJob) {
  if (job.kind === "CANDIDATE_VERIFICATION" && job.registrationId) {
    const record = await getDatabase().registration.findUnique({
      where: { id: job.registrationId },
      select: { emailVerifiedAt: true },
    });
    return !record || !!record.emailVerifiedAt;
  }
  if (
    job.kind === "ADMIN_INVITATION" &&
    job.dedupeKey.startsWith("admin-invitation:")
  ) {
    const record = await getDatabase().adminInvitation.findUnique({
      where: { id: job.dedupeKey.slice("admin-invitation:".length) },
      include: { invitedBy: true },
    });
    return (
      !record ||
      !!record.acceptedAt ||
      !!record.revokedAt ||
      !record.invitedBy.active ||
      record.invitedBy.role !== "SUPER_ADMIN"
    );
  }
  return false;
}
export async function runEmailWorker(options: WorkerOptions = {}) {
  const result = {
    sent: 0,
    retried: 0,
    failed: 0,
    cancelled: 0,
    disabled: false,
  };
  if (!options.transport && !deliveryEnabled())
    return { ...result, disabled: true };
  const maxJobs = options.maxJobs ?? 5;
  if (
    !Number.isInteger(maxJobs) ||
    maxJobs < 1 ||
    maxJobs > 10 ||
    (options.jobIds &&
      (options.jobIds.length === 0 ||
        options.jobIds.length > 10 ||
        options.jobIds.some((id) => typeof id !== "string" || id.length > 200)))
  )
    throw new Error("Invalid email worker options");
  const send = options.transport || sendWithResend;
  for (let i = 0; i < maxJobs; i++) {
    const job = await claim(options.jobIds);
    if (!job) break;
    try {
      if (
        (job.expiresAt && job.expiresAt <= new Date()) ||
        (await obsolete(job))
      ) {
        await finish(job, "CANCELLED", "LINK_EXPIRED_OR_OBSOLETE");
        result.cancelled++;
        continue;
      }
      if (
        job.attempts > MAX_ATTEMPTS ||
        (job.firstAttemptAt &&
          Date.now() - job.firstAttemptAt.getTime() >= RETRY_WINDOW_MS)
      ) {
        await finish(job, "FAILED", "RETRY_WINDOW_EXPIRED");
        result.failed++;
        continue;
      }
      const message = await payload(job);
      if (!message) continue;
      if (job.kind === "ADMIN_PASSWORD_RESET") {
        const user = await getDatabase().user.findUnique({
          where: { email: message.to[0] },
          include: { admin: true },
        });
        if (!user?.admin?.active) {
          await finish(job, "CANCELLED", "ADMIN_INACTIVE");
          result.cancelled++;
          continue;
        }
      }
      const delivered = await send(message, `exposition-email/${job.id}`);
      await finish(job, "SENT", undefined, delivered.id);
      result.sent++;
    } catch (error) {
      const retryable = !(error instanceof EmailSendError) || error.retryable;
      const code =
        error instanceof EmailSendError ? error.code : "DELIVERY_UNAVAILABLE";
      if (!retryable || job.attempts >= MAX_ATTEMPTS) {
        await finish(job, "FAILED", code);
        result.failed++;
      } else {
        await getDatabase().emailJob.updateMany({
          where: {
            id: job.id,
            state: "PROCESSING",
            leaseToken: job.leaseToken,
          },
          data: {
            state: "PENDING",
            leaseToken: null,
            lockedAt: null,
            lastErrorCode: code,
            availableAt: new Date(
              Date.now() + Math.min(3600, 30 * 2 ** (job.attempts - 1)) * 1000,
            ),
          },
        });
        result.retried++;
      }
    }
  }
  return result;
}
