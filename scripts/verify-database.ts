import "./load-env";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { getDatabase } from "../src/server/db";
import { persistRegistration } from "../src/server/registrations/persist";
import {
  consumeRateLimit,
  rateLimitKey,
} from "../src/server/security/rate-limit";

async function verify() {
  if (process.env.DATABASE_TEST_MODE !== "dedicated-development")
    throw new Error("Development database opt-in is required");
  const db = getDatabase();
  const eventId = `test-${randomUUID()}`;
  const testEmail = `test-${randomUUID()}@example.org`;
  process.env.RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
  const bucket = rateLimitKey("integration-test", eventId);
  let createdEvent = false;
  try {
    const event = await db.eventEdition.findUniqueOrThrow({
      where: { id: "issue-22-2027" },
    });
    assert.equal(
      event.registrationOpen,
      false,
      "Public event must remain closed",
    );
    assert.equal(
      await db.formOption.count({ where: { kind: "DISTRICT" } }),
      25,
    );
    assert.equal(await db.careerPosition.count(), 29);
    assert.equal(await db.opportunityType.count(), 7);
    await db.eventEdition.create({
      data: {
        id: eventId,
        name: "Disposable integration test",
        year: 2027,
        privacyVersion: "integration-test",
        registrationOpen: true,
      },
    });
    createdEvent = true;
    await db.institution.create({ data: { id: eventId, name: eventId } });
    await db.faculty.create({
      data: { id: eventId, name: "Disposable faculty", institutionId: eventId },
    });
    await db.degreeProgramme.create({
      data: { id: eventId, name: "Disposable programme", facultyId: eventId },
    });
    const payload = {
      personal: {
        fullName: "Example Candidate",
        email: testEmail,
        phone: "+94 77 123 4567",
        districtId: "district-colombo",
      },
      academic: {
        institutionName: "Unlisted institution",
        facultyName: "Example faculty",
        degreeName: "Example degree",
        academicYearId: "year-other",
        graduationYear: 2026,
      },
      preferences: {
        positionIds: ["software-engineer", "data-analyst"],
        firstPreferencePositionId: "software-engineer",
        opportunityIds: ["internship", "full-time"],
      },
      additional: {
        referralSourceId: "referral-social",
        accurate: true,
        updates: false,
        privacyAgreed: true,
        privacyVersion: "integration-test",
      },
    };
    const key = randomUUID();
    const first = await persistRegistration(eventId, payload, key);
    const replay = await persistRegistration(eventId, payload, key);
    assert.equal(first.reference, replay.reference);
    assert.equal(replay.replay, true);
    await assert.rejects(
      persistRegistration(
        eventId,
        {
          ...payload,
          personal: { ...payload.personal, fullName: "Changed Candidate" },
        },
        key,
      ),
      { code: "CONFLICT" },
    );
    await assert.rejects(persistRegistration(eventId, payload, randomUUID()), {
      code: "CONFLICT",
    });
    await assert.rejects(
      persistRegistration(
        eventId,
        {
          ...payload,
          academic: {
            ...payload.academic,
            institutionId: "kelaniya",
            facultyId: eventId,
          },
        },
        randomUUID(),
      ),
      { code: "INVALID_REQUEST" },
    );
    await assert.rejects(
      persistRegistration(
        eventId,
        {
          ...payload,
          academic: {
            ...payload.academic,
            institutionId: "kelaniya",
            facultyId: "kelaniya-science",
            degreeProgrammeId: eventId,
          },
        },
        randomUUID(),
      ),
      { code: "INVALID_REQUEST" },
    );
    const racePayload = {
      ...payload,
      academic: {
        ...payload.academic,
        institutionId: eventId,
        facultyId: eventId,
        degreeProgrammeId: eventId,
      },
      personal: {
        ...payload.personal,
        email: `race-${randomUUID()}@example.org`,
      },
    };
    const raceKey = randomUUID();
    const race = await Promise.all([
      persistRegistration(eventId, racePayload, raceKey),
      persistRegistration(eventId, racePayload, raceKey),
    ]);
    assert.equal(race[0].reference, race[1].reference);
    assert.equal(await db.registration.count({ where: { eventId } }), 2);
    assert.equal(
      await db.registration.count({
        where: { eventId, degreeProgrammeId: eventId },
      }),
      1,
    );
    assert.equal(
      await db.emailJob.count({ where: { registration: { eventId } } }),
      2,
    );
    const limits = await Promise.all(
      Array.from({ length: 8 }, () => consumeRateLimit(bucket, 3, 60)),
    );
    assert.equal(limits.filter((result) => result.allowed).length, 3);
    await db.eventEdition.update({
      where: { id: eventId },
      data: { registrationOpen: false },
    });
    await assert.rejects(
      persistRegistration(
        eventId,
        {
          ...payload,
          personal: {
            ...payload.personal,
            email: `closed-${randomUUID()}@example.org`,
          },
        },
        randomUUID(),
      ),
      { code: "FORBIDDEN" },
    );
    const security = await db.$queryRaw<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity AND tablename <> '_prisma_migrations'`;
    assert.equal(security[0].count, 0);
    const grants = await db.$queryRaw<
      { count: number }[]
    >`SELECT count(*)::int AS count FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated') AND table_name <> '_prisma_migrations'`;
    assert.equal(grants[0].count, 0);
    console.log(
      "Development verification passed: seeds, closed public event, atomic persistence, linked academic catalogs and hierarchy validation, idempotent retries, duplicate/concurrent requests, shared rate limits, RLS and API grants.",
    );
  } finally {
    try {
      // Only dispose records belonging to this invocation's unique test event/key.
      if (createdEvent)
        await db.$transaction(async (tx) => {
          await tx.registration.deleteMany({ where: { eventId } });
          await tx.degreeProgramme.deleteMany({ where: { id: eventId } });
          await tx.faculty.deleteMany({ where: { id: eventId } });
          await tx.institution.deleteMany({ where: { id: eventId } });
          await tx.eventEdition.delete({ where: { id: eventId } });
        });
      await db.rateLimitBucket.deleteMany({ where: { key: bucket } });
    } finally {
      await db.$disconnect();
    }
  }
}
verify().catch((error: unknown) => {
  const code =
    typeof error === "object" &&
    error &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "VERIFICATION_FAILED";
  console.error(
    JSON.stringify({
      verified: false,
      code: /^[A-Z0-9_]{1,50}$/.test(code) ? code : "VERIFICATION_FAILED",
    }),
  );
  process.exitCode = 1;
});
