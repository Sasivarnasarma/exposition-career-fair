import "./load-env";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../src/server/db";
import { persistRegistration } from "../src/server/registrations/persist";
import { runEmailWorker } from "../src/server/email/worker";
import { sendWithResend } from "../src/server/email/transport";
import { queueCandidateResend } from "../src/server/email/verification";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { z } from "zod";
const stateFile = "docs/live-email-test.json";
async function main() {
  if (
    process.env.DATABASE_TEST_MODE !== "dedicated-development" ||
    process.env.NODE_ENV === "production"
  )
    throw new Error("Dedicated development required");
  const db = getDatabase();
  try {
    if (process.argv.includes("cleanup")) {
      const { eventId } = JSON.parse(readFileSync(stateFile, "utf8"));
      if (!/^mail-test-[a-f0-9-]{36}$/.test(eventId))
        throw new Error("Invalid test scope");
      await db.$transaction(async (tx) => {
        await tx.registration.deleteMany({ where: { eventId } });
        await tx.eventEdition.delete({ where: { id: eventId } });
      });
      console.log("Live email test records removed");
      return;
    }
    if (existsSync(stateFile))
      throw new Error(
        "Clean up the previous scoped test before starting another",
      );
    const email = z.email().parse(process.env.EMAIL_TEST_RECIPIENT);
    const eventId = `mail-test-${randomUUID()}`;
    await db.eventEdition.create({
      data: {
        id: eventId,
        name: "Disposable live email verification",
        year: 2027,
        registrationOpen: true,
        privacyVersion: "live-email-test",
      },
    });
    writeFileSync(stateFile, JSON.stringify({ eventId }));
    const result = await persistRegistration(
      eventId,
      {
        personal: {
          fullName: "Example Candidate",
          email,
          phone: "0000000000",
          districtId: "district-colombo",
        },
        academic: {
          institutionName: "Example institution",
          facultyName: "Example faculty",
          degreeName: "Example programme",
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
          privacyVersion: "live-email-test",
        },
      },
      randomUUID(),
    );
    const registration = await db.registration.findUniqueOrThrow({
      where: { reference: result.reference },
    });
    const job = await db.emailJob.findFirstOrThrow({
      where: { registrationId: registration.id },
    });
    const sent = await runEmailWorker({
      jobIds: [job.id],
      maxJobs: 1,
      transport: sendWithResend,
    });
    if (sent.sent !== 1)
      throw new Error("Provider did not accept confirmation");
    process.env.REGISTRATION_EVENT_ID = eventId;
    await queueCandidateResend(email);
    const verification = await db.emailJob.findFirstOrThrow({
      where: {
        registrationId: registration.id,
        kind: "CANDIDATE_VERIFICATION",
      },
    });
    const resent = await runEmailWorker({
      jobIds: [verification.id],
      maxJobs: 1,
      transport: sendWithResend,
    });
    if (resent.sent !== 1)
      throw new Error("Provider did not accept verification");
    console.log(
      "Provider accepted confirmation and verification messages for the approved test recipient. Inbox delivery remains to be confirmed.",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Live email test failed; inspect redacted job state. Scoped test records are retained for cleanup.",
  );
  process.exitCode = 1;
});
