import { Client } from "pg";
import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseSettings } from "../src/server/config/database";
import { registrationDataSchema } from "../src/shared/registration-data";
import {
  formOptions,
  careerCategories,
  opportunityTypes,
} from "../src/shared/form-options";
import {
  readBoundedJson,
  assertTrustedOrigin,
} from "../src/server/http/request";
import { errorResponse } from "../src/server/http/errors";

const valid = {
  personal: {
    fullName: "Example Candidate",
    email: " Example@Example.org ",
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
    positionIds: ["software-engineer"],
    firstPreferencePositionId: "software-engineer",
    opportunityIds: ["internship"],
  },
  additional: {
    referralSourceId: "referral-social",
    accurate: true,
    updates: false,
    privacyAgreed: true,
    privacyVersion: "v1",
  },
};

test("remote database configuration enforces verified TLS", () => {
  const settings = databaseSettings({
    DATABASE_URL:
      "postgresql://example:placeholder@db.example.org:5432/database",
  });
  assert.equal(
    typeof settings.ssl === "object" && settings.ssl.rejectUnauthorized,
    true,
  );
  assert.equal(settings.max, 5);
  assert.throws(() =>
    databaseSettings({
      DATABASE_URL:
        "postgresql://example:placeholder@db.example.org/database?sslmode=disable",
    }),
  );
  assert.throws(
    () => databaseSettings({ DATABASE_URL: "not-a-url" }),
    (error) => !String(error).includes("not-a-url"),
  );
});

test("registration validates first preference, Other, GPA and required consent", () => {
  assert.equal(
    registrationDataSchema.parse(valid).personal.email,
    "example@example.org",
  );
  assert.equal(
    registrationDataSchema.safeParse({
      ...valid,
      preferences: {
        ...valid.preferences,
        firstPreferencePositionId: "data-analyst",
      },
    }).success,
    false,
  );
  assert.equal(
    registrationDataSchema.safeParse({
      ...valid,
      preferences: {
        ...valid.preferences,
        positionIds: ["other"],
        firstPreferencePositionId: "other",
      },
    }).success,
    false,
  );
  assert.equal(
    registrationDataSchema.safeParse({
      ...valid,
      academic: { ...valid.academic, gpa: 4, gpaScale: 3 },
    }).success,
    false,
  );
  assert.equal(
    registrationDataSchema.safeParse({
      ...valid,
      additional: { ...valid.additional, privacyAgreed: false },
    }).success,
    false,
  );
  assert.equal(
    registrationDataSchema.safeParse({ ...valid, role: "SUPER_ADMIN" }).success,
    false,
  );
});

test("seed catalog has stable unique IDs and expected option coverage", () => {
  assert.equal(formOptions.filter((o) => o.kind === "DISTRICT").length, 25);
  assert.equal(formOptions.filter((o) => o.kind === "ACADEMIC_YEAR").length, 6);
  assert.equal(
    formOptions.filter((o) => o.kind === "REFERRAL_SOURCE").length,
    7,
  );
  const positions = careerCategories.flatMap((c) =>
    c.positions.map(([id]) => id),
  );
  assert.equal(new Set(positions).size, positions.length);
  assert.equal(positions.length, 29);
  assert.equal(opportunityTypes.length, 7);
});

test("JSON body limits apply to streamed data even without a Content-Length", async () => {
  const request = new Request("https://example.org/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(100) }),
  });
  await assert.rejects(readBoundedJson(request, 20), { status: 413 });
  const accepted = new Request("https://example.org/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"accepted":true}',
  });
  assert.deepEqual(await readBoundedJson(accepted), { accepted: true });
});

test("origin checks and error responses do not expose internal data", async () => {
  assert.throws(
    () =>
      assertTrustedOrigin(
        new Request("https://example.org/api", {
          headers: { origin: "https://untrusted.example.org" },
        }),
        "https://example.org",
      ),
    { status: 403 },
  );
  const response = errorResponse(new Error("PRIVATE_CONNECTION_DETAILS"));
  assert.equal(response.status, 503);
  assert.equal(
    (await response.text()).includes("PRIVATE_CONNECTION_DETAILS"),
    false,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("URL query flags cannot override the pg client's verified TLS or endpoint", () => {
  const settings = databaseSettings({
    DATABASE_URL:
      "postgresql://example:placeholder@db.example.org/database?ssl=0&host=other.example.org&sslnegotiation=direct",
  });
  const client = new Client(settings);
  assert.deepEqual(client.ssl, { rejectUnauthorized: true });
  assert.equal(new URL(settings.connectionString!).hostname, "db.example.org");
  assert.equal(new URL(settings.connectionString!).search, "");
  const local = databaseSettings({
    DATABASE_URL:
      "postgresql://example:placeholder@localhost/database?host=other.example.org",
    NODE_ENV: "development",
  });
  assert.equal(new URL(local.connectionString!).hostname, "localhost");
  assert.equal(new URL(local.connectionString!).search, "");
});

test("invalid optional URLs return validation failures without throwing", () => {
  for (const portfolioUrl of ["not-a-url", "https://", "javascript:alert(1)"]) {
    assert.equal(
      registrationDataSchema.safeParse({
        ...valid,
        personal: { ...valid.personal, portfolioUrl },
      }).success,
      false,
    );
  }
  assert.equal(
    registrationDataSchema.safeParse({
      ...valid,
      personal: {
        ...valid.personal,
        portfolioUrl: "https://example.org/portfolio",
      },
    }).success,
    true,
  );
});

test("contact numbers require a plausible digit count", () => {
  for (const phone of ["-------", "(())--..", "1234567890123456"]) {
    assert.equal(
      registrationDataSchema.safeParse({
        ...valid,
        personal: { ...valid.personal, phone },
      }).success,
      false,
    );
  }
});

test("JSON media types are matched exactly while allowing charset parameters", async () => {
  const makeRequest = (type: string) =>
    new Request("https://example.org/api", {
      method: "POST",
      headers: { "content-type": type },
      body: '{"accepted":true}',
    });
  await assert.rejects(
    readBoundedJson(makeRequest("application/json-invalid")),
    { status: 415 },
  );
  assert.deepEqual(
    await readBoundedJson(makeRequest("application/json; charset=utf-8")),
    { accepted: true },
  );
});
