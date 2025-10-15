/*
  Warnings:

  - You are about to drop the `DNSClaimVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."DNSClaimVerification";

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."DNSClaimVerificationOne" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "verification_logs" JSONB NOT NULL,
    "verification_status" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_verified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSClaimVerificationOne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DNSClaimVerificationOne_wallet_address_idx" ON "public"."DNSClaimVerificationOne"("wallet_address");
