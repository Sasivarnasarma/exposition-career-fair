import { z } from "zod";
import {
  acceptAdminInvitation,
  invitationAcceptanceSchema,
} from "@/server/admin/invitations";
import { emailAppOrigin } from "@/server/email/config";
import { hashEmailToken } from "@/server/email/tokens";
import { AppError, errorResponse } from "@/server/http/errors";
import { assertTrustedOrigin, readBoundedJson } from "@/server/http/request";
import {
  consumeRateLimit,
  rateLimitKey,
  trustedClientIp,
} from "@/server/security/rate-limit";
import { verifyTurnstile } from "@/server/security/turnstile";

const schema = invitationAcceptanceSchema
  .extend({ turnstileToken: z.string().trim().min(1).max(2048) })
  .strict();
export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request, emailAppOrigin());
    const result = schema.safeParse(await readBoundedJson(request, 8192));
    if (!result.success)
      throw new AppError(
        "INVALID_REQUEST",
        400,
        "Please check the invitation and account information.",
      );
    const ip = trustedClientIp(request.headers);
    const limits: [string, number][] = [
      ["global", 100],
      [`token:${hashEmailToken(result.data.token)}`, 5],
    ];
    if (ip) limits.push([`ip:${ip}`, 15]);
    for (const [identifier, limit] of limits) {
      const value = await consumeRateLimit(
        rateLimitKey("admin-invitation", identifier),
        limit,
        900,
      );
      if (!value.allowed)
        throw new AppError(
          "RATE_LIMITED",
          429,
          "Too many attempts. Please try again later.",
        );
    }
    await verifyTurnstile(result.data.turnstileToken, "admin-invitation", ip);
    await acceptAdminInvitation(
      result.data.token,
      result.data.password,
      result.data.name,
    );
    return Response.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
