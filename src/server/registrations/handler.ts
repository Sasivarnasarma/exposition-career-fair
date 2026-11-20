import "server-only";
import { registrationEnvelope } from "../../shared/registration-form";
import { assertTrustedOrigin, readBoundedJson } from "../http/request";
import { AppError, errorResponse } from "../http/errors";
import {
  consumeRateLimit,
  rateLimitKey,
  trustedClientIp,
} from "../security/rate-limit";
import { verifyTurnstile } from "../security/turnstile";
import { persistRegistration } from "./persist";
import { registrationSettings } from "./config";
import {
  createReceipt,
  receiptCookieName,
  receiptLifetime,
  receiptSecret,
} from "./receipt";

export async function handleRegistration(request: Request) {
  try {
    const settings = registrationSettings();
    assertTrustedOrigin(request, settings.origin);
    if (!settings.enabled)
      throw new AppError("FORBIDDEN", 403, "Pre-registration is not open yet.");
    const body = await readBoundedJson(request);
    const parsed = registrationEnvelope.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        fieldErrors[issue.path.join(".").replace(/^data\./, "")] ??=
          issue.message;
      return Response.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Please check the highlighted information.",
            fieldErrors,
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    receiptSecret();
    const { data, idempotencyKey, turnstileToken } = parsed.data;
    const ip = trustedClientIp(request.headers);
    const limits: [string, number][] = [
      ["global", 300],
      [`email:${data.personal.email}`, 8],
    ];
    if (ip) limits.push([`ip:${ip}`, 20]);
    for (const [identifier, limit] of limits) {
      const result = await consumeRateLimit(
        rateLimitKey("registration", `${settings.eventId}:${identifier}`),
        limit,
        900,
      );
      if (!result.allowed)
        throw new AppError(
          "RATE_LIMITED",
          429,
          "Too many attempts. Please wait before trying again.",
        );
    }
    await verifyTurnstile(turnstileToken, "registration", ip);
    const receipt = await persistRegistration(
      settings.eventId,
      data,
      idempotencyKey,
    );
    const token = createReceipt(receipt.reference, settings.eventId);
    return Response.json(
      { reference: receipt.reference, next: "/registration/success" },
      {
        status: receipt.replay ? 200 : 201,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "Set-Cookie": `${receiptCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/registration; Max-Age=${receiptLifetime}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
