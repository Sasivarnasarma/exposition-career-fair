import "./load-env";
import assert from "node:assert/strict";
import {
  verifyTurnstile,
  TEST_SITE_KEY,
} from "../src/server/security/turnstile";
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Local verification only");
  const env = { ...process.env };
  try {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = TEST_SITE_KEY;
    process.env.TURNSTILE_ALLOWED_HOSTNAMES = "localhost";
    process.env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "registration");
    for (const secret of [
      "2x0000000000000000000000000000000AA",
      "3x0000000000000000000000000000000AA",
    ]) {
      process.env.TURNSTILE_SECRET_KEY = secret;
      await assert.rejects(
        verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "registration"),
        { status: 403 },
      );
    }
    console.log(
      "Official Turnstile test-key verification passed: success, failure and duplicate-token rejection. Real hostname/action checks remain a staging requirement.",
    );
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
}
main().catch(() => {
  console.error(
    "Official Turnstile test-key verification failed; check network access and provider availability.",
  );
  process.exitCode = 1;
});
