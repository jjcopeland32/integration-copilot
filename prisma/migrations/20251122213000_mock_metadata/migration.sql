-- Align root schema with web schema for mock lifecycle metadata
ALTER TABLE "MockInstance"
  ADD COLUMN "port" INTEGER,
  ADD COLUMN "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "lastStartedAt" TIMESTAMP(3),
  ADD COLUMN "lastStoppedAt" TIMESTAMP(3),
  ADD COLUMN "lastHealthAt" TIMESTAMP(3);
