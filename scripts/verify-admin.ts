import "./load-env";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { getDatabase } from "../src/server/db";
import { handleAuth } from "../src/server/auth/handler";
import { persistRegistration } from "../src/server/registrations/persist";
import {
  getCandidateList,
  getCandidateDetail,
  getDashboardStats,
} from "../src/server/admin/candidates";
import { parseAdminFilters } from "../src/shared/admin-filters";
import { createCandidateExport } from "../src/server/admin/csv";
import { GET as exportGet } from "../src/app/api/admin/registrations/export/route";
import {
  getAdminManagement,
  updateAdminStatus,
  revokeAdminInvitation,
  assertAdminStatusChange,
} from "../src/server/admin/management";
import { createAdminInvitation } from "../src/server/admin/invitations";
import { PATCH } from "../src/app/api/admin/accounts/[id]/route";
import { POST as invitePost } from "../src/app/api/admin/invitations/route";
import { rateLimitKey } from "../src/server/security/rate-limit";

let step = "setup";
async function main() {
  if (
    process.env.DATABASE_TEST_MODE !== "dedicated-development" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Dedicated development opt-in required");
  const db = getDatabase(),
    env = { ...process.env },
    originalFetch = globalThis.fetch;
  const scope = `admin-test-${randomUUID()}`,
    eventId = scope,
    otherEvent = `${scope}-other`;
  const userIds: string[] = [],
    invitationIds: string[] = [],
    keys: string[] = [];
  const password = randomBytes(24).toString("hex");
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  process.env.RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
  const exportRequest = (headers: Headers, query: string) =>
    new Request(
      `${origin}/api/admin/registrations/export?eventId=${eventId}&${query}`,
      { headers },
    );
  try {
    globalThis.fetch = async (input) => {
      if (
        String(input) ===
        "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      )
        return Response.json({ success: true, hostname: "example.com" });
      throw new Error("External calls disabled during admin verification");
    };
    for (const role of ["SUPER_ADMIN", "ADMIN", "SUPER_ADMIN"] as const) {
      const id = randomUUID();
      userIds.push(id);
      await db.user.create({
        data: {
          id,
          name: "Example Organiser",
          email: `${scope}-${userIds.length}@example.org`,
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
    const signIn = async (index: number) => {
      const email = `${scope}-${index + 1}@example.org`;
      keys.push(
        rateLimitKey("admin-login", "global"),
        rateLimitKey("admin-login", `account:${email}`),
      );
      const res = await handleAuth(
        new Request(`${origin}/api/auth/sign-in/email`, {
          method: "POST",
          headers: {
            origin,
            "Content-Type": "application/json",
            "x-captcha-response": "XXXX.DUMMY.TOKEN.XXXX",
          },
          body: JSON.stringify({ email, password }),
        }),
      );
      assert.equal(res.status, 200);
      return new Headers({
        cookie: res.headers
          .getSetCookie()
          .map((s) => s.split(";", 1)[0])
          .join("; "),
      });
    };
    const superHeaders = await signIn(0),
      adminHeaders = await signIn(1),
      secondSuper = await signIn(2);
    for (const id of [eventId, otherEvent])
      await db.eventEdition.create({
        data: {
          id,
          name: "Disposable admin verification",
          year: 2027,
          registrationOpen: true,
          privacyVersion: "integration-test",
        },
      });
    step = "candidate-fixtures";
    for (let i = 0; i < 3; i++) {
      await persistRegistration(
        i === 2 ? otherEvent : eventId,
        {
          personal: {
            fullName:
              i === 0 ? '=Example, "Candidate" සිංහල' : "Example Candidate",
            email: `${scope}-candidate${i}@example.org`,
            phone: "+94 77 123 4567",
            districtId: "district-colombo",
          },
          academic: {
            institutionName:
              i === 0 ? "Example institution" : "Second institution",
            facultyName: "Example faculty",
            degreeName: "Example degree",
            academicYearId: "year-graduate",
            graduationYear: 2026,
          },
          preferences: {
            positionIds:
              i === 0
                ? ["software-engineer", "data-analyst"]
                : ["software-engineer"],
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
        },
        randomUUID(),
      );
    }
    const first = await db.registration.findFirstOrThrow({
      where: { eventId, institutionName: "Example institution" },
    });
    await db.registration.update({
      where: { id: first.id },
      data: { emailVerifiedAt: new Date() },
    });
    step = "authorization";
    await assert.rejects(
      getCandidateList(new Headers(), { eventId, page: 1 }),
      { status: 403 },
    );
    await assert.rejects(
      createCandidateExport(exportRequest(new Headers(), "scope=all")),
      { status: 403 },
    );
    await assert.rejects(getAdminManagement(adminHeaders), { status: 403 });
    await assert.rejects(updateAdminStatus(adminHeaders, userIds[0], false), {
      status: 403,
    });
    const forbidden = await invitePost(
      new Request(`${origin}/api/admin/invitations`, {
        method: "POST",
        headers: {
          cookie: adminHeaders.get("cookie")!,
          origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: `${scope}-invite@example.org` }),
      }),
    );
    assert.equal(forbidden.status, 403);
    const wrongOrigin = await PATCH(
      new Request(`${origin}/api/admin/accounts/${userIds[1]}`, {
        method: "PATCH",
        headers: {
          cookie: superHeaders.get("cookie")!,
          origin: "https://untrusted.example.org",
          "Content-Type": "application/json",
        },
        body: '{"active":false}',
      }),
      { params: Promise.resolve({ id: userIds[1] }) },
    );
    assert.equal(wrongOrigin.status, 403);
    step = "filters-detail-statistics";
    const filters = parseAdminFilters({
      eventId,
      institution: "Example institution",
      faculty: "Example faculty",
      degree: "Example degree",
      academicYear: "year-graduate",
      position: "data-analyst",
      opportunity: "internship",
      verified: "verified",
      q: "Example",
    });
    const list = await getCandidateList(adminHeaders, filters);
    assert.equal(list.total, 1);
    assert.equal(list.rows[0].id, first.id);
    assert.equal(
      (await getCandidateList(adminHeaders, { ...filters, q: "100%" })).total,
      0,
    );
    const detail = await getCandidateDetail(adminHeaders, first.id);
    assert.equal(detail?.consent?.privacyVersion, "integration-test");
    assert.ok(!JSON.stringify(detail).includes(first.requestHash));
    const stats = await getDashboardStats(adminHeaders, eventId);
    assert.equal(stats.total, 2);
    assert.equal(stats.verified, 1);
    assert.equal(stats.institutionCount, 2);
    assert.equal(
      stats.breakdowns.positions.reduce((n, v) => n + v.count, 0),
      3,
    );
    assert.equal(
      stats.breakdowns.firstPreferences.reduce((n, v) => n + v.count, 0),
      2,
    );
    step = "csv-export";
    keys.push(rateLimitKey("admin-export", userIds[1]));
    const filtered = await createCandidateExport(
      exportRequest(
        adminHeaders,
        "scope=filtered&institution=Example%20institution",
      ),
    );
    assert.match(filtered.headers.get("cache-control")!, /no-store/);
    const csv = await filtered.text();
    assert.ok(csv.includes('"\'=Example, ""Candidate"" සිංහල"'));
    assert.ok(csv.includes(first.reference));
    assert.ok(!csv.includes(`${scope}-candidate1@`));
    const all = await createCandidateExport(
      exportRequest(
        adminHeaders,
        "scope=all&institution=Example%20institution",
      ),
    );
    const allText = await all.text();
    assert.ok(allText.includes(`${scope}-candidate1@`));
    assert.ok(!allText.includes(`${scope}-candidate2@`));
    const empty = await createCandidateExport(
      exportRequest(adminHeaders, "scope=filtered&q=nonexistent"),
    );
    assert.equal((await empty.text()).split("\r\n").length, 2);
    const audit = await db.auditEvent.findMany({
      where: { actorId: userIds[1], action: "REGISTRATIONS_EXPORTED" },
    });
    assert.equal(audit.length, 3);
    assert.ok(!JSON.stringify(audit).includes("Example institution"));
    step = "batch-export-and-pagination";
    const bulk = Array.from({ length: 251 }, (_, i) => ({
      ...first,
      id: randomUUID(),
      email: `${scope}-bulk${i}@example.org`,
      reference: `ECF-${randomBytes(8).toString("hex").toUpperCase()}`,
      idempotencyKey: randomUUID(),
    }));
    await db.$transaction(
      async (tx) => {
        await tx.registration.createMany({ data: bulk });
        await tx.registrationPosition.createMany({
          data: bulk.map((r) => ({
            registrationId: r.id,
            positionId: r.firstPreferencePositionId,
          })),
        });
      },
      { timeout: 20000, maxWait: 10000 },
    );
    const aggregate = await getDashboardStats(adminHeaders, eventId);
    assert.equal(aggregate.total, 253);
    assert.equal(aggregate.verified, 1);
    assert.equal(aggregate.institutionCount, 2);
    assert.equal(
      aggregate.breakdowns.positions.reduce((n, v) => n + v.count, 0),
      254,
    );
    assert.equal(
      aggregate.breakdowns.firstPreferences.reduce((n, v) => n + v.count, 0),
      253,
    );
    assert.equal((await getDashboardStats(adminHeaders, otherEvent)).total, 1);
    const missingEvent = await getDashboardStats(
      adminHeaders,
      `${scope}-missing`,
    );
    assert.equal(missingEvent.event, null);
    assert.equal(missingEvent.total, 0);
    assert.equal(missingEvent.breakdowns.positions.length, 0);
    const paged = await getCandidateList(adminHeaders, { eventId, page: 2 });
    assert.equal(paged.rows.length, 25);
    assert.equal(paged.total, 253);
    const end = await getCandidateList(adminHeaders, { eventId, page: 999 });
    assert.equal(end.page, 11);
    assert.equal(end.rows.length, 3);
    const batch = await createCandidateExport(
      exportRequest(adminHeaders, "scope=all"),
    );
    const batchText = await batch.text();
    assert.equal(batchText.split("\r\n").length, 255);
    for (const r of bulk) assert.equal(batchText.split(r.reference).length, 2);
    await assert.rejects(
      createCandidateExport(
        new Request(
          `${origin}/api/admin/registrations/export?scope=all&eventId=missing-${scope}`,
          { headers: adminHeaders },
        ),
      ),
      { status: 400 },
    );
    step = "interrupted-export-audit";
    const interrupted = await createCandidateExport(
      exportRequest(adminHeaders, "scope=all"),
    );
    await interrupted.body!.cancel();
    const started = await db.auditEvent.findFirstOrThrow({
      where: { actorId: userIds[1], action: "REGISTRATIONS_EXPORT_REQUESTED" },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(
      await db.auditEvent.count({
        where: {
          actorId: userIds[1],
          action: "REGISTRATIONS_EXPORT_REQUESTED",
        },
      }),
      5,
    );
    assert.equal(
      await db.auditEvent.count({
        where: {
          action: "REGISTRATIONS_EXPORTED",
          metadata: { path: ["requestId"], equals: started.id },
        },
      }),
      0,
    );
    const unauthorizedExport = await exportGet(
      exportRequest(new Headers(), "scope=all"),
    );
    assert.equal(unauthorizedExport.status, 403);
    assert.match(unauthorizedExport.headers.get("Cache-Control")!, /no-store/);
    step = "team-management";
    await assert.rejects(updateAdminStatus(superHeaders, userIds[0], false), {
      status: 409,
    });
    assert.throws(
      () =>
        assertAdminStatusChange({
          actorId: "actor",
          targetId: "last",
          role: "SUPER_ADMIN",
          active: false,
          activeSuperCount: 1,
        }),
      { status: 409 },
    );
    const mutationHeaders = new Headers(superHeaders);
    mutationHeaders.set("origin", origin);
    mutationHeaders.set("Content-Type", "application/json");
    keys.push(rateLimitKey("admin-management", userIds[0]));
    const escalation = await PATCH(
      new Request(`${origin}/api/admin/accounts/${userIds[1]}`, {
        method: "PATCH",
        headers: mutationHeaders,
        body: '{"active":true,"role":"SUPER_ADMIN"}',
      }),
      { params: Promise.resolve({ id: userIds[1] }) },
    );
    assert.equal(escalation.status, 400);
    const invitation = await createAdminInvitation(
      secondSuper,
      `${scope}-invite@example.org`,
    );
    invitationIds.push(invitation.id);
    await updateAdminStatus(superHeaders, userIds[2], false);
    assert.equal(
      (
        await db.adminInvitation.findUniqueOrThrow({
          where: { id: invitation.id },
        })
      ).revokedAt !== null,
      true,
    );
    assert.equal(
      (
        await db.emailJob.findUniqueOrThrow({
          where: { dedupeKey: `admin-invitation:${invitation.id}` },
        })
      ).state,
      "CANCELLED",
    );
    await updateAdminStatus(superHeaders, userIds[1], false);
    assert.equal(await db.session.count({ where: { userId: userIds[1] } }), 0);
    await assert.rejects(getCandidateList(adminHeaders, { eventId, page: 1 }), {
      status: 403,
    });
    await updateAdminStatus(superHeaders, userIds[1], true);
    await assert.rejects(getCandidateList(adminHeaders, { eventId, page: 1 }), {
      status: 403,
    });
    const revoked = await createAdminInvitation(
      superHeaders,
      `${scope}-revoke@example.org`,
    );
    invitationIds.push(revoked.id);
    await revokeAdminInvitation(superHeaders, revoked.id);
    assert.equal(
      (
        await db.emailJob.findUniqueOrThrow({
          where: { dedupeKey: `admin-invitation:${revoked.id}` },
        })
      ).state,
      "CANCELLED",
    );
    const management = await getAdminManagement(superHeaders);
    assert.ok(!JSON.stringify(management).includes("tokenHash"));
    console.log(
      "Admin verification passed: permissions, combined filters, detail redaction, aggregate counts, filtered/all/empty CSV, Unicode/formula safety, export auditing, role escalation rejection, invitation revocation, account status and session revocation.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    await db.emailJob.deleteMany({
      where: {
        dedupeKey: { in: invitationIds.map((id) => `admin-invitation:${id}`) },
      },
    });
    await db.auditEvent.deleteMany({
      where: {
        OR: [
          { actorId: { in: userIds } },
          {
            targetId: {
              in: [...userIds, ...invitationIds, eventId, otherEvent],
            },
          },
        ],
      },
    });
    await db.adminInvitation.deleteMany({
      where: { invitedById: { in: userIds } },
    });
    await db.registration.deleteMany({
      where: { eventId: { in: [eventId, otherEvent] } },
    });
    await db.eventEdition.deleteMany({
      where: { id: { in: [eventId, otherEvent] } },
    });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
    assert.equal(
      await db.registration.count({
        where: { eventId: { in: [eventId, otherEvent] } },
      }),
      0,
    );
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    `Admin verification failed at ${step}${typeof error?.code === "string" ? ` (${error.code})` : ""}.`,
  );
  process.exitCode = 1;
});
