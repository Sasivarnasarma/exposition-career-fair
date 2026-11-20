-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "EmailState" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "OptionKind" AS ENUM ('DISTRICT', 'ACADEMIC_YEAR', 'REFERRAL_SOURCE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "userId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEdition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "registrationClosesAt" TIMESTAMPTZ(3),
    "privacyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormOption" (
    "id" TEXT NOT NULL,
    "kind" "OptionKind" NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FormOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CareerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerPosition" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CareerPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityType" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OpportunityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "linkedInUrl" TEXT,
    "portfolioUrl" TEXT,
    "institutionId" TEXT,
    "institutionName" TEXT NOT NULL,
    "facultyName" TEXT NOT NULL,
    "degreeName" TEXT NOT NULL,
    "specialization" TEXT,
    "academicYearId" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "gpa" DECIMAL(4,2),
    "gpaScale" DECIMAL(4,2),
    "firstPreferencePositionId" TEXT NOT NULL,
    "otherPosition" TEXT,
    "referralSourceId" TEXT NOT NULL,
    "referralOther" TEXT,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationPosition" (
    "registrationId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "RegistrationPosition_pkey" PRIMARY KEY ("registrationId","positionId")
);

-- CreateTable
CREATE TABLE "RegistrationOpportunity" (
    "registrationId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "RegistrationOpportunity_pkey" PRIMARY KEY ("registrationId","opportunityId")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "registrationId" TEXT NOT NULL,
    "accurate" BOOLEAN NOT NULL,
    "updates" BOOLEAN NOT NULL,
    "privacyAgreed" BOOLEAN NOT NULL,
    "privacyVersion" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("registrationId")
);

-- CreateTable
CREATE TABLE "CandidateVerification" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT,
    "kind" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "state" "EmailState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "providerId" TEXT,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetsAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInvitation_email_expiresAt_idx" ON "AdminInvitation"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "FormOption_kind_sortOrder_idx" ON "FormOption"("kind", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_name_key" ON "Institution"("name");

-- CreateIndex
CREATE INDEX "CareerPosition_categoryId_sortOrder_idx" ON "CareerPosition"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_reference_key" ON "Registration"("reference");

-- CreateIndex
CREATE INDEX "Registration_eventId_createdAt_idx" ON "Registration"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Registration_institutionId_academicYearId_idx" ON "Registration"("institutionId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_email_key" ON "Registration"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_idempotencyKey_key" ON "Registration"("eventId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RegistrationPosition_positionId_idx" ON "RegistrationPosition"("positionId");

-- CreateIndex
CREATE INDEX "RegistrationOpportunity_opportunityId_idx" ON "RegistrationOpportunity"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateVerification_tokenHash_key" ON "CandidateVerification"("tokenHash");

-- CreateIndex
CREATE INDEX "CandidateVerification_registrationId_expiresAt_idx" ON "CandidateVerification"("registrationId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailJob_dedupeKey_key" ON "EmailJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailJob_state_availableAt_idx" ON "EmailJob"("state", "availableAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_resetsAt_idx" ON "RateLimitBucket"("resetsAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "AdminProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminProfile"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPosition" ADD CONSTRAINT "CareerPosition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CareerCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "EventEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "FormOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "FormOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_referralSourceId_fkey" FOREIGN KEY ("referralSourceId") REFERENCES "FormOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_id_firstPreferencePositionId_fkey" FOREIGN KEY ("id", "firstPreferencePositionId") REFERENCES "RegistrationPosition"("registrationId", "positionId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RegistrationPosition" ADD CONSTRAINT "RegistrationPosition_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationPosition" ADD CONSTRAINT "RegistrationPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "CareerPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationOpportunity" ADD CONSTRAINT "RegistrationOpportunity_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationOpportunity" ADD CONSTRAINT "RegistrationOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "OpportunityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateVerification" ADD CONSTRAINT "CandidateVerification_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registration and selections are committed atomically. Defer this circular FK
-- until transaction commit so a registration can be created before its selections.
ALTER TABLE "Registration" ALTER CONSTRAINT "Registration_id_firstPreferencePositionId_fkey" DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_email_normalized" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_gpa_valid" CHECK (("gpa" IS NULL AND "gpaScale" IS NULL) OR ("gpa" IS NOT NULL AND "gpaScale" IS NOT NULL AND "gpa" >= 0 AND "gpaScale" > 0 AND "gpa" <= "gpaScale"));
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_required_confirmations" CHECK ("accurate" AND "privacyAgreed");
ALTER TABLE "RateLimitBucket" ADD CONSTRAINT "RateLimitBucket_count_positive" CHECK ("count" > 0);
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_attempts_nonnegative" CHECK ("attempts" >= 0);

-- Candidate/admin tables must never be available through Supabase's public Data API.
DO $$
DECLARE table_name text; api_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['user','session','account','verification','AdminProfile','AdminInvitation','AuditEvent','EventEdition','FormOption','Institution','CareerCategory','CareerPosition','OpportunityType','Registration','RegistrationPosition','RegistrationOpportunity','ConsentRecord','CandidateVerification','EmailJob','RateLimitBucket'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE %I FROM PUBLIC', table_name);
    FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', table_name, api_role);
      END IF;
    END LOOP;
  END LOOP;
END $$;
