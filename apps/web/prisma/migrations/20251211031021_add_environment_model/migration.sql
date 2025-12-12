-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('MOCK', 'SANDBOX', 'UAT', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('NONE', 'API_KEY', 'OAUTH2', 'BASIC');

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnvironmentType" NOT NULL,
    "baseUrl" TEXT,
    "authType" "AuthType" NOT NULL DEFAULT 'NONE',
    "credentials" JSONB,
    "headers" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Environment_projectId_idx" ON "Environment"("projectId");

-- CreateIndex
CREATE INDEX "Environment_projectId_isDefault_idx" ON "Environment"("projectId", "isDefault");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
