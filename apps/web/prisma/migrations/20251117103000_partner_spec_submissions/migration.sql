-- AlterTable
ALTER TABLE "Spec" ADD COLUMN "submittedByPartnerProjectId" TEXT;

-- AddForeignKey
ALTER TABLE "Spec" ADD CONSTRAINT "Spec_submittedByPartnerProjectId_fkey" FOREIGN KEY ("submittedByPartnerProjectId") REFERENCES "PartnerProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
