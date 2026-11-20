import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { authSettings } from "../src/server/config/auth";
import { canAdmin, type AdminPermission } from "../src/shared/admin-policy";
import {
  turnstileSettings,
  verifyTurnstile,
} from "../src/server/security/turnstile";
import { trustedClientIp } from "../src/server/security/rate-limit";

const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env))
    if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});
function configureChallenge() {
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.TURNSTILE_SECRET_KEY = "fixture-secret";
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "fixture-site-key";
  process.env.TURNSTILE_ALLOWED_HOSTNAMES = "careerfair.example.org";
}
test("administrator policy rejects absent, unknown and disabled roles", () => {
  const permissions: AdminPermission[] = [
    "dashboard:read",
    "registrations:read",
    "registrations:export",
    "admins:manage",
  ];
  for (const permission of permissions) {
    assert.equal(canAdmin(null, permission), false);
    assert.equal(
      canAdmin({ active: true, role: "candidate" }, permission),
      false,
    );
    assert.equal(
      canAdmin({ active: false, role: "SUPER_ADMIN" }, permission),
      false,
    );
    assert.equal(
      canAdmin({ active: true, role: "SUPER_ADMIN" }, permission),
      true,
    );
    assert.equal(
      canAdmin({ active: true, role: "ADMIN" }, permission),
      permission !== "admins:manage",
    );
  }
});
test("auth configuration requires secrets, exact origin and production HTTPS", () => {
  const source = {
    BETTER_AUTH_SECRET: "a".repeat(32),
    RATE_LIMIT_SECRET: "b".repeat(32),
    BETTER_AUTH_URL: "http://localhost:3000",
  };
  assert.equal(authSettings(source).origin, "http://localhost:3000");
  assert.throws(() => authSettings({ ...source, BETTER_AUTH_SECRET: "" }));
  assert.throws(() =>
    authSettings({ ...source, BETTER_AUTH_URL: "https://example.org/path" }),
  );
  assert.throws(() => authSettings({ ...source, NODE_ENV: "production" }));
  assert.equal(
    authSettings({
      ...source,
      NODE_ENV: "production",
      BETTER_AUTH_URL: "https://careerfair.example.org",
    }).origin,
    "https://careerfair.example.org",
  );
});
test("Turnstile configuration fails closed and rejects public test keys in production", () => {
  assert.throws(() => turnstileSettings({}));
  const source = {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
    TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
    TURNSTILE_ALLOWED_HOSTNAMES: "localhost",
    NODE_ENV: "development",
  };
  assert.equal(turnstileSettings(source).test, true);
  assert.throws(() => turnstileSettings({ ...source, NODE_ENV: "production" }));
});
test("Turnstile rejects missing/oversized tokens before network access", async (t) => {
  configureChallenge();
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Network should not run");
  });
  await assert.rejects(verifyTurnstile(null, "admin-login"), { status: 403 });
  await assert.rejects(verifyTurnstile("a".repeat(2049), "admin-login"), {
    status: 403,
  });
  assert.equal(fetch.mock.callCount(), 0);
});
test("real-key verification checks success, exact hostname and action", async (t) => {
  configureChallenge();
  let value: unknown = {
    success: true,
    hostname: "careerfair.example.org",
    action: "admin-login",
  };
  t.mock.method(globalThis, "fetch", async () => Response.json(value));
  await verifyTurnstile("fixture-token", "admin-login");
  for (const invalid of [
    { success: false },
    { success: true, hostname: "attacker.example.org", action: "admin-login" },
    {
      success: true,
      hostname: "careerfair.example.org",
      action: "registration",
    },
    { success: true, hostname: "careerfair.example.org" },
    {},
  ]) {
    value = invalid;
    await assert.rejects(verifyTurnstile("fixture-token", "admin-login"), {
      status: 403,
    });
  }
});
test("verification outages, malformed JSON and non-2xx responses fail closed", async (t) => {
  configureChallenge();
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async (): Promise<Response> => {
      throw new Error("Sensitive provider details");
    },
  );
  await assert.rejects(verifyTurnstile("fixture-token", "admin-login"), {
    status: 503,
  });
  mock.mock.mockImplementation(async () => new Response("not JSON"));
  await assert.rejects(verifyTurnstile("fixture-token", "admin-login"), {
    status: 503,
  });
  mock.mock.mockImplementation(
    async () => new Response("unavailable", { status: 503 }),
  );
  await assert.rejects(verifyTurnstile("fixture-token", "admin-login"), {
    status: 503,
  });
});
test("untrusted forwarding headers never supply the client IP", () => {
  delete process.env.TRUSTED_CLIENT_IP_HEADER;
  const headers = new Headers({
    "x-forwarded-for": "192.0.2.1",
    "cf-connecting-ip": "192.0.2.2",
  });
  assert.equal(trustedClientIp(headers), null);
  process.env.TRUSTED_CLIENT_IP_HEADER = "cf-connecting-ip";
  assert.equal(trustedClientIp(headers), "192.0.2.2");
  headers.set("cf-connecting-ip", "192.0.2.2, 192.0.2.3");
  assert.equal(trustedClientIp(headers), null);
});

test("permission guards reject unknown permissions for every role", () => {
  for (const role of ["ADMIN", "SUPER_ADMIN", "toString", "candidate"]) {
    assert.equal(
      canAdmin({ active: true, role }, "unknown:permission" as AdminPermission),
      false,
    );
  }
});
