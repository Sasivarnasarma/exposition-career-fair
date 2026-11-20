import "server-only";
import { z } from "zod";
import { assertTrustedOrigin, readBoundedJson } from "../http/request";
import { AppError, errorResponse } from "../http/errors";
import {
  consumeRateLimit,
  rateLimitKey,
  trustedClientIp,
} from "../security/rate-limit";
import { verifyTurnstile } from "../security/turnstile";
import { emailAppOrigin } from "./config";
import { consumeCandidateToken, queueCandidateResend } from "./verification";
import { verificationEmailSchema } from "../../shared/verification-contract";
async function limit(scope: string, identifier: string, count: number) {
  if (
    !(await consumeRateLimit(rateLimitKey(scope, identifier), count, 900))
      .allowed
  )
    throw new AppError(
      "RATE_LIMITED",
      429,
      "Too many attempts. Please try again later.",
    );
}
export async function handleVerification(
  request: Request,
  mode: "consume" | "resend",
) {
  try {
    assertTrustedOrigin(request, emailAppOrigin());
    const raw = await readBoundedJson(request, 4096);
    const ip = trustedClientIp(request.headers);
    await limit(`verification-${mode}`, "global", 300);
    if (ip) await limit(`verification-${mode}`, `ip:${ip}`, 30);
    if (mode === "consume") {
      const input = z
        .object({ token: z.string().max(256) })
        .strict()
        .safeParse(raw);
      if (!input.success)
        throw new AppError(
          "INVALID_REQUEST",
          400,
          "This verification link is invalid or expired.",
        );
      await limit("verification-consume", `token:${input.data.token}`, 15);
      return Response.json(await consumeCandidateToken(input.data.token), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const input = z
      .object({
        email: verificationEmailSchema,
        turnstileToken: z.string().min(1).max(2048),
      })
      .strict()
      .safeParse(raw);
    if (!input.success)
      throw new AppError(
        "INVALID_REQUEST",
        400,
        "Enter a valid email address and complete the security check.",
      );
    await limit("verification-resend", `email:${input.data.email}`, 3);
    await verifyTurnstile(input.data.turnstileToken, "candidate-resend", ip);
    await queueCandidateResend(input.data.email);
    return Response.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
