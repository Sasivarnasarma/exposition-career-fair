import assert from "node:assert/strict";
import { test } from "node:test";
import { securityHeaders } from "../src/config/security-headers";
import config from "../next.config";
const policy = (production: boolean) =>
  new Map(securityHeaders(production).map((h) => [h.key, h.value]));
test("production security policy permits Turnstile and blocks objects, framing and inline event handlers", () => {
  const headers = policy(true),
    csp = headers.get("Content-Security-Policy")!;
  assert.match(csp, /script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com/);
  for (const directive of [
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src-attr 'none'",
  ])
    assert.ok(csp.includes(directive));
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(!csp.includes("ws:"));
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("Strict-Transport-Security"), "max-age=31536000");
});
test("development policy permits live reload without forcing HTTPS or production eval permission", () => {
  const headers = policy(false),
    csp = headers.get("Content-Security-Policy")!;
  assert.ok(csp.includes("ws: wss:"));
  assert.ok(csp.includes("'unsafe-eval'"));
  assert.ok(!csp.includes("upgrade-insecure-requests"));
  assert.ok(!headers.has("Strict-Transport-Security"));
});
test("private routes and all API responses receive explicit privacy headers", async () => {
  const routes = await config.headers!();
  for (const source of [
    "/api/:path*",
    "/:section(admin|register|registration|verify-email)/:path*",
  ]) {
    const route = routes.find((r) => r.source === source);
    assert.ok(route);
    const headers = new Map(route.headers.map((h) => [h.key, h.value]));
    assert.equal(headers.get("Cache-Control"), "private, no-store");
    assert.equal(headers.get("Referrer-Policy"), "no-referrer");
    assert.equal(headers.get("X-Robots-Tag"), "noindex, nofollow");
  }
  assert.equal(config.poweredByHeader, false);
});

// Exercise the pinned Next dev origin guard: rejected HMR can prevent hydration.
test("development HMR accepts numeric loopback and still rejects foreign origins", async (t) => {
  const { IncomingMessage, ServerResponse } = await import("node:http");
  const { Socket } = await import("node:net");
  const { blockCrossSiteDEV } =
    await import("next/dist/server/lib/router-utils/block-cross-site-dev");
  t.mock.method(console, "warn", () => {});
  for (const [origin, blocked] of [
    ["http://127.0.0.1:3000", false],
    ["http://localhost:3000", false],
    ["https://untrusted.example.org", true],
    ["https://127.0.0.1.example.org", true],
    ["null", true],
  ] as const) {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.url = "/_next/hmr?id=test-request";
    req.headers.origin = origin;
    const res = new ServerResponse(req);
    assert.equal(
      blockCrossSiteDEV(req, res, config.allowedDevOrigins, "0.0.0.0"),
      blocked,
      origin,
    );
    if (blocked) assert.equal(res.statusCode, 403);
    res.destroy();
    socket.destroy();
  }
});
