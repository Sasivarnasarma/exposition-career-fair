import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertAdminStatusChange,
  adminStatusSchema,
  adminInviteSchema,
  adminIdentifierSchema,
} from "../src/server/admin/management";
test("admin management rejects role escalation, invalid identifiers and malformed invitations", () => {
  assert.equal(
    adminStatusSchema.safeParse({ active: true, role: "SUPER_ADMIN" }).success,
    false,
  );
  assert.equal(adminStatusSchema.safeParse({ active: "true" }).success, false);
  assert.equal(
    adminInviteSchema.safeParse({
      email: "organiser@example.org",
      role: "SUPER_ADMIN",
    }).success,
    false,
  );
  assert.equal(adminIdentifierSchema.safeParse("../private").success, false);
  assert.equal(
    adminInviteSchema.safeParse({ email: "organiser@example.org" }).success,
    true,
  );
});
test("account status policy protects self and last active super administrator", () => {
  const base = {
    actorId: "actor",
    targetId: "target",
    role: "SUPER_ADMIN",
    active: false,
    activeSuperCount: 2,
  };
  assert.doesNotThrow(() => assertAdminStatusChange(base));
  assert.throws(() => assertAdminStatusChange({ ...base, targetId: "actor" }), {
    status: 409,
  });
  assert.throws(
    () => assertAdminStatusChange({ ...base, activeSuperCount: 1 }),
    { status: 409 },
  );
  assert.throws(() => assertAdminStatusChange({ ...base, role: "UNKNOWN" }), {
    status: 403,
  });
  assert.doesNotThrow(() =>
    assertAdminStatusChange({ ...base, active: true, activeSuperCount: 0 }),
  );
});
