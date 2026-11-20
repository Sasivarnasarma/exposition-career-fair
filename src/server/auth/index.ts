import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { getDatabase } from "../db";
import { authSettings } from "../config/auth";
import { AppError } from "../http/errors";
import {
  consumeRateLimit,
  rateLimitKey,
  trustedClientIp,
} from "../security/rate-limit";
import { verifyTurnstile } from "../security/turnstile";
import { encryptEmailPayload } from "../email/crypto";
import { queueEmail } from "../email/queue";
import { emailAppOrigin, emailSender } from "../email/config";
import { hashEmailToken } from "../email/tokens";
import { normalizeEmail } from "../../shared/normalization";

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

const paths = new Set([
  "/sign-in/email",
  "/sign-out",
  "/get-session",
  "/request-password-reset",
  "/reset-password",
]);

function createAdminAuth() {
  const settings = authSettings();
  const db = getDatabase();
  return betterAuth({
    appName: "Exposition Organisers",
    baseURL: settings.origin,
    basePath: "/api/auth",
    secret: settings.secret,
    trustedOrigins: [settings.origin],
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 3600,
      sendResetPassword: async ({ user, token }) => {
        const profile = await db.adminProfile.findUnique({
          where: { userId: user.id },
        });
        if (!profile?.active) return;
        const action = new URL("/admin/reset-password", emailAppOrigin());
        action.hash = `token=${token}`;
        await db.$transaction(async (tx) => {
          await queueEmail(tx, {
            kind: "ADMIN_PASSWORD_RESET",
            to: user.email,
            recipientName: user.name,
            actionUrl: action.toString(),
            dedupeKey: `admin-password-reset:${hashEmailToken(token)}`,
            expiresAt: new Date(Date.now() + 3600000),
          });
        });
      },
    },
    session: {
      expiresIn: ADMIN_SESSION_SECONDS,
      updateAge: 60 * 30,
      cookieCache: { enabled: false },
    },
    verification: { storeIdentifier: "hashed" },
    advanced: {
      cookiePrefix: "exposition-admin",
      useSecureCookies: process.env.NODE_ENV === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { disableIpTracking: true, ipAddressHeaders: [] },
    },
    // Atomic shared account/IP/global limits below replace process-local limits.
    rateLimit: { enabled: false },
    logger: { disabled: true },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!paths.has(ctx.path))
          throw new APIError("NOT_FOUND", {
            message: "This endpoint is unavailable.",
          });
        if (ctx.path === "/get-session") return;
        const headers = ctx.headers ?? ctx.request?.headers ?? new Headers();
        if (headers.get("origin") !== settings.origin)
          throw new APIError("FORBIDDEN", {
            message: "This request is not allowed.",
          });
        if (ctx.path === "/sign-out") return;
        // Check queue configuration equally for known and unknown reset addresses.
        if (ctx.path === "/request-password-reset") {
          emailSender();
          encryptEmailPayload({});
        }
        const email = normalizeEmail(
          typeof ctx.body?.email === "string" ? ctx.body.email : "",
        );
        if (ctx.body?.email) ctx.body.email = email;
        if (ctx.path === "/sign-in/email") ctx.body.rememberMe = false;
        const scope =
          ctx.path === "/sign-in/email" ? "admin-login" : "admin-reset";
        const ip = trustedClientIp(headers);
        try {
          const buckets: [string, number][] = [["global", 100]];
          if (email) buckets.push([`account:${email}`, 5]);
          if (ip) buckets.push([`ip:${ip}`, 20]);
          for (const [identifier, limit] of buckets) {
            const result = await consumeRateLimit(
              rateLimitKey(scope, identifier),
              limit,
              900,
            );
            if (!result.allowed)
              throw new AppError(
                "RATE_LIMITED",
                429,
                "Too many attempts. Please try again later.",
              );
          }
          await verifyTurnstile(headers.get("x-captcha-response"), scope, ip);
        } catch (error) {
          if (error instanceof AppError)
            throw new APIError(
              error.status === 429
                ? "TOO_MANY_REQUESTS"
                : error.status === 403
                  ? "FORBIDDEN"
                  : "SERVICE_UNAVAILABLE",
              { message: error.message },
            );
          throw new APIError("SERVICE_UNAVAILABLE", {
            message: "Sign-in is temporarily unavailable. Please try again.",
          });
        }
      }),
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const profile = await db.adminProfile.findUnique({
              where: { userId: session.userId },
            });
            if (
              !profile?.active ||
              !["ADMIN", "SUPER_ADMIN"].includes(profile.role)
            )
              throw new APIError("UNAUTHORIZED", {
                message:
                  "Unable to sign in. Check your details or contact the organising committee.",
              });
            // Better Auth gives rememberMe:false sessions a fixed 24h default.
            // Explicitly cap these organiser sessions at the intended eight hours.
            return {
              data: {
                ...session,
                expiresAt: new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000),
              },
            };
          },
        },
      },
    },
  });
}
let instance: ReturnType<typeof createAdminAuth> | undefined;
export const getAuth = () => (instance ??= createAdminAuth());
