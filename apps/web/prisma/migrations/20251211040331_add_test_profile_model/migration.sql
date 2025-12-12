-- CreateEnum
CREATE TYPE "TestCategoryStatus" AS ENUM ('REQUIRED', 'OPTIONAL', 'NA', 'AUTO');

-- CreateTable
CREATE TABLE "TestProfile" (
    "id" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "apiGroup" TEXT NOT NULL,
    "categorySettings" JSONB NOT NULL,
    "detectedCapabilities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestProfile_specId_key" ON "TestProfile"("specId");

-- CreateIndex
CREATE INDEX "TestProfile_specId_idx" ON "TestProfile"("specId");

-- AddForeignKey
ALTER TABLE "TestProfile" ADD CONSTRAINT "TestProfile_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
