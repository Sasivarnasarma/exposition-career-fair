import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  emptyDraft,
  draftPayload,
  readDraft,
  registrationEnvelope,
} from "../src/shared/registration-form";
import { registrationDataSchema } from "../src/shared/registration-data";
import {
  createReceipt,
  readReceipt,
  receiptLifetime,
} from "../src/server/registrations/receipt";
import { registrationSettings } from "../src/server/registrations/config";
const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env))
    if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});
function draft() {
  const data = emptyDraft("test-notice");
  Object.assign(data.personal, {
    fullName: "Example Candidate",
    email: " EXAMPLE@example.org ",
    phone: "+94 (77) 123-4567",
    districtId: "district-colombo",
  });
  Object.assign(data.academic, {
    institutionName: "Example institution",
    facultyName: "Example faculty",
    degreeName: "Example programme",
    academicYearId: "year-graduate",
    graduationYear: String(new Date().getUTCFullYear()),
  });
  Object.assign(data.preferences, {
    positionIds: ["software-engineer"],
    firstPreferencePositionId: "software-engineer",
    opportunityIds: ["internship"],
  });
  Object.assign(data.additional, {
    referralSourceId: "referral-social",
    accurate: true,
    privacyAgreed: true,
    updates: false,
  });
  return data;
}
test("form conversion supports optional URLs/GPA, normalizes contact details and optional updates", () => {
  const result = registrationDataSchema.parse(draftPayload(draft()));
  assert.equal(result.personal.email, "example@example.org");
  assert.equal(result.personal.phone, "+94771234567");
  assert.equal(result.academic.gpa, undefined);
  assert.equal(result.additional.updates, false);
  const invalid = draft();
  invalid.academic.graduationYear = "";
  assert.equal(
    registrationDataSchema.safeParse(draftPayload(invalid)).success,
    false,
  );
});
test("graduate years, GPA pairs and first preference have targeted validation errors", () => {
  const data = draft();
  data.academic.graduationYear = String(new Date().getUTCFullYear() + 1);
  const result = registrationDataSchema.safeParse(draftPayload(data));
  assert.equal(result.success, false);
  if (!result.success)
    assert.ok(
      result.error.issues.some(
        (i) => i.path.join(".") === "academic.graduationYear",
      ),
    );
  data.academic.graduationYear = String(new Date().getUTCFullYear());
  data.academic.gpa = "4";
  data.academic.gpaScale = "3";
  assert.equal(
    registrationDataSchema.safeParse(draftPayload(data)).success,
    false,
  );
  data.academic.gpa = "";
  data.academic.gpaScale = "";
  data.preferences.firstPreferencePositionId = "data-analyst";
  assert.equal(
    registrationDataSchema.safeParse(draftPayload(data)).success,
    false,
  );
});
test("draft restore validates shape, age and event and resets mandatory confirmations", () => {
  const saved = {
    version: 1,
    eventId: "event",
    savedAt: 1000,
    step: 2,
    values: draft(),
    attempt: { key: randomUUID(), payload: "{}" },
  };
  const raw = JSON.stringify(saved);
  const restored = readDraft(raw, "event", "updated-notice", 2000)!;
  assert.equal(restored.step, 2);
  assert.equal(restored.values.additional.privacyAgreed, false);
  assert.equal(restored.values.additional.accurate, false);
  assert.equal(restored.values.additional.privacyVersion, "updated-notice");
  assert.equal(readDraft(raw, "other", "notice", 2000), null);
  assert.equal(readDraft(raw, "event", "notice", 1000 + 86400001), null);
  assert.equal(readDraft(raw, "event", "notice", 999), null);
  assert.equal(readDraft("bad JSON", "event", "notice"), null);
  assert.equal(
    readDraft(
      JSON.stringify({ ...saved, turnstileToken: "not-stored" }),
      "event",
      "notice",
      2000,
    ),
    null,
  );
});
test("receipt signatures reject tampering, expiration, cross-event and reference guessing", () => {
  process.env.REGISTRATION_RECEIPT_SECRET = "r".repeat(32);
  const reference = "EXPO-2027-" + "A".repeat(32);
  const token = createReceipt(reference, "event", 100000);
  assert.deepEqual(readReceipt(token, "event", 100001), { reference });
  assert.equal(readReceipt(token, "other", 100001), null);
  assert.equal(
    readReceipt(token, "event", 100000 + receiptLifetime * 1000),
    null,
  );
  assert.equal(readReceipt(token + "!", "event", 100001), null);
  assert.equal(readReceipt(reference, "event", 100001), null);
  const parts = token.split(".");
  const forged =
    Buffer.from(
      JSON.stringify({
        v: 1,
        reference: reference.replace("A", "B"),
        eventId: "event",
        exp: 1000,
      }),
    ).toString("base64url") +
    "." +
    parts[1];
  assert.equal(readReceipt(forged, "event", 100001), null);
  process.env.REGISTRATION_RECEIPT_SECRET = "s".repeat(32);
  assert.equal(readReceipt(token, "event", 100001), null);
});
test("registration envelopes require fresh challenge and idempotency key", () => {
  const input = {
    data: draftPayload(draft()),
    idempotencyKey: randomUUID(),
    turnstileToken: "test-token",
  };
  assert.equal(registrationEnvelope.safeParse(input).success, true);
  assert.equal(
    registrationEnvelope.safeParse({ ...input, turnstileToken: "" }).success,
    false,
  );
  assert.equal(
    registrationEnvelope.safeParse({ ...input, idempotencyKey: "invalid" })
      .success,
    false,
  );
  assert.equal(
    registrationEnvelope.safeParse({ ...input, eventId: "attacker-event" })
      .success,
    false,
  );
});
test("development registration preview cannot enable production registration", () => {
  process.env.NEXT_PUBLIC_APP_URL = "https://careerfair.example.org";
  process.env.REGISTRATION_DEV_PREVIEW = "true";
  Object.assign(process.env, { NODE_ENV: "production" });
  assert.equal(registrationSettings().enabled, false);
  Object.assign(process.env, { NODE_ENV: "development" });
  assert.equal(registrationSettings().enabled, true);
});

test("database outages return a redacted failure without a success receipt", async () => {
  Object.assign(process.env, {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    REGISTRATION_DEV_PREVIEW: "true",
    DATABASE_URL: "postgresql://example:placeholder@localhost/test",
    REGISTRATION_RECEIPT_SECRET: "r".repeat(32),
    RATE_LIMIT_SECRET: "s".repeat(32),
  });
  delete process.env.DATABASE_CA_CERT_FILE;
  const { getDatabase } = await import("../src/server/db");
  const { handleRegistration } =
    await import("../src/server/registrations/handler");
  const db = getDatabase();
  const originalQuery = db.$queryRaw;
  db.$queryRaw = (async () => {
    throw new Error("Sensitive database failure");
  }) as typeof db.$queryRaw;
  try {
    const response = await handleRegistration(
      new Request("http://localhost:3000/api/registrations", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: draftPayload(draft()),
          idempotencyKey: randomUUID(),
          turnstileToken: "fixture-token",
        }),
      }),
    );
    assert.equal(response.status, 503);
    assert.equal(response.headers.has("set-cookie"), false);
    const value = await response.text();
    assert.ok(!value.includes("Sensitive database failure"));
    assert.ok(!value.includes('"reference"'));
  } finally {
    db.$queryRaw = originalQuery;
    await db.$disconnect();
  }
});

test("GPA precision matches database storage without silently rounding", () => {
  const values = draft();
  values.academic.gpa = "3.14";
  values.academic.gpaScale = "4.00";
  assert.equal(
    registrationDataSchema.safeParse(draftPayload(values)).success,
    true,
  );
  values.academic.gpa = "3.141";
  assert.equal(
    registrationDataSchema.safeParse(draftPayload(values)).success,
    false,
  );
  values.academic.gpa = "0";
  values.academic.gpaScale = "0.001";
  assert.equal(
    registrationDataSchema.safeParse(draftPayload(values)).success,
    false,
  );
});
