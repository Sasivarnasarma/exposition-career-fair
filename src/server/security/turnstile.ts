import "server-only";
import { z } from "zod";
import { AppError } from "../http/errors";

export type ChallengeAction =
  | "admin-login"
  | "admin-reset"
  | "registration"
  | "candidate-resend"
  | "admin-invitation";
export const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET = "1x0000000000000000000000000000000AA";

export function turnstileSettings(
  source: Record<string, string | undefined> = process.env,
) {
  const secret = source.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = source.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const hostnames = (source.TURNSTILE_ALLOWED_HOSTNAMES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const test = secret === TEST_SECRET && siteKey === TEST_SITE_KEY;
  if (
    !secret ||
    !siteKey ||
    !hostnames.length ||
    (source.NODE_ENV === "production" &&
      (/^[123]x0+/.test(secret) || /^[123]x0+/.test(siteKey)))
  )
    throw new AppError(
      "UNAVAILABLE",
      503,
      "Security verification is unavailable. Please try again later.",
    );
  return { secret, hostnames, test };
}

export async function verifyTurnstile(
  token: unknown,
  action: ChallengeAction,
  remoteIp?: string | null,
) {
  const settings = turnstileSettings();
  if (typeof token !== "string" || !token.trim() || token.length > 2048)
    throw new AppError(
      "FORBIDDEN",
      403,
      "Please complete the security check again.",
    );
  let response: Response;
  try {
    response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: settings.secret,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      },
    );
  } catch {
    throw new AppError(
      "UNAVAILABLE",
      503,
      "Security verification is unavailable. Please try again.",
    );
  }
  if (!response.ok)
    throw new AppError(
      "UNAVAILABLE",
      503,
      "Security verification is unavailable. Please try again.",
    );
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new AppError(
      "UNAVAILABLE",
      503,
      "Security verification is unavailable. Please try again.",
    );
  }
  const parsed = z
    .object({
      success: z.boolean(),
      hostname: z.string().optional(),
      action: z.string().optional(),
    })
    .safeParse(value);
  if (
    !parsed.success ||
    !parsed.data.success ||
    (settings.test
      ? token !== "XXXX.DUMMY.TOKEN.XXXX" ||
        parsed.data.hostname !== "example.com"
      : !parsed.data.hostname ||
        !settings.hostnames.includes(parsed.data.hostname.toLowerCase()) ||
        parsed.data.action !== action)
  )
    throw new AppError(
      "FORBIDDEN",
      403,
      "The security check expired or failed. Please complete it again.",
    );
}
