-- AddColumn
ALTER TABLE "Project" ADD COLUMN "telemetrySecret" TEXT;

-- AddColumn
ALTER TABLE "Trace" ADD COLUMN "signatureStatus" TEXT NOT NULL DEFAULT 'valid';
