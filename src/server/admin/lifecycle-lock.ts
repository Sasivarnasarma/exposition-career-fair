import "server-only";
import type { Prisma } from "../../generated/prisma/client";

export async function lockAdminLifecycle(tx: Prisma.TransactionClient) {
  // Poolers may ignore startup parameters; bound waits on this transaction too.
  await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
  await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '20s'`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(48119423)`;
}
