ALTER TYPE "EmailState" ADD VALUE 'CANCELLED';
ALTER TABLE "EmailJob"
  ADD COLUMN "payloadCiphertext" TEXT,
  ADD COLUMN "firstAttemptAt" TIMESTAMPTZ(3),
  ADD COLUMN "expiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "leaseToken" TEXT;
CREATE INDEX "EmailJob_lockedAt_idx" ON "EmailJob" ("lockedAt");
