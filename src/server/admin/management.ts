import "server-only";
import { lockAdminLifecycle } from "./lifecycle-lock";
import { z } from "zod";
import { getDatabase } from "../db";
import { requireAdmin } from "../auth/permissions";
import { AppError } from "../http/errors";

export const adminStatusSchema = z.object({ active: z.boolean() }).strict();
export const adminInviteSchema = z
  .object({ email: z.string().trim().email().max(254) })
  .strict();
export const adminIdentifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);
const pageSize = 25;

export function assertAdminStatusChange(input: {
  actorId: string;
  targetId: string;
  role: string;
  active: boolean;
  activeSuperCount: number;
}) {
  if (input.role !== "ADMIN" && input.role !== "SUPER_ADMIN")
    throw new AppError(
      "FORBIDDEN",
      403,
      "This account cannot be managed here.",
    );
  if (!input.active && input.actorId === input.targetId)
    throw new AppError(
      "CONFLICT",
      409,
      "You cannot deactivate your own account.",
    );
  if (
    !input.active &&
    input.role === "SUPER_ADMIN" &&
    input.activeSuperCount <= 1
  )
    throw new AppError(
      "CONFLICT",
      409,
      "The last active super administrator must remain active.",
    );
}
function pageNumber(value: number | undefined) {
  return Number.isSafeInteger(value) && value! > 0 && value! <= 10000
    ? value!
    : 1;
}
export async function getAdminManagement(
  headers: Headers,
  query: { page?: number; invitationPage?: number } = {},
) {
  const actor = await requireAdmin(headers, "admins:manage");
  const db = getDatabase();
  return db.$transaction(
    async (tx) => {
      const [total, invitationTotal] = await Promise.all([
        tx.adminProfile.count(),
        tx.adminInvitation.count(),
      ]);
      const page = Math.min(
        pageNumber(query.page),
        Math.max(1, Math.ceil(total / pageSize)),
      );
      const invitationPage = Math.min(
        pageNumber(query.invitationPage),
        Math.max(1, Math.ceil(invitationTotal / pageSize)),
      );
      const [profiles, invitations] = await Promise.all([
        tx.adminProfile.findMany({
          orderBy: [{ createdAt: "desc" }, { userId: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            userId: true,
            role: true,
            active: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
          },
        }),
        tx.adminInvitation.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (invitationPage - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            email: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            createdAt: true,
            invitedBy: { select: { active: true } },
          },
        }),
      ]);
      const jobs = await tx.emailJob.findMany({
        where: {
          dedupeKey: {
            in: invitations.map((item) => `admin-invitation:${item.id}`),
          },
        },
        select: { dedupeKey: true, state: true },
      });
      const now = new Date();
      return {
        actorId: actor.userId,
        page,
        invitationPage,
        pageSize,
        total,
        invitationTotal,
        accounts: profiles.map((profile) => ({
          id: profile.userId,
          name: profile.user.name,
          email: profile.user.email,
          role: profile.role,
          active: profile.active,
          createdAt: profile.createdAt.toISOString(),
        })),
        invitations: invitations.map((item) => ({
          id: item.id,
          email: item.email,
          expiresAt: item.expiresAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
          status: item.acceptedAt
            ? "Accepted"
            : item.revokedAt || !item.invitedBy.active
              ? "Revoked"
              : item.expiresAt <= now
                ? "Expired"
                : "Pending",
          delivery:
            jobs.find((job) => job.dedupeKey === `admin-invitation:${item.id}`)
              ?.state ?? "NOT_QUEUED",
        })),
      };
    },
    { isolationLevel: "RepeatableRead", timeout: 15000, maxWait: 10000 },
  );
}
export type AdminManagementData = Awaited<
  ReturnType<typeof getAdminManagement>
>;

export async function updateAdminStatus(
  headers: Headers,
  id: string,
  active: boolean,
) {
  const actor = await requireAdmin(headers, "admins:manage");
  if (
    !adminIdentifierSchema.safeParse(id).success ||
    typeof active !== "boolean"
  )
    throw new AppError(
      "INVALID_REQUEST",
      400,
      "Please check the account information.",
    );
  return getDatabase().$transaction(
    async (tx) => {
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
      const target = await tx.adminProfile.findUnique({
        where: { userId: id },
      });
      if (!target)
        throw new AppError(
          "INVALID_REQUEST",
          404,
          "This administrator was not found.",
        );
      if (target.active === active) return { success: true, changed: false };
      const activeSuperCount = await tx.adminProfile.count({
        where: { role: "SUPER_ADMIN", active: true },
      });
      assertAdminStatusChange({
        actorId: actor.userId,
        targetId: id,
        role: target.role,
        active,
        activeSuperCount,
      });
      await tx.adminProfile.update({ where: { userId: id }, data: { active } });
      // Reactivation must not revive a previously issued session.
      await tx.session.deleteMany({ where: { userId: id } });
      if (!active) {
        const pending = await tx.adminInvitation.findMany({
          where: { invitedById: id, acceptedAt: null, revokedAt: null },
          select: { id: true },
        });
        await tx.adminInvitation.updateMany({
          where: { id: { in: pending.map((item) => item.id) } },
          data: { revokedAt: new Date() },
        });
        await tx.emailJob.updateMany({
          where: {
            dedupeKey: {
              in: pending.map((item) => `admin-invitation:${item.id}`),
            },
            state: { in: ["PENDING", "PROCESSING"] },
          },
          data: {
            state: "CANCELLED",
            payloadCiphertext: null,
            leaseToken: null,
            lockedAt: null,
          },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorId: actor.userId,
          targetId: id,
          action: active ? "ADMIN_REACTIVATED" : "ADMIN_DEACTIVATED",
        },
      });
      return { success: true, changed: true };
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
export async function revokeAdminInvitation(headers: Headers, id: string) {
  const actor = await requireAdmin(headers, "admins:manage");
  if (!adminIdentifierSchema.safeParse(id).success)
    throw new AppError("INVALID_REQUEST", 400, "Please check the invitation.");
  return getDatabase().$transaction(
    async (tx) => {
      await lockAdminLifecycle(tx);
      if (
        !(await tx.adminProfile.findFirst({
          where: { userId: actor.userId, active: true, role: "SUPER_ADMIN" },
        }))
      )
        throw new AppError(
          "FORBIDDEN",
          403,
          "Super-administrator access is required.",
        );
      const item = await tx.adminInvitation.findUnique({
        where: { id },
        select: { acceptedAt: true, revokedAt: true },
      });
      if (!item)
        throw new AppError(
          "INVALID_REQUEST",
          404,
          "This invitation was not found.",
        );
      if (item.acceptedAt)
        throw new AppError(
          "CONFLICT",
          409,
          "An accepted invitation cannot be revoked. Manage the administrator account instead.",
        );
      if (item.revokedAt) return { success: true, changed: false };
      await tx.adminInvitation.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      await tx.emailJob.updateMany({
        where: {
          dedupeKey: `admin-invitation:${id}`,
          state: { in: ["PENDING", "PROCESSING"] },
        },
        data: {
          state: "CANCELLED",
          payloadCiphertext: null,
          leaseToken: null,
          lockedAt: null,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: actor.userId,
          targetId: id,
          action: "ADMIN_INVITATION_REVOKED",
        },
      });
      return { success: true, changed: true };
    },
    { timeout: 15000, maxWait: 10000 },
  );
}
