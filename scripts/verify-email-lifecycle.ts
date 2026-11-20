import "./load-env";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { decryptEmailPayload } from "../src/server/email/crypto";
import { messageSchema } from "../src/server/email/queue";
import { getDatabase } from "../src/server/db";
import { handleAuth } from "../src/server/auth/handler";
import { persistRegistration } from "../src/server/registrations/persist";
import {
  createAdminInvitation,
  acceptAdminInvitation,
} from "../src/server/admin/invitations";
import {
  consumeCandidateToken,
  queueCandidateResend,
} from "../src/server/email/verification";
import { runEmailWorker } from "../src/server/email/worker";
import { queueEmail, type EmailMessage } from "../src/server/email/queue";
import { randomEmailToken, hashEmailToken } from "../src/server/email/tokens";
import { rateLimitKey } from "../src/server/security/rate-limit";
import {
  EmailSendError,
  type EmailTransport,
} from "../src/server/email/transport";

let step = "setup";
async function verify() {
  if (
    process.env.DATABASE_TEST_MODE !== "dedicated-development" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Dedicated development opt-in required");
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const db = getDatabase();
  const scope = `email-test-${randomUUID()}`;
  const eventId = scope;
  const emails = Array.from(
    { length: 12 },
    (_, i) => `${scope}-${i}@example.org`,
  );
  const userIds: string[] = [];
  const invitationIds: string[] = [];
  const independentJobIds: string[] = [];
  let eventCreated = false;
  const origin = new URL(process.env.BETTER_AUTH_URL!).origin;
  const password = randomBytes(24).toString("hex");
  const challenge = "XXXX.DUMMY.TOKEN.XXXX";
  process.env.RATE_LIMIT_SECRET = randomBytes(32).toString("hex");
  process.env.REGISTRATION_EVENT_ID = eventId;
  const captured: { message: EmailMessage; key: string }[] = [];
  const transport: EmailTransport = async (message, key) => {
    captured.push({ message, key });
    return { id: `simulated-${randomUUID()}` };
  };
  function tokenFrom(message: EmailMessage) {
    const match = message.text.match(
      /https?:\/\/[^\s]+#token=([A-Za-z0-9_-]+)/,
    );
    assert.ok(match, "Expected a fragment action token");
    return match[1];
  }
  async function deliver(jobId: string) {
    const before = captured.length;
    const result = await runEmailWorker({
      maxJobs: 1,
      jobIds: [jobId],
      transport,
    });
    assert.equal(result.sent, 1);
    assert.equal(captured.length, before + 1);
    const job = await db.emailJob.findUniqueOrThrow({ where: { id: jobId } });
    assert.equal(job.state, "SENT");
    assert.equal(job.payloadCiphertext, null);
    return captured[captured.length - 1].message;
  }
  async function createIdentity(index: number, role: "ADMIN" | "SUPER_ADMIN") {
    const id = randomUUID();
    await db.user.create({
      data: {
        id,
        name: "Example Organiser",
        email: emails[index],
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
    userIds.push(id);
    return id;
  }
  async function signIn(email: string) {
    const response = await handleAuth(
      new Request(`${origin}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          origin,
          "Content-Type": "application/json",
          "x-captcha-response": challenge,
        },
        body: JSON.stringify({ email, password }),
      }),
    );
    assert.equal(response.status, 200);
    return new Headers({
      cookie: response.headers
        .getSetCookie()
        .map((value) => value.split(";", 1)[0])
        .join("; "),
    });
  }
  const input = (email: string) => ({
    personal: {
      fullName: "Example Candidate",
      email,
      phone: "+94 00 000 0000",
      districtId: "district-colombo",
    },
    academic: {
      institutionName: "Example institution",
      facultyName: "Example faculty",
      degreeName: "Example degree",
      academicYearId: "year-graduate",
      graduationYear: new Date().getUTCFullYear(),
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
      privacyVersion: "integration-test",
    },
  });
  try {
    // Block every external call except controlled Turnstile replies; transport is simulated.
    globalThis.fetch = async (input) => {
      if (
        String(input) ===
        "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      )
        return Response.json({ success: true, hostname: "example.com" });
      throw new Error(
        "External network is disabled for lifecycle verification",
      );
    };
    await db.eventEdition.create({
      data: {
        id: eventId,
        name: "Disposable email verification",
        year: 2027,
        privacyVersion: "integration-test",
        registrationOpen: true,
      },
    });
    eventCreated = true;
    step = "candidate-confirmation";
    const receipt = await persistRegistration(
      eventId,
      input(emails[0]),
      randomUUID(),
    );
    const registration = await db.registration.findUniqueOrThrow({
      where: { reference: receipt.reference },
    });
    const confirmation = await db.emailJob.findUniqueOrThrow({
      where: { dedupeKey: `registration-confirmation:${registration.id}` },
    });
    assert.equal(registration.emailVerifiedAt, null);
    const message = await deliver(confirmation.id);
    const token = tokenFrom(message);
    const storedToken = await db.candidateVerification.findUniqueOrThrow({
      where: { tokenHash: hashEmailToken(token) },
    });
    assert.notEqual(storedToken.tokenHash, token);
    assert.equal(storedToken.registrationId, registration.id);
    assert.ok(message.text.includes(receipt.reference));
    step = "candidate-token-consumption";
    const consumed = await Promise.all([
      consumeCandidateToken(token),
      consumeCandidateToken(token),
    ]);
    assert.deepEqual(consumed.map((value) => value.status).sort(), [
      "already-verified",
      "verified",
    ]);
    assert.equal(
      (await consumeCandidateToken(token)).status,
      "already-verified",
    );
    assert.notEqual(
      (
        await db.registration.findUniqueOrThrow({
          where: { id: registration.id },
        })
      ).emailVerifiedAt,
      null,
    );
    const expiredToken = randomEmailToken();
    await db.candidateVerification.create({
      data: {
        registrationId: registration.id,
        tokenHash: hashEmailToken(expiredToken),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    await assert.rejects(consumeCandidateToken(expiredToken), { status: 400 });
    await assert.rejects(consumeCandidateToken(randomEmailToken()), {
      status: 400,
    });
    step = "candidate-resend";
    assert.equal(await queueCandidateResend(emails[11]), undefined);
    assert.equal(await queueCandidateResend(emails[0]), undefined);
    assert.equal(
      await db.emailJob.count({ where: { registrationId: registration.id } }),
      1,
    );
    const resendReceipt = await persistRegistration(
      eventId,
      input(emails[1]),
      randomUUID(),
    );
    const resendRegistration = await db.registration.findUniqueOrThrow({
      where: { reference: resendReceipt.reference },
    });
    await Promise.all([
      queueCandidateResend(emails[1]),
      queueCandidateResend(emails[1]),
    ]);
    assert.equal(
      await db.emailJob.count({
        where: {
          registrationId: resendRegistration.id,
          kind: "CANDIDATE_VERIFICATION",
        },
      }),
      1,
    );
    const resendJob = await db.emailJob.findFirstOrThrow({
      where: {
        registrationId: resendRegistration.id,
        kind: "CANDIDATE_VERIFICATION",
      },
    });
    const resendMessage = await deliver(resendJob.id);
    assert.equal(
      (await consumeCandidateToken(tokenFrom(resendMessage))).status,
      "verified",
    );
    step = "administrator-invitations";
    const superId = await createIdentity(2, "SUPER_ADMIN");
    await createIdentity(3, "ADMIN");
    const superHeaders = await signIn(emails[2]);
    const adminHeaders = await signIn(emails[3]);
    await assert.rejects(createAdminInvitation(adminHeaders, emails[4]), {
      status: 403,
    });
    await assert.rejects(createAdminInvitation(superHeaders, emails[3]), {
      status: 409,
    });
    const firstInvite = await createAdminInvitation(superHeaders, emails[4]);
    invitationIds.push(firstInvite.id);
    assert.equal(firstInvite.created, true);
    assert.deepEqual(await createAdminInvitation(superHeaders, emails[4]), {
      id: firstInvite.id,
      created: false,
    });
    const inviteJob = await db.emailJob.findUniqueOrThrow({
      where: { dedupeKey: `admin-invitation:${firstInvite.id}` },
    });
    independentJobIds.push(inviteJob.id);
    const originalPayload = messageSchema.parse(
      decryptEmailPayload(inviteJob.payloadCiphertext!),
    );
    const originalToken = tokenFrom(originalPayload);
    await db.emailJob.update({
      where: { id: inviteJob.id },
      data: { state: "FAILED", payloadCiphertext: null },
    });
    const replacement = await createAdminInvitation(superHeaders, emails[4]);
    invitationIds.push(replacement.id);
    assert.equal(replacement.created, true);
    assert.notEqual(replacement.id, firstInvite.id);
    assert.notEqual(
      (
        await db.adminInvitation.findUniqueOrThrow({
          where: { id: firstInvite.id },
        })
      ).revokedAt,
      null,
    );
    await assert.rejects(
      acceptAdminInvitation(originalToken, password, "Example Admin"),
      { status: 400 },
    );
    const replacementJob = await db.emailJob.findUniqueOrThrow({
      where: { dedupeKey: `admin-invitation:${replacement.id}` },
    });
    independentJobIds.push(replacementJob.id);
    const inviteMessage = await deliver(replacementJob.id);
    const inviteToken = tokenFrom(inviteMessage);
    step = "concurrent-invitation-acceptance";
    const accepted = await Promise.allSettled([
      acceptAdminInvitation(inviteToken, password, "Example Admin"),
      acceptAdminInvitation(inviteToken, password, "Example Admin"),
    ]);
    assert.equal(
      accepted.filter((value) => value.status === "fulfilled").length,
      1,
    );
    assert.equal(
      accepted.filter((value) => value.status === "rejected").length,
      1,
    );
    const newAdmin = await db.user.findUniqueOrThrow({
      where: { email: emails[4] },
      include: { admin: true },
    });
    userIds.push(newAdmin.id);
    assert.equal(newAdmin.admin?.role, "ADMIN");
    assert.equal(await db.session.count({ where: { userId: newAdmin.id } }), 0);
    await assert.rejects(
      acceptAdminInvitation(inviteToken, password, "Example Admin"),
      { status: 400 },
    );

    step = "invitation-rejection-states";
    for (const [index, mode] of [
      [5, "expired"],
      [6, "revoked"],
      [7, "existing"],
      [8, "inactive-inviter"],
    ] as const) {
      const invitation = await createAdminInvitation(
        superHeaders,
        emails[index],
      );
      invitationIds.push(invitation.id);
      const job = await db.emailJob.findUniqueOrThrow({
        where: { dedupeKey: `admin-invitation:${invitation.id}` },
      });
      independentJobIds.push(job.id);
      const invite = tokenFrom(await deliver(job.id));
      if (mode === "expired")
        await db.adminInvitation.update({
          where: { id: invitation.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
      if (mode === "revoked")
        await db.adminInvitation.update({
          where: { id: invitation.id },
          data: { revokedAt: new Date() },
        });
      if (mode === "existing") await createIdentity(index, "ADMIN");
      if (mode === "inactive-inviter")
        await db.adminProfile.update({
          where: { userId: superId },
          data: { active: false },
        });
      await assert.rejects(
        acceptAdminInvitation(invite, password, "Example Admin"),
        { status: 400 },
      );
      if (mode === "inactive-inviter")
        await db.adminProfile.update({
          where: { userId: superId },
          data: { active: true },
        });
      assert.equal(
        (
          await db.adminInvitation.findUniqueOrThrow({
            where: { id: invitation.id },
          })
        ).acceptedAt,
        null,
      );
    }
    step = "worker-obsolete-invitation";
    const revoked = await createAdminInvitation(superHeaders, emails[9]);
    invitationIds.push(revoked.id);
    const revokedJob = await db.emailJob.findUniqueOrThrow({
      where: { dedupeKey: `admin-invitation:${revoked.id}` },
    });
    independentJobIds.push(revokedJob.id);
    await db.adminInvitation.update({
      where: { id: revoked.id },
      data: { revokedAt: new Date() },
    });
    const capturedBefore = captured.length;
    assert.equal(
      (await runEmailWorker({ maxJobs: 1, jobIds: [revokedJob.id], transport }))
        .cancelled,
      1,
    );
    assert.equal(captured.length, capturedBefore);
    assert.equal(
      (await db.emailJob.findUniqueOrThrow({ where: { id: revokedJob.id } }))
        .payloadCiphertext,
      null,
    );
    step = "active-admin-password-reset";
    const resetStarted = new Date();
    const resetResponse = await handleAuth(
      new Request(`${origin}/api/auth/request-password-reset`, {
        method: "POST",
        headers: {
          origin,
          "Content-Type": "application/json",
          "x-captcha-response": challenge,
        },
        body: JSON.stringify({ email: emails[3] }),
      }),
    );
    assert.equal(resetResponse.status, 200);
    const resetJobs = await db.emailJob.findMany({
      where: {
        kind: "ADMIN_PASSWORD_RESET",
        createdAt: { gte: resetStarted },
        state: "PENDING",
        payloadCiphertext: { not: null },
      },
    });
    const resetJob = resetJobs.find(
      (job) =>
        messageSchema.parse(decryptEmailPayload(job.payloadCiphertext!))
          .to[0] === emails[3],
    );
    assert.ok(
      resetJob,
      "Active administrator reset should queue an encrypted message",
    );
    independentJobIds.push(resetJob.id);
    const resetMessage = await deliver(resetJob.id);
    const resetToken = tokenFrom(resetMessage);
    const resetPassword = randomBytes(24).toString("hex");
    const resetRequest = () =>
      handleAuth(
        new Request(`${origin}/api/auth/reset-password`, {
          method: "POST",
          headers: {
            origin,
            "Content-Type": "application/json",
            "x-captcha-response": challenge,
          },
          body: JSON.stringify({
            token: resetToken,
            newPassword: resetPassword,
          }),
        }),
      );
    assert.equal((await resetRequest()).status, 200);
    const resetAdmin = await db.user.findUniqueOrThrow({
      where: { email: emails[3] },
    });
    const changedCredential = await db.account.findFirstOrThrow({
      where: { userId: resetAdmin.id, providerId: "credential" },
    });
    assert.equal(
      await verifyPassword({
        hash: changedCredential.password!,
        password: resetPassword,
      }),
      true,
    );
    assert.equal(
      await db.session.count({ where: { userId: resetAdmin.id } }),
      0,
    );
    assert.equal((await resetRequest()).status, 400);
    step = "worker-retry-and-concurrency";
    const retryJob = await db.$transaction((tx) =>
      queueEmail(tx, {
        kind: "ADMIN_PASSWORD_RESET",
        to: emails[2],
        recipientName: "Example Organiser",
        actionUrl: `${origin}/admin/reset-password#token=${randomEmailToken()}`,
        dedupeKey: `${scope}:retry`,
        expiresAt: new Date(Date.now() + 3600000),
      }),
    );
    independentJobIds.push(retryJob.id);
    let retryMessage: EmailMessage | undefined;
    let retryKey: string | undefined;
    const unavailable: EmailTransport = async (message, key) => {
      retryMessage = message;
      retryKey = key;
      throw new EmailSendError("FIXTURE_RETRY", true);
    };
    assert.equal(
      (
        await runEmailWorker({
          maxJobs: 1,
          jobIds: [retryJob.id],
          transport: unavailable,
        })
      ).retried,
      1,
    );
    const pending = await db.emailJob.findUniqueOrThrow({
      where: { id: retryJob.id },
    });
    assert.equal(pending.state, "PENDING");
    assert.ok(pending.payloadCiphertext);
    assert.equal(pending.attempts, 1);
    await db.emailJob.update({
      where: { id: retryJob.id },
      data: { availableAt: new Date(Date.now() - 1000) },
    });
    const retried = await deliver(retryJob.id);
    assert.deepEqual(retried, retryMessage);
    assert.equal(captured[captured.length - 1].key, retryKey);
    const leaseJob = await db.$transaction((tx) =>
      queueEmail(tx, {
        kind: "ADMIN_PASSWORD_RESET",
        to: emails[2],
        recipientName: "Example Organiser",
        actionUrl: `${origin}/admin/reset-password#token=${randomEmailToken()}`,
        dedupeKey: `${scope}:lease`,
        expiresAt: new Date(Date.now() + 3600000),
      }),
    );
    independentJobIds.push(leaseJob.id);
    await db.emailJob.update({
      where: { id: leaseJob.id },
      data: {
        state: "PROCESSING",
        lockedAt: new Date(Date.now() - 360000),
        leaseToken: randomUUID(),
        firstAttemptAt: new Date(Date.now() - 360000),
        attempts: 1,
      },
    });
    const beforeRace = captured.length;
    const race = await Promise.all([
      runEmailWorker({ maxJobs: 1, jobIds: [leaseJob.id], transport }),
      runEmailWorker({ maxJobs: 1, jobIds: [leaseJob.id], transport }),
    ]);
    assert.equal(
      race.reduce((total, result) => total + result.sent, 0),
      1,
    );
    assert.equal(captured.length, beforeRace + 1);
    assert.equal(
      (await db.emailJob.findUniqueOrThrow({ where: { id: leaseJob.id } }))
        .attempts,
      2,
    );
    assert.equal(
      (
        await db.eventEdition.findUniqueOrThrow({
          where: { id: "issue-22-2027" },
        })
      ).registrationOpen,
      false,
    );
    console.log(
      "Email lifecycle verification passed: simulated confirmation delivery, token concurrency/expiry/reuse, resend privacy/deduplication, role-guarded invitations, atomic acceptance, invalid invitation states, obsolete-job cancellation, active administrator reset delivery/consumption/session revocation, stable retry payload/key and stale-lease concurrency.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    try {
      // Every filter is tied to this invocation's unique records or HMAC secret.
      const scopedUsers = await db.user.findMany({
        where: { email: { in: emails } },
        select: { id: true },
      });
      for (const user of scopedUsers)
        if (!userIds.includes(user.id)) userIds.push(user.id);
      const scopedInvitations = await db.adminInvitation.findMany({
        where: { email: { in: emails } },
        select: { id: true },
      });
      for (const invitation of scopedInvitations)
        if (!invitationIds.includes(invitation.id))
          invitationIds.push(invitation.id);
      await db.emailJob.deleteMany({
        where: {
          OR: [
            { id: { in: independentJobIds } },
            {
              dedupeKey: {
                in: invitationIds.map((id) => `admin-invitation:${id}`),
              },
            },
          ],
        },
      });
      await db.auditEvent.deleteMany({
        where: {
          OR: [
            { actorId: { in: userIds } },
            { targetId: { in: [...userIds, ...invitationIds] } },
          ],
        },
      });
      await db.adminInvitation.deleteMany({
        where: { id: { in: invitationIds } },
      });
      await db.verification.deleteMany({ where: { value: { in: userIds } } });
      await db.user.deleteMany({ where: { id: { in: userIds } } });
      if (eventCreated)
        await db.$transaction(async (tx) => {
          await tx.registration.deleteMany({ where: { eventId } });
          await tx.eventEdition.delete({ where: { id: eventId } });
        });
      const keys = ["admin-login", "admin-reset"].flatMap((scopeName) => [
        rateLimitKey(scopeName, "global"),
        ...emails.map((email) => rateLimitKey(scopeName, `account:${email}`)),
      ]);
      await db.rateLimitBucket.deleteMany({ where: { key: { in: keys } } });
    } finally {
      for (const key of Object.keys(process.env))
        if (!(key in originalEnv)) delete process.env[key];
      Object.assign(process.env, originalEnv);
      await db.$disconnect();
    }
  }
}
verify().catch((error: unknown) => {
  const code =
    typeof error === "object" &&
    error &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9_]{1,50}$/.test(error.code)
      ? error.code
      : "VERIFICATION_FAILED";
  console.error(
    JSON.stringify({
      verified: false,
      step,
      code,
      ...(typeof error === "object" &&
      error &&
      "meta" in error &&
      error.meta &&
      typeof error.meta === "object" &&
      "error" in error.meta &&
      typeof error.meta.error === "string"
        ? {
            transactionHint: error.meta.error
              .match(
                /Unable to start a transaction|Transaction already closed|expired transaction|timeout of \d+ ?ms|\d+ ?ms have passed/g,
              )
              ?.join("; "),
          }
        : {}),
      ...(error instanceof assert.AssertionError &&
      typeof error.actual === "number"
        ? { actual: error.actual, expected: error.expected }
        : {}),
    }),
  );
  process.exitCode = 1;
});
