import "server-only";
import { z } from "zod";
import { databaseCaCertificate } from "./database-ca";
import type { PoolConfig } from "pg";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_CA_CERT: z.string().optional(),
  DATABASE_CA_CERT_FILE: z.string().optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  NODE_ENV: z.string().optional(),
});

export function databaseSettings(
  source: Record<string, string | undefined> = process.env,
): PoolConfig {
  const parsed = schema.safeParse(source);
  if (!parsed.success)
    throw new Error("Database environment configuration is invalid");
  const env = parsed.data;
  const url = new URL(env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("Database URL must use PostgreSQL");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const mode = url.searchParams.get("sslmode");
  if (!local && mode && mode !== "verify-full")
    throw new Error("Remote database requires verified TLS");
  // pg lets URL query parameters override explicit Pool settings, including TLS
  // and hostname. Accept the URL authority only; configure all options here.
  url.search = "";
  const ca =
    local && env.NODE_ENV !== "production"
      ? undefined
      : databaseCaCertificate({
          DATABASE_CA_CERT: env.DATABASE_CA_CERT,
          DATABASE_CA_CERT_FILE: env.DATABASE_CA_CERT_FILE,
        });
  return {
    connectionString: url.toString(),
    max: env.DATABASE_POOL_MAX,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    statement_timeout: 15000,
    lock_timeout: 10000,
    idle_in_transaction_session_timeout: 20000,
    ssl:
      local && env.NODE_ENV !== "production"
        ? false
        : {
            rejectUnauthorized: true,
            ...(ca ? { ca } : {}),
          },
  };
}
