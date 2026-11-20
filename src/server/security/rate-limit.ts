import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { getDatabase } from "../db";

// Only enable after the deployment proxy strips/replaces this exact header.
export function trustedClientIp(headers: Headers): string | null {
  const header = process.env.TRUSTED_CLIENT_IP_HEADER;
  if (!header) return null;
  const candidate = headers.get(header)?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

export function rateLimitKey(scope: string, identifier: string): string {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Rate limit secret is not configured");
  return createHmac("sha256", secret)
    .update(`${scope}:${identifier}`)
    .digest("hex");
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1 ||
    windowSeconds > 86400
  )
    throw new Error("Invalid rate limit policy");
  const rows = await getDatabase().$queryRaw<
    { count: number; resetsAt: Date }[]
  >`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetsAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${windowSeconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."resetsAt" <= CURRENT_TIMESTAMP THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "resetsAt" = CASE WHEN "RateLimitBucket"."resetsAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + ${windowSeconds} * INTERVAL '1 second' ELSE "RateLimitBucket"."resetsAt" END
    RETURNING "count", "resetsAt"`;
  return { allowed: rows[0].count <= limit, resetsAt: rows[0].resetsAt };
}
