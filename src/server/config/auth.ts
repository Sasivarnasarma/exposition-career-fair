import "server-only";
import { z } from "zod";

export function authSettings(
  source: Record<string, string | undefined> = process.env,
) {
  const result = z
    .object({
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.string().url(),
      RATE_LIMIT_SECRET: z.string().min(32),
    })
    .safeParse(source);
  if (!result.success)
    throw new Error("Administrator authentication is not configured");
  const url = new URL(result.data.BETTER_AUTH_URL);
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !["http:", "https:"].includes(url.protocol) ||
    (source.NODE_ENV === "production" && url.protocol !== "https:")
  )
    throw new Error("Administrator authentication URL is invalid");
  return { secret: result.data.BETTER_AUTH_SECRET, origin: url.origin };
}
