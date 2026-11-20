import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { runEmailWorker } from "../src/server/email/worker";
import { GET as cron } from "../src/app/api/internal/email-jobs/route";
const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env))
    if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});
test("disabled worker leaves queued records untouched", async () => {
  process.env.EMAIL_DELIVERY_ENABLED = "false";
  assert.deepEqual(await runEmailWorker(), {
    sent: 0,
    retried: 0,
    failed: 0,
    cancelled: 0,
    disabled: true,
  });
});
test("worker rejects empty scopes rather than claiming unrelated jobs", async () => {
  await assert.rejects(
    runEmailWorker({ jobIds: [], transport: async () => ({ id: "fixture" }) }),
    /Invalid email worker options/,
  );
});
test("recovery endpoint rejects missing, wrong and multibyte credentials safely", async () => {
  delete process.env.VERCEL_ENV;
  process.env.CRON_SECRET = "c".repeat(32);
  for (const value of [
    "",
    "Bearer wrong",
    "Bearer " + String.fromCharCode(233).repeat(32),
  ]) {
    const result = await cron(
      new Request("https://example.org/api/internal/email-jobs", {
        headers: { Authorization: value },
      }),
    );
    assert.equal(result.status, 401);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
  }
});
test("preview deployments never drain the email queue", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.EMAIL_DELIVERY_ENABLED = "true";
  const result = await cron(
    new Request("https://example.org/api/internal/email-jobs"),
  );
  assert.deepEqual(await result.json(), { disabled: true });
});

test("worker rejects invalid batch limits without touching the queue", async () => {
  for (const maxJobs of [0, -1, 11, 1.5, NaN, Infinity]) {
    await assert.rejects(
      runEmailWorker({ maxJobs, transport: async () => ({ id: "fixture" }) }),
      /Invalid email worker options/,
    );
  }
});
