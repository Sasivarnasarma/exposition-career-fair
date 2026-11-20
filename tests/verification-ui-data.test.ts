import assert from "node:assert/strict";
import { test } from "node:test";
import {
  verificationEmailSchema,
  verificationResponseStatus,
  verificationTokenFromHash,
} from "../src/shared/verification-contract";

test("verification links read one bounded fragment token without accepting query strings", () => {
  const token = "A".repeat(43);
  assert.equal(verificationTokenFromHash(`#token=${token}`), token);
  assert.equal(verificationTokenFromHash(`?token=${token}`), null);
  assert.equal(
    verificationTokenFromHash(`#token=${token}&token=${token}`),
    null,
  );
  assert.equal(verificationTokenFromHash("#token=short"), null);
  assert.equal(verificationTokenFromHash("#token=%3Cscript%3E"), null);
  assert.equal(verificationTokenFromHash("#token=" + "A".repeat(2049)), null);
  assert.equal(verificationTokenFromHash(""), null);
});

test("verification feedback accepts only successful API outcomes", () => {
  assert.equal(verificationResponseStatus({ status: "verified" }), "verified");
  assert.equal(
    verificationResponseStatus({ status: "already-verified" }),
    "already-verified",
  );
  for (const value of [
    null,
    {},
    { status: "queued" },
    { success: true },
    "verified",
  ])
    assert.equal(verificationResponseStatus(value), null);
});

test("verification resend normalizes a valid address and rejects malformed input", () => {
  assert.equal(
    verificationEmailSchema.parse(" Candidate@Example.org "),
    "candidate@example.org",
  );
  assert.equal(verificationEmailSchema.safeParse("invalid").success, false);
  assert.equal(verificationEmailSchema.safeParse("").success, false);
});
