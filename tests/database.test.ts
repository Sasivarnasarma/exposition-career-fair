import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

let db: PGlite;
before(async () => {
  db = await PGlite.create();
  for (const entry of readdirSync("prisma/migrations", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name)))
    await db.exec(
      readFileSync(`prisma/migrations/${entry.name}/migration.sql`, "utf8"),
    );
  await db.exec(`
    INSERT INTO "EventEdition" (id,name,year,"privacyVersion") VALUES ('test-event','Test event',2027,'test-notice');
    INSERT INTO "FormOption" (id,kind,label,"sortOrder") VALUES ('district','DISTRICT','Test district',0), ('academic','ACADEMIC_YEAR','Test year',0), ('referral','REFERRAL_SOURCE','Test referral',0);
    INSERT INTO "CareerCategory" (id,label,"sortOrder") VALUES ('category','Test category',0);
    INSERT INTO "CareerPosition" (id,label,"categoryId","sortOrder") VALUES ('position','Test position','category',0), ('unselected','Other position','category',1);
    INSERT INTO "OpportunityType" (id,label,"sortOrder") VALUES ('internship','Internship',0);
  `);
});
after(async () => {
  await db?.close();
});

async function writeRegistration(
  id: string,
  email: string,
  selectPreference = true,
) {
  await db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO "Registration" (id,"eventId",reference,"fullName",email,phone,"districtId","institutionName","facultyName","degreeName","academicYearId","graduationYear","firstPreferencePositionId","referralSourceId","idempotencyKey","requestHash","updatedAt") VALUES ($1,'test-event',$1,'Example Candidate',$2,'0000000','district','Other institution','Other faculty','Other degree','academic',2027,'position','referral',$1,'test-hash',NOW())`,
      [id, email],
    );
    if (selectPreference)
      await tx.query(
        `INSERT INTO "RegistrationPosition" ("registrationId","positionId") VALUES ($1,'position')`,
        [id],
      );
    await tx.query(
      `INSERT INTO "RegistrationOpportunity" ("registrationId","opportunityId") VALUES ($1,'internship')`,
      [id],
    );
    await tx.query(
      `INSERT INTO "ConsentRecord" ("registrationId",accurate,updates,"privacyAgreed","privacyVersion") VALUES ($1,true,false,true,'test-notice')`,
      [id],
    );
    await tx.query(
      `INSERT INTO "EmailJob" (id,"registrationId",kind,"dedupeKey") VALUES ($1,$1,'REGISTRATION_CONFIRMATION',$1)`,
      [id],
    );
  });
}

test("initial migration applies and atomic registration persists selections, consent and mail", async () => {
  await writeRegistration("accepted", "candidate@example.org");
  assert.equal(
    (await db.query(`SELECT 1 FROM "Registration" WHERE id='accepted'`)).rows
      .length,
    1,
  );
  assert.equal(
    (
      await db.query(
        `SELECT 1 FROM "ConsentRecord" WHERE "registrationId"='accepted'`,
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await db.query(
        `SELECT 1 FROM "EmailJob" WHERE "registrationId"='accepted'`,
      )
    ).rows.length,
    1,
  );
});

test("first preference must belong to selected positions at commit; failed writes roll back", async () => {
  await assert.rejects(
    writeRegistration("invalid-preference", "invalid@example.org", false),
  );
  assert.equal(
    (
      await db.query(
        `SELECT 1 FROM "Registration" WHERE id='invalid-preference'`,
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (await db.query(`SELECT 1 FROM "EmailJob" WHERE id='invalid-preference'`))
      .rows.length,
    0,
  );
});

test("database enforces normalized email and per-event uniqueness", async () => {
  await assert.rejects(writeRegistration("uppercase", "Uppercase@example.org"));
  await assert.rejects(writeRegistration("duplicate", "candidate@example.org"));
});

test("invalid consent and GPA are rejected by database constraints", async () => {
  await assert.rejects(
    db.exec(
      `UPDATE "ConsentRecord" SET "privacyAgreed"=false WHERE "registrationId"='accepted'`,
    ),
  );
  await assert.rejects(
    db.exec(`UPDATE "Registration" SET gpa=5,"gpaScale"=4 WHERE id='accepted'`),
  );
});

test("all application tables enable RLS and first-preference constraint is deferred", async () => {
  const tables = await db.query<{ count: number }>(
    `SELECT count(*)::int as count FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity`,
  );
  assert.equal(tables.rows[0].count, 0);
  const constraint = await db.query<{
    condeferrable: boolean;
    condeferred: boolean;
  }>(
    `SELECT condeferrable, condeferred FROM pg_constraint WHERE conname='Registration_id_firstPreferencePositionId_fkey'`,
  );
  assert.deepEqual(constraint.rows[0], {
    condeferrable: true,
    condeferred: true,
  });
});
