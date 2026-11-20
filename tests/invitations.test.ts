import assert from "node:assert/strict";
import { test } from "node:test";
import { invitationAcceptanceSchema } from "../src/server/admin/invitations";
const fixture = {
  token: "A".repeat(43),
  password: "fixture-password-value",
  name: "Example Organiser",
};
test("invitation acceptance only permits credentials and a one-time token", () => {
  assert.equal(invitationAcceptanceSchema.safeParse(fixture).success, true);
  assert.equal(
    invitationAcceptanceSchema.safeParse({ ...fixture, role: "SUPER_ADMIN" })
      .success,
    false,
  );
  assert.equal(
    invitationAcceptanceSchema.safeParse({
      ...fixture,
      email: "someone@example.org",
    }).success,
    false,
  );
  assert.equal(
    invitationAcceptanceSchema.safeParse({ ...fixture, token: "guessable" })
      .success,
    false,
  );
  assert.equal(
    invitationAcceptanceSchema.safeParse({ ...fixture, password: "short" })
      .success,
    false,
  );
  assert.equal(
    invitationAcceptanceSchema.safeParse({ ...fixture, name: " " }).success,
    false,
  );
});
