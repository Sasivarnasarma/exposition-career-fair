import "server-only";
import { lockAdminLifecycle } from "./lifecycle-lock";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { requireAdmin } from "../auth/permissions";
import { getDatabase } from "../db";
import { AppError } from "../http/errors";
import { emailAppOrigin } from "../email/config";
import { queueEmail } from "../email/queue";
import { randomEmailToken, hashEmailToken } from "../email/tokens";
import { normalizeEmail } from "../../shared/normalization";

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform(normalizeEmail);
export const invitationAcceptanceSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    password: z.string().min(12).max(128),
    name: z.string().trim().min(2).max(120),
  })
  .strict();
const invalidInvitation = () =>
  new AppError(
    "INVALID_REQUEST",
    400,
    "This invitation is invalid, expired or already used. Please request a new invitation from the organising committee.",
  );

export async function createAdminInvitation(headers: Headers, email: string) {
  const actor = await requireAdmin(headers, "admins:manage");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success)
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please enter a valid email address.",
    );
  const db = getDatabase();
  const origin = emailAppOrigin();
  return db.$transaction(
    async (tx) => {
      // A small administrator population makes a shared lifecycle lock appropriate.
      await lockAdminLifecycle(tx);
      const inviter = await tx.adminProfile.findFirst({
        where: { userId: actor.userId, active: true, role: "SUPER_ADMIN" },
      });
      if (!inviter)
        throw new AppError(
          "FORBIDDEN",
          403,
          "Super-administrator access is required.",
        );
      const existing = await tx.user.findFirst({
        where: { email: { equals: parsed.data, mode: "insensitive" } },
        select: { id: true },
      });
      if (existing)
        throw new AppError(
          "CONFLICT",
          409,
          "An invitation cannot be created for an existing identity.",
        );
      const now = new Date();
      const pending = await tx.adminInvitation.findFirst({
        where: {
          email: parsed.data,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (pending) {
        const delivery = await tx.emailJob.findUnique({
          where: { dedupeKey: `admin-invitation:${pending.id}` },
          select: { state: true },
        });
        if (delivery && !["FAILED", "CANCELLED"].includes(delivery.state))
          return { id: pending.id, created: false };
        // A fresh, explicitly requested invitation replaces an undeliverable link.
        await tx.adminInvitation.update({
          where: { id: pending.id },
          data: { revokedAt: now },
        });
      }
      const token = randomEmailToken();
      const invitation = await tx.adminInvitation.create({
        data: {
          email: parsed.data,
          tokenHash: hashEmailToken(token),
          invitedById: actor.userId,
          expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        },
      });
      await queueEmail(tx, {
        kind: "ADMIN_INVITATION",
        to: parsed.data,
        recipientName: "Organiser",
        actionUrl: `${origin}/admin/accept-invitation#token=${encodeURIComponent(token)}`,
        dedupeKey: `admin-invitation:${invitation.id}`,
        expiresAt: invitation.expiresAt,
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.userId,
          action: "ADMIN_INVITATION_CREATED",
          targetId: invitation.id,
        },
      });
      return { id: invitation.id, created: true };
    },
    { timeout: 15000, maxWait: 10000 },
  );
}

export async function acceptAdminInvitation(
  token: string,
  password: string,
  name: string,
) {
  const parsed = invitationAcceptanceSchema.safeParse({
    token,
    password,
    name,
  });
  if (!parsed.success) throw invalidInvitation();
  const passwordHash = await hashPassword(parsed.data.password);
  const tokenHash = hashEmailToken(parsed.data.token);
  const db = getDatabase();
  try {
    await db.$transaction(
      async (tx) => {
        await lockAdminLifecycle(tx);
        const now = new Date();
        const invitation = await tx.adminInvitation.findUnique({
          where: { tokenHash },
          include: { invitedBy: { select: { active: true, role: true } } },
        });
        if (
          !invitation ||
          invitation.acceptedAt ||
          invitation.revokedAt ||
          invitation.expiresAt <= now ||
          !invitation.invitedBy.active ||
          invitation.invitedBy.role !== "SUPER_ADMIN"
        )
          throw invalidInvitation();
        if (
          await tx.user.findFirst({
            where: { email: { equals: invitation.email, mode: "insensitive" } },
            select: { id: true },
          })
        )
          throw invalidInvitation();
        const consumed = await tx.adminInvitation.updateMany({
          where: {
            id: invitation.id,
            tokenHash,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
            invitedBy: { active: true, role: "SUPER_ADMIN" },
          },
          data: { acceptedAt: now },
        });
        if (consumed.count !== 1) throw invalidInvitation();
        const id = randomUUID();
        await tx.user.create({
          data: {
            id,
            name: parsed.data.name,
            email: normalizeEmail(invitation.email),
            emailVerified: true,
            accounts: {
              create: {
                id: randomUUID(),
                accountId: id,
                providerId: "credential",
                password: passwordHash,
              },
            },
            admin: { create: { role: "ADMIN", active: true } },
          },
        });
        await tx.auditEvent.create({
          data: {
            actorId: invitation.invitedById,
            action: "ADMIN_INVITATION_ACCEPTED",
            targetId: id,
          },
        });
      },
      { timeout: 15000, maxWait: 10000 },
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    )
      throw invalidInvitation();
    throw new AppError(
      "UNAVAILABLE",
      503,
      "We could not accept this invitation. Please try again.",
    );
  }
  return { success: true };
}
