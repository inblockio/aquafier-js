/*
  Warnings:

  - You are about to drop the `DNSClaimVerificationOne` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."DNSClaimVerificationOne";

-- CreateTable
CREATE TABLE "public"."DNSClaimVerification" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verification_logs" JSONB NOT NULL,
    "verification_status" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_domain_verified" BOOLEAN NOT NULL DEFAULT true,
    "last_verified" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSClaimVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DNSClaimVerification_wallet_address_domain_idx" ON "public"."DNSClaimVerification"("wallet_address", "domain");
