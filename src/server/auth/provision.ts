import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { getDatabase } from "../db";
import { normalizeEmail } from "../../shared/normalization";

const schema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254).transform(normalizeEmail),
    password: z.string().min(12).max(128),
  })
  .strict();
export async function provisionSuperAdmin(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      "Provide a valid name, email and password of 12-128 characters",
    );
  const { name, email, password } = parsed.data;
  const db = getDatabase();
  const hashed = await hashPassword(password);
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(48119422)`;
      const existing = await tx.user.findUnique({
        where: { email },
        include: { admin: true, accounts: true },
      });
      if (existing) {
        if (
          existing.admin?.role !== "SUPER_ADMIN" ||
          !existing.admin.active ||
          !existing.accounts.some(
            (a) =>
              a.providerId === "credential" &&
              a.accountId === existing.id &&
              a.password,
          )
        )
          throw new Error(
            "Existing identity cannot be provisioned by this command",
          );
        return { created: false };
      }
      if (await tx.adminProfile.count({ where: { role: "SUPER_ADMIN" } }))
        throw new Error(
          "A super administrator already exists; use the administrator management process",
        );
      const id = randomUUID();
      await tx.user.create({
        data: {
          id,
          name,
          email,
          emailVerified: true,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: id,
              providerId: "credential",
              password: hashed,
            },
          },
          admin: { create: { role: "SUPER_ADMIN", active: true } },
        },
      });
      await tx.auditEvent.create({
        data: { actorId: id, action: "SUPER_ADMIN_PROVISIONED", targetId: id },
      });
      return { created: true };
    },
    { timeout: 15000 },
  );
}
