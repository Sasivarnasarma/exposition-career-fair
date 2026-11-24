import "./load-env";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { hashPassword } from "better-auth/crypto";
import { getDatabase } from "../src/server/db";
import { hashEmailToken } from "../src/server/email/tokens";
import { rateLimitKey } from "../src/server/security/rate-limit";

let step = "setup";
async function main() {
  if (
    process.env.DATABASE_TEST_MODE !== "dedicated-development" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Dedicated development opt-in required");
  const db = getDatabase(),
    env = { ...process.env };
  const scope = `http-test-${randomUUID()}`,
    users: string[] = [],
    buckets: string[] = [];
  const email = `${scope}@example.org`,
    password = randomBytes(24).toString("hex");
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const address = portProbe.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve) => portProbe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  process.env.RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "development",
        EXPOSITION_QA: "true",
        NEXT_TELEMETRY_DISABLED: "1",
        BETTER_AUTH_URL: origin,
        NEXT_PUBLIC_APP_URL: origin,
        REGISTRATION_EVENT_ID: scope,
        REGISTRATION_DEV_PREVIEW: "true",
        REGISTRATION_RECEIPT_SECRET: randomBytes(32).toString("hex"),
        EMAIL_DELIVERY_ENABLED: "false",
        TRUSTED_CLIENT_IP_HEADER: "",
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
        TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
        TURNSTILE_ALLOWED_HOSTNAMES: "127.0.0.1",
      },
    },
  );
  child.stdout?.resume();
  child.stderr?.resume();
  let launchFailed = false;
  child.on("error", () => {
    launchFailed = true;
  });
  const request = (path: string, options: RequestInit = {}) =>
    fetch(`${origin}${path}`, {
      ...options,
      signal: AbortSignal.timeout(90000),
      redirect: "manual",
    });
  const post = (
    path: string,
    body: unknown,
    cookie?: string,
    extra: Record<string, string> = {},
  ) =>
    request(path, {
      method: "POST",
      headers: {
        origin,
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...extra,
      },
      body: JSON.stringify(body),
    });
  const privateHeaders = (res: Response) => {
    assert.match(res.headers.get("cache-control")!, /no-store/);
    assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  };
  try {
    step = "server-start";
    let ready = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      if (launchFailed || child.exitCode !== null)
        throw new Error("QA server unavailable");
      try {
        const res = await fetch(`${origin}/api/internal/email-jobs`, {
          signal: AbortSignal.timeout(1000),
        });
        if (res.status === 401) {
          ready = true;
          await res.text();
          break;
        }
        await res.body?.cancel();
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    assert.ok(ready);
    step = "public-headers-and-assets";
    const home = await request("/");
    assert.equal(home.status, 200);
    const homeHtml = await home.text();
    assert.ok(homeHtml.includes("Exposition Career Fair"));
    assert.ok(
      home.headers
        .get("content-security-policy")
        ?.includes("https://challenges.cloudflare.com"),
    );
    assert.equal(home.headers.get("x-frame-options"), "DENY");
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
    assert.equal(home.headers.get("x-powered-by"), null);
    for (const path of [
      "/privacy",
      "/admin/login",
      "/verify-email",
      "/admin/reset-password",
    ]) {
      const res = await request(path);
      assert.equal(res.status, 200);
      if (path !== "/privacy") privateHeaders(res);
      await res.text();
    }
    const asset = homeHtml.match(
      /(?:src|href)="([^"<>]*\/_next\/static\/[^"<>]+\.(?:js|css)(?:\?[^"<>]*)?)"/,
    );
    assert.ok(asset);
    const assetRes = await request(asset[1].replaceAll("&amp;", "&"));
    assert.equal(assetRes.status, 200);
    await assetRes.body?.cancel();
    step = "optimized-image";
    const imageUrl = homeHtml.match(/src="([^"<>]*\/_next\/image[^"<>]*)"/);
    assert.ok(imageUrl);
    const imageResponse = await request(imageUrl[1].replaceAll("&amp;", "&"));
    assert.equal(imageResponse.status, 200);
    assert.match(imageResponse.headers.get("content-type")!, /^image\//);
    const optimizedImageKiB = Math.round(
      (await imageResponse.arrayBuffer()).byteLength / 1024,
    );
    step = "fixtures";
    await db.eventEdition.create({
      data: {
        id: scope,
        name: "Disposable HTTP verification",
        year: 2027,
        registrationOpen: true,
        privacyVersion: "integration-test",
      },
    });
    for (const role of ["SUPER_ADMIN", "ADMIN"] as const) {
      const id = randomUUID();
      users.push(id);
      await db.user.create({
        data: {
          id,
          name: "Example Organiser",
          email: `${scope}-${role.toLowerCase()}@example.org`,
          emailVerified: true,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: id,
              providerId: "credential",
              password: await hashPassword(password),
            },
          },
          admin: { create: { role, active: true } },
        },
      });
    }
    const cookieFor = async (role: string) => {
      step = `sign-in-${role.toLowerCase()}`;
      const address = `${scope}-${role.toLowerCase()}@example.org`;
      buckets.push(
        rateLimitKey("admin-login", "global"),
        rateLimitKey("admin-login", `account:${address.toLowerCase()}`),
      );
      const res = await post(
        "/api/auth/sign-in/email",
        { email: address, password },
        undefined,
        { "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX" },
      );
      assert.equal(res.status, 200);
      privateHeaders(res);
      const cookie = res.headers
        .getSetCookie()
        .map((s) => s.split(";", 1)[0])
        .join("; ");
      await res.text();
      return cookie;
    };
    step = "registration-and-verification";
    const input = {
      personal: {
        fullName: "Example Candidate QA",
        email,
        phone: "+94 77 123 4567",
        districtId: "district-colombo",
      },
      academic: {
        institutionName: "Example institution",
        facultyName: "Example faculty",
        degreeName: "Example degree",
        academicYearId: "year-graduate",
        graduationYear: 2026,
      },
      preferences: {
        positionIds: ["software-engineer"],
        firstPreferencePositionId: "software-engineer",
        opportunityIds: ["internship"],
      },
      additional: {
        referralSourceId: "referral-social",
        accurate: true,
        updates: false,
        privacyAgreed: true,
        privacyVersion: "integration-test",
      },
    };
    const idempotencyKey = randomUUID();
    const envelope = {
      data: input,
      idempotencyKey,
      turnstileToken: "XXXX.DUMMY.TOKEN.XXXX",
    };
    for (const key of ["global", `email:${email}`])
      buckets.push(rateLimitKey("registration", `${scope}:${key}`));
    const registration = await post("/api/registrations", envelope);
    assert.equal(registration.status, 201);
    privateHeaders(registration);
    const receipt = await registration.json();
    const receiptCookie = registration.headers
      .getSetCookie()
      .map((s) => s.split(";", 1)[0])
      .join("; ");
    const success = await request("/registration/success", {
      headers: { cookie: receiptCookie },
    });
    assert.ok((await success.text()).includes(receipt.reference));
    const replay = await post("/api/registrations", envelope);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).reference, receipt.reference);
    const blocked = await post(
      "/api/registrations",
      { ...envelope, idempotencyKey: randomUUID() },
      undefined,
      { origin: "https://untrusted.example.org" },
    );
    assert.equal(blocked.status, 403);
    await blocked.text();
    const row = await db.registration.findUniqueOrThrow({
      where: { reference: receipt.reference },
    });
    const token = randomBytes(32).toString("base64url");
    await db.candidateVerification.create({
      data: {
        registrationId: row.id,
        tokenHash: hashEmailToken(token),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    buckets.push(
      rateLimitKey("verification-consume", "global"),
      rateLimitKey("verification-consume", `token:${token}`),
    );
    const verified = await post("/api/verification/consume", { token });
    assert.equal(verified.status, 200);
    assert.equal((await verified.json()).status, "verified");
    step = "role-pages-and-export";
    const superCookie = await cookieFor("SUPER_ADMIN"),
      adminCookie = await cookieFor("ADMIN");
    const timings: Record<string, number> = {};
    const warmTimings: Record<string, number> = {};
    for (const path of [
      `/admin?eventId=${scope}`,
      `/admin/registrations?eventId=${scope}`,
      `/admin/registrations/${row.id}`,
    ]) {
      step = path.includes("?")
        ? "render-overview-or-directory"
        : "render-detail";
      const start = performance.now();
      const response = await request(path, {
        headers: { cookie: adminCookie },
      });
      assert.equal(response.status, 200);
      privateHeaders(response);
      const html = await response.text();
      assert.ok(html.includes("Example Candidate QA"));
      assert.ok(!html.includes(row.requestHash));
      timings[
        path.includes("?") ? path.split("?")[0] : "/admin/registrations/detail"
      ] = Math.round(performance.now() - start);
      const warmStart = performance.now();
      const warm = await request(path, { headers: { cookie: adminCookie } });
      assert.equal(warm.status, 200);
      assert.ok((await warm.text()).includes("Example Candidate QA"));
      warmTimings[
        path.includes("?") ? path.split("?")[0] : "/admin/registrations/detail"
      ] = Math.round(performance.now() - warmStart);
    }
    step = "ordinary-admin-team-denial";
    const denied = await request("/admin/admins", {
      headers: { cookie: adminCookie },
    });
    const deniedHtml = await denied.text();
    assert.ok(deniedHtml.includes("Super-administrator access required"));
    assert.ok(!deniedHtml.includes(`${scope}-super_admin@example.org`));
    step = "super-admin-team-page";
    const team = await request("/admin/admins", {
      headers: { cookie: superCookie },
    });
    assert.ok((await team.text()).includes("The people behind the fair"));
    step = "http-csv-export";
    const exportPath = `/api/admin/registrations/export?eventId=${scope}&scope=filtered`;
    const noSession = await request(exportPath);
    assert.equal(noSession.status, 403);
    privateHeaders(noSession);
    await noSession.text();
    buckets.push(rateLimitKey("admin-export", users[1]));
    const csv = await request(exportPath, { headers: { cookie: adminCookie } });
    assert.equal(csv.status, 200);
    privateHeaders(csv);
    assert.ok((await csv.text()).includes(receipt.reference));
    const unauthorized = await post(
      "/api/admin/invitations",
      { email: `${scope}-invite@example.org` },
      adminCookie,
    );
    assert.equal(unauthorized.status, 403);
    await unauthorized.text();
    buckets.push(rateLimitKey("admin-management", users[0]));
    const deactivate = await request(`/api/admin/accounts/${users[1]}`, {
      method: "PATCH",
      headers: {
        cookie: superCookie,
        origin,
        "Content-Type": "application/json",
      },
      body: '{"active":false}',
    });
    assert.equal(deactivate.status, 200);
    await deactivate.text();
    const revoked = await request(exportPath, {
      headers: { cookie: adminCookie },
    });
    assert.equal(revoked.status, 403);
    await revoked.text();
    assert.equal(
      await db.emailJob.count({
        where: { registrationId: row.id, state: "SENT" },
      }),
      0,
    );
    console.log(
      "HTTP integration verification passed: real route rendering/headers/assets, registration persistence/replay, receipt, verification, both-role page access, export, origin rejection and deactivated-session denial. Delivery disabled.",
    );
    console.log(
      `Optimized initial photo: ${optimizedImageKiB} KiB; warm development route timings (not Web Vitals): ${JSON.stringify(warmTimings)}`,
    );
    console.log(
      `Development first-render timings (include compilation; not Web Vitals): ${JSON.stringify(timings)}`,
    );
  } finally {
    if (child.pid && child.exitCode === null) {
      if (process.platform === "win32") {
        const stop = spawn(
          "taskkill",
          ["/PID", String(child.pid), "/T", "/F"],
          { windowsHide: true, stdio: "ignore" },
        );
        await once(stop, "exit");
      } else {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
    }
    await db.auditEvent.deleteMany({
      where: { OR: [{ actorId: { in: users } }, { targetId: scope }] },
    });
    await db.registration.deleteMany({ where: { eventId: scope } });
    await db.eventEdition.deleteMany({ where: { id: scope } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.rateLimitBucket.deleteMany({ where: { key: { in: buckets } } });
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    `HTTP integration verification failed at ${step}${typeof error?.code === "string" ? ` (${error.code})` : ""}.`,
  );
  process.exitCode = 1;
});
