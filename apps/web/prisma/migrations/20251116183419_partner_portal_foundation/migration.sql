-- CreateEnum
CREATE TYPE "PartnerRole" AS ENUM ('ADMIN', 'CONTRIBUTOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "PartnerProjectStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('FILE', 'LINK', 'NOTE');

-- CreateTable
CREATE TABLE "PartnerUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerProject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partnerName" TEXT,
    "status" "PartnerProjectStatus" NOT NULL DEFAULT 'PENDING',
    "requirements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "partnerProjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMembership" (
    "id" TEXT NOT NULL,
    "partnerUserId" TEXT NOT NULL,
    "partnerProjectId" TEXT NOT NULL,
    "role" "PartnerRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanItemEvidence" (
    "id" TEXT NOT NULL,
    "planItemId" TEXT NOT NULL,
    "partnerProjectId" TEXT NOT NULL,
    "uploadedByPartnerUserId" TEXT,
    "kind" "EvidenceKind" NOT NULL DEFAULT 'FILE',
    "url" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanItemEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerUser_email_key" ON "PartnerUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerInvite_token_key" ON "PartnerInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMembership_partnerUserId_partnerProjectId_key" ON "PartnerMembership"("partnerUserId", "partnerProjectId");

-- AddForeignKey
ALTER TABLE "PartnerProject" ADD CONSTRAINT "PartnerProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvite" ADD CONSTRAINT "PartnerInvite_partnerProjectId_fkey" FOREIGN KEY ("partnerProjectId") REFERENCES "PartnerProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMembership" ADD CONSTRAINT "PartnerMembership_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "PartnerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMembership" ADD CONSTRAINT "PartnerMembership_partnerProjectId_fkey" FOREIGN KEY ("partnerProjectId") REFERENCES "PartnerProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemEvidence" ADD CONSTRAINT "PlanItemEvidence_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "PlanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemEvidence" ADD CONSTRAINT "PlanItemEvidence_partnerProjectId_fkey" FOREIGN KEY ("partnerProjectId") REFERENCES "PartnerProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemEvidence" ADD CONSTRAINT "PlanItemEvidence_uploadedByPartnerUserId_fkey" FOREIGN KEY ("uploadedByPartnerUserId") REFERENCES "PartnerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
