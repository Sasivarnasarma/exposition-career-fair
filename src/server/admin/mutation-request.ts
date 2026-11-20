import "server-only";
import { requireAdmin } from "../auth/permissions";
import { authSettings } from "../config/auth";
import { AppError } from "../http/errors";
import { assertTrustedOrigin } from "../http/request";
import { consumeRateLimit, rateLimitKey } from "../security/rate-limit";

export async function authorizeAdminMutation(request: Request) {
  assertTrustedOrigin(request, authSettings().origin);
  const actor = await requireAdmin(request.headers, "admins:manage");
  const limit = await consumeRateLimit(
    rateLimitKey("admin-management", actor.userId),
    30,
    900,
  );
  if (!limit.allowed)
    throw new AppError(
      "RATE_LIMITED",
      429,
      "Too many account changes. Please try again later.",
    );
}
