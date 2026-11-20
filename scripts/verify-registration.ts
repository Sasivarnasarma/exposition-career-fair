import "./load-env";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { getDatabase } from "../src/server/db";
import { handleRegistration } from "../src/server/registrations/handler";
import {
  readReceipt,
  receiptCookieName,
} from "../src/server/registrations/receipt";
import { rateLimitKey } from "../src/server/security/rate-limit";
import { verifyTurnstile } from "../src/server/security/turnstile";
let step = "setup";
async function main() {
  if (
    process.env.DATABASE_TEST_MODE !== "dedicated-development" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Dedicated development opt-in required");
  const db = getDatabase();
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;
  const eventId = `registration-test-${randomUUID()}`;
  const emails = [0, 1, 2, 3].map((i) => `${eventId}-${i}@example.org`);
  process.env.REGISTRATION_EVENT_ID = eventId;
  process.env.REGISTRATION_DEV_PREVIEW = "true";
  process.env.RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
  process.env.REGISTRATION_RECEIPT_SECRET = randomBytes(32).toString("hex");
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
  const token = "XXXX.DUMMY.TOKEN.XXXX";
  let created = false;
  let calls = 0;
  let unavailable = false;
  const data = {
    personal: {
      fullName: "Example Candidate",
      email: emails[0],
      phone: "+94 77 123 4567",
      districtId: "district-colombo",
    },
    academic: {
      institutionName: "Unlisted institution",
      facultyName: "Example faculty",
      degreeName: "Example degree",
      academicYearId: "year-graduate",
      graduationYear: new Date().getUTCFullYear(),
    },
    preferences: {
      positionIds: ["software-engineer", "data-analyst"],
      firstPreferencePositionId: "software-engineer",
      opportunityIds: ["internship"],
    },
    additional: {
      referralSourceId: "referral-other",
      referralOther: "Example source",
      accurate: true,
      updates: false,
      privacyAgreed: true,
      privacyVersion: "integration-test",
    },
  };
  const send = (
    payload: unknown,
    key = randomUUID(),
    challenge = token,
    requestOrigin = origin,
  ) =>
    handleRegistration(
      new Request(`${origin}/api/registrations`, {
        method: "POST",
        headers: { origin: requestOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({
          data: payload,
          idempotencyKey: key,
          turnstileToken: challenge,
        }),
      }),
    );
  try {
    step = "provider";
    await verifyTurnstile(token, "registration");
    globalThis.fetch = async (input, init) => {
      if (
        String(input) !==
        "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      )
        return originalFetch(input, init);
      calls++;
      if (unavailable) throw new Error("Fixture provider outage");
      return Response.json(
        JSON.parse(String(init?.body)).response === token
          ? { success: true, hostname: "example.com" }
          : { success: false },
      );
    };
    await db.eventEdition.create({
      data: {
        id: eventId,
        name: "Disposable registration verification",
        year: 2027,
        registrationOpen: true,
        privacyVersion: "integration-test",
      },
    });
    created = true;
    step = "request-boundaries";
    assert.equal(
      (await send(data, randomUUID(), token, "https://attacker.example.org"))
        .status,
      403,
    );
    assert.equal(
      (
        await send({
          ...data,
          personal: { ...data.personal, email: "invalid" },
        })
      ).status,
      400,
    );
    assert.equal((await send(data, randomUUID(), "")).status, 400);
    assert.equal((await send(data, randomUUID(), "invalid")).status, 403);
    unavailable = true;
    const outage = await send(data);
    unavailable = false;
    assert.equal(outage.status, 503);
    assert.equal(outage.headers.has("set-cookie"), false);
    assert.equal(await db.registration.count({ where: { eventId } }), 0);
    assert.equal(
      await db.emailJob.count({ where: { registration: { eventId } } }),
      0,
    );
    step = "persist-and-replay";
    const key = randomUUID();
    const accepted = await send(data, key);
    assert.equal(accepted.status, 201);
    assert.equal(accepted.headers.get("Cache-Control"), "no-store");
    const body = await accepted.json();
    assert.equal(body.next, "/registration/success");
    const cookie = accepted.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Path=\/registration/);
    const receipt = cookie.split(";", 1)[0].slice(receiptCookieName.length + 1);
    assert.deepEqual(readReceipt(receipt, eventId), {
      reference: body.reference,
    });
    assert.equal(readReceipt(receipt, "another-event"), null);
    const replay = await send(data, key);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).reference, body.reference);
    const conflict = await send(
      {
        ...data,
        personal: { ...data.personal, fullName: "Changed candidate" },
      },
      key,
    );
    assert.equal(conflict.status, 409);
    const duplicate = await send(data);
    assert.equal(duplicate.status, 409);
    assert.ok(!(await duplicate.text()).includes(body.reference));
    const saved = await db.registration.findUniqueOrThrow({
      where: { reference: body.reference },
      include: {
        consent: true,
        positions: true,
        opportunities: true,
        emailJobs: true,
      },
    });
    assert.equal(saved.phone, "+94771234567");
    assert.equal(saved.consent?.updates, false);
    assert.equal(saved.positions.length, 2);
    assert.equal(saved.emailJobs.length, 1);
    step = "concurrency";
    const race = { ...data, personal: { ...data.personal, email: emails[1] } };
    const raceKey = randomUUID();
    const results = await Promise.all([
      send(race, raceKey),
      send(race, raceKey),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
    assert.equal(
      (await results[0].json()).reference,
      (await results[1].json()).reference,
    );
    assert.equal(await db.registration.count({ where: { eventId } }), 2);
    assert.equal(
      await db.emailJob.count({ where: { registration: { eventId } } }),
      2,
    );
    step = "throttle";
    const limited = {
      ...data,
      personal: { ...data.personal, email: emails[2] },
    };
    for (let i = 0; i < 8; i++)
      assert.equal((await send(limited, randomUUID(), "invalid")).status, 403);
    const before = calls;
    assert.equal((await send(limited)).status, 429);
    assert.equal(calls, before);
    step = "availability-and-notice";
    await db.eventEdition.update({
      where: { id: eventId },
      data: { registrationOpen: false },
    });
    const fresh = { ...data, personal: { ...data.personal, email: emails[3] } };
    assert.equal((await send(fresh)).status, 403);
    await db.eventEdition.update({
      where: { id: eventId },
      data: { registrationOpen: true, privacyVersion: "changed-notice" },
    });
    assert.equal((await send(fresh)).status, 409);
    assert.equal(await db.registration.count({ where: { eventId } }), 2);
    process.env.REGISTRATION_DEV_PREVIEW = "false";
    assert.equal((await send(fresh)).status, 403);
    assert.equal(
      (
        await db.eventEdition.findUniqueOrThrow({
          where: { id: "issue-22-2027" },
        })
      ).registrationOpen,
      false,
    );
    console.log(
      "Registration verification passed: real public test-key verification, invalid/outage rejection without records, atomic queue/consent, receipts, replay/conflicts, duplicate/concurrent requests, throttling, closed event and notice changes.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    try {
      if (created)
        await db.$transaction(async (tx) => {
          await tx.registration.deleteMany({ where: { eventId } });
          await tx.eventEdition.delete({ where: { id: eventId } });
        });
      const keys = ["global", ...emails.map((email) => `email:${email}`)].map(
        (identifier) =>
          rateLimitKey("registration", `${eventId}:${identifier}`),
      );
      await db.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
    } finally {
      for (const key of Object.keys(process.env))
        if (!(key in env)) delete process.env[key];
      Object.assign(process.env, env);
      await db.$disconnect();
    }
  }
}
main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      verified: false,
      step,
      ...(error instanceof assert.AssertionError &&
      typeof error.actual === "number"
        ? { actual: error.actual, expected: error.expected }
        : {}),
    }),
  );
  process.exitCode = 1;
});
