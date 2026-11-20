import "./load-env";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getDatabase } from "../src/server/db";
import { getAuth, ADMIN_SESSION_SECONDS } from "../src/server/auth";
import { handleAuth } from "../src/server/auth/handler";
import {
  authenticatedAdmin,
  requireAdmin,
} from "../src/server/auth/permissions";
import { provisionSuperAdmin } from "../src/server/auth/provision";
import { rateLimitKey } from "../src/server/security/rate-limit";
import { verifyTurnstile } from "../src/server/security/turnstile";

let step = "setup";
async function main() {
  if (process.env.DATABASE_TEST_MODE !== "dedicated-development")
    throw new Error("Dedicated development opt-in required");
  if (process.env.NODE_ENV === "production")
    throw new Error("Production verification is not allowed");
  const db = getDatabase();
  const originalFetch = globalThis.fetch;
  const originalRateSecret = process.env.RATE_LIMIT_SECRET;
  process.env.RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
  const prefix = `auth-test-${randomUUID()}`;
  const emails = [0, 1, 2, 3, 4].map((i) => `${prefix}-${i}@example.org`);
  const userIds: string[] = [];
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  const password = randomBytes(24).toString("hex");
  const challenge = "XXXX.DUMMY.TOKEN.XXXX";
  const request = (
    path: string,
    body: unknown,
    token: string | null = challenge,
    cookie?: string,
    extra: Record<string, string> = {},
  ) =>
    new Request(`${origin}/api/auth/${path}`, {
      method: "POST",
      headers: {
        origin,
        "Content-Type": "application/json",
        ...(token ? { "x-captcha-response": token } : {}),
        ...(cookie ? { cookie } : {}),
        ...extra,
      },
      body: JSON.stringify(body),
    });
  const login = (
    email: string,
    token: string | null = challenge,
    customPassword = password,
    extra = {},
  ) =>
    handleAuth(
      request(
        "sign-in/email",
        { email, password: customPassword, role: "SUPER_ADMIN" },
        token,
        undefined,
        extra,
      ),
    );
  function cookies(response: Response) {
    return response.headers
      .getSetCookie()
      .map((value) => value.split(";", 1)[0])
      .join("; ");
  }
  let captchaCalls = 0;
  let providerUnavailable = false;
  try {
    // Verify the public test service once, then use controlled provider responses
    // for adversarial tests; all Better Auth and PostgreSQL operations stay real.
    step = "public-test-service";
    await verifyTurnstile(challenge, "admin-login");
    globalThis.fetch = async (input, init) => {
      if (
        String(input) !==
        "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      )
        return originalFetch(input, init);
      captchaCalls++;
      if (providerUnavailable) throw new Error("Fixture verification outage");
      const body = JSON.parse(String(init?.body));
      return Response.json(
        body.response === challenge
          ? { success: true, hostname: "example.com" }
          : { success: false },
      );
    };
    step = "test-identities";
    const hashed = await hashPassword(password);
    for (let i = 0; i < 3; i++) {
      const id = randomUUID();
      await db.user.create({
        data: {
          id,
          name: "Example Organiser",
          email: emails[i],
          emailVerified: true,
          accounts: {
            create: {
              id: randomUUID(),
              providerId: "credential",
              accountId: id,
              password: hashed,
            },
          },
          ...(i !== 2
            ? { admin: { create: { role: "ADMIN", active: i === 0 } } }
            : {}),
        },
      });
      userIds.push(id);
    }
    if (
      (await db.adminProfile.count({ where: { role: "SUPER_ADMIN" } })) === 0
    ) {
      step = "super-admin-provisioning";
      const input = {
        name: "Example Super Administrator",
        email: emails[4],
        password,
      };
      assert.equal((await provisionSuperAdmin(input)).created, true);
      const provisioned = await db.user.findUniqueOrThrow({
        where: { email: emails[4] },
      });
      userIds.push(provisioned.id);
      assert.equal(
        (
          await provisionSuperAdmin({
            ...input,
            password: password + "changed",
          })
        ).created,
        false,
      );
      const superLogin = await login(emails[4]);
      assert.equal(superLogin.status, 200);
      assert.equal(
        (
          await requireAdmin(
            new Headers({ cookie: cookies(superLogin) }),
            "admins:manage",
          )
        ).role,
        "SUPER_ADMIN",
      );
    }
    step = "signup-denial";
    assert.equal(
      (
        await handleAuth(
          request("sign-up/email", {
            email: emails[3],
            password,
            name: "Example",
          }),
        )
      ).status,
      404,
    );
    await assert.rejects(
      getAuth().api.signUpEmail({
        body: { email: emails[3], password, name: "Example" },
        headers: new Headers({ origin }),
      }),
    );
    assert.equal(await db.user.count({ where: { email: emails[3] } }), 0);
    await assert.rejects(
      getAuth().api.signInEmail({
        body: { email: emails[3], password },
        headers: new Headers({ origin }),
      }),
    );
    step = "signin-challenges";
    assert.equal((await login(emails[0], null)).status, 403);
    assert.equal((await login(emails[0], "invalid-token")).status, 403);
    assert.equal(
      (await login(emails[0], challenge, "wrong-password")).status,
      401,
    );
    step = "valid-login";
    const valid = await login(emails[0]);
    assert.equal(valid.status, 200);
    assert.equal(valid.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await valid.json(), { success: true });
    assert.match(valid.headers.get("set-cookie") || "", /HttpOnly/i);
    const session = await db.session.findFirstOrThrow({
      where: { userId: userIds[0] },
    });
    const lifetime = session.expiresAt.getTime() - session.createdAt.getTime();
    assert.ok(lifetime > (ADMIN_SESSION_SECONDS - 60) * 1000);
    assert.ok(lifetime <= (ADMIN_SESSION_SECONDS + 10) * 1000);
    assert.doesNotMatch(
      valid.headers.get("set-cookie") || "",
      /session_token=[^;]+;[^,]*Max-Age/i,
    );
    step = "permissions";
    const cookie = cookies(valid);
    const sessionResponse = await handleAuth(
      new Request(`${origin}/api/auth/get-session`, { headers: { cookie } }),
    );
    assert.equal(sessionResponse.status, 200);
    assert.equal(sessionResponse.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await sessionResponse.json(), {
      authenticated: true,
      role: "ADMIN",
    });
    assert.equal(
      (await requireAdmin(new Headers({ cookie }), "registrations:export"))
        .role,
      "ADMIN",
    );
    await assert.rejects(
      requireAdmin(new Headers({ cookie }), "admins:manage"),
      { status: 403 },
    );
    assert.equal((await login(emails[1])).status, 401);
    assert.equal((await login(emails[2])).status, 401);
    assert.equal((await login(emails[3])).status, 401);
    providerUnavailable = true;
    const outage = await login(emails[3]);
    providerUnavailable = false;
    assert.equal(outage.status, 503);
    assert.equal(outage.headers.has("set-cookie"), false);
    // Exercise logout with a live session, independently of disabled-account revocation.
    await db.adminProfile.update({
      where: { userId: userIds[1] },
      data: { active: true },
    });
    const logoutLogin = await login(emails[1]);
    assert.equal(logoutLogin.status, 200);
    const logoutCookie = cookies(logoutLogin);
    assert.notEqual(
      await authenticatedAdmin(new Headers({ cookie: logoutCookie })),
      null,
    );
    assert.equal(
      (await handleAuth(request("sign-out", {}, null, logoutCookie))).status,
      200,
    );
    assert.equal(
      await authenticatedAdmin(new Headers({ cookie: logoutCookie })),
      null,
    );
    assert.equal(await db.session.count({ where: { userId: userIds[1] } }), 0);
    await db.adminProfile.update({
      where: { userId: userIds[1] },
      data: { active: false },
    });
    const forgedCookie = cookie
      .split("; ")
      .map((part) =>
        part.includes("session_token=") ? part + "tampered" : part,
      )
      .join("; ");
    assert.equal(
      await authenticatedAdmin(new Headers({ cookie: forgedCookie })),
      null,
    );
    assert.equal(
      (
        await handleAuth(
          request("update-user", { role: "SUPER_ADMIN" }, null, cookie),
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await db.adminProfile.findUniqueOrThrow({
          where: { userId: userIds[0] },
        })
      ).role,
      "ADMIN",
    );
    await assert.rejects(
      provisionSuperAdmin({
        name: "Example Organiser",
        email: emails[0],
        password,
      }),
    );
    step = "origin-and-body";
    const deniedBefore = captchaCalls;
    assert.equal(
      (
        await login(emails[0], challenge, password, {
          origin: "https://attacker.example.org",
        })
      ).status,
      403,
    );
    assert.equal(captchaCalls, deniedBefore);
    const tooBig = await handleAuth(
      request("sign-in/email", {
        email: emails[0],
        password: "a".repeat(9000),
      }),
    );
    assert.equal(tooBig.status, 413);
    step = "disabled-session-and-logout";
    // Revoke authorization immediately even while an old signed cookie exists.
    await db.adminProfile.update({
      where: { userId: userIds[0] },
      data: { active: false },
    });
    assert.equal(await authenticatedAdmin(new Headers({ cookie })), null);
    assert.equal(
      (
        await handleAuth(
          new Request(`${origin}/api/auth/get-session`, {
            headers: { cookie },
          }),
        )
      ).status,
      403,
    );
    await db.adminProfile.update({
      where: { userId: userIds[0] },
      data: { active: true },
    });
    assert.equal(await authenticatedAdmin(new Headers({ cookie })), null);
    assert.equal(
      (await handleAuth(request("sign-out", {}, null, cookie))).status,
      200,
    );
    assert.equal(await authenticatedAdmin(new Headers({ cookie })), null);
    assert.equal(await authenticatedAdmin(new Headers()), null);
    // The sixth attempt is throttled before CAPTCHA, including direct requests.
    step = "throttling";
    const beforeLimit = captchaCalls;
    const lastSession = await login(emails[0]);
    assert.equal(lastSession.status, 200);
    const lastCookie = cookies(lastSession);
    await db.session.updateMany({
      where: { userId: userIds[0] },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(
      await authenticatedAdmin(new Headers({ cookie: lastCookie })),
      null,
    );
    assert.equal((await login(emails[0], challenge)).status, 429);
    assert.equal(captchaCalls, beforeLimit + 1);
    step = "recovery";
    const recoveryKnown = await handleAuth(
      request("request-password-reset", { email: emails[1] }),
    );
    const recoveryUnknown = await handleAuth(
      request("request-password-reset", { email: emails[3] }),
    );
    assert.equal(recoveryKnown.status, recoveryUnknown.status);
    assert.deepEqual(await recoveryKnown.json(), await recoveryUnknown.json());
    assert.equal(
      (
        await handleAuth(
          request("reset-password", {
            token: "invalid",
            newPassword: password,
          }),
        )
      ).status,
      400,
    );
    step = "password-reset-lifecycle";
    const resetToken = randomBytes(24).toString("hex");
    const context = await getAuth().$context;
    await context.internalAdapter.createVerificationValue({
      identifier: `reset-password:${resetToken}`,
      value: userIds[0],
      expiresAt: new Date(Date.now() + 60000),
    });
    const newPassword = randomBytes(24).toString("hex");
    assert.equal(
      (
        await handleAuth(
          request("reset-password", { token: resetToken, newPassword }),
        )
      ).status,
      200,
    );
    const credential = await db.account.findFirstOrThrow({
      where: { userId: userIds[0], providerId: "credential" },
    });
    assert.equal(
      await verifyPassword({
        hash: credential.password!,
        password: newPassword,
      }),
      true,
    );
    assert.equal(await db.session.count({ where: { userId: userIds[0] } }), 0);
    assert.equal(
      (
        await handleAuth(
          request("reset-password", { token: resetToken, newPassword }),
        )
      ).status,
      400,
    );
    const expiredToken = randomBytes(24).toString("hex");
    await context.internalAdapter.createVerificationValue({
      identifier: `reset-password:${expiredToken}`,
      value: userIds[0],
      expiresAt: new Date(Date.now() - 1000),
    });
    assert.equal(
      (
        await handleAuth(
          request("reset-password", { token: expiredToken, newPassword }),
        )
      ).status,
      400,
    );
    console.log(
      "Auth verification passed: real test-key verification, signup denial, endpoint challenges, credentials, active roles, permissions, provisioning, cookies, eight-hour session lifetime, minimal session responses, forged-cookie rejection, provider outages, active-session logout, session expiration/revocation, one-time password resets, origin/body checks, account throttling and generic recovery responses.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    try {
      await db.auditEvent.deleteMany({ where: { actorId: { in: userIds } } });
      await db.verification.deleteMany({ where: { value: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      const keys = ["admin-login", "admin-reset"].flatMap((scope) => [
        rateLimitKey(scope, "global"),
        ...emails.map((email) => rateLimitKey(scope, `account:${email}`)),
      ]);
      await db.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
    } finally {
      if (originalRateSecret === undefined)
        delete process.env.RATE_LIMIT_SECRET;
      else process.env.RATE_LIMIT_SECRET = originalRateSecret;
      await db.$disconnect();
    }
  }
}
main().catch((error: unknown) => {
  const detail =
    error instanceof assert.AssertionError
      ? {
          actual: typeof error.actual === "number" ? error.actual : undefined,
          expected:
            typeof error.expected === "number" ? error.expected : undefined,
        }
      : {};
  console.error(JSON.stringify({ verified: false, step, ...detail }));
  process.exitCode = 1;
});
