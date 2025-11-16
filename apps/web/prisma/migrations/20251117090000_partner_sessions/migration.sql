-- CreateTable
CREATE TABLE "PartnerSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "partnerUserId" TEXT NOT NULL,
    "partnerProjectId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSession_token_key" ON "PartnerSession"("token");

-- AddForeignKey
ALTER TABLE "PartnerSession" ADD CONSTRAINT "PartnerSession_partnerUserId_fkey" FOREIGN KEY ("partnerUserId") REFERENCES "PartnerUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSession" ADD CONSTRAINT "PartnerSession_partnerProjectId_fkey" FOREIGN KEY ("partnerProjectId") REFERENCES "PartnerProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
