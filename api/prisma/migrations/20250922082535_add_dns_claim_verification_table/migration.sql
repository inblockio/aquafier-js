-- CreateTable
CREATE TABLE "public"."DNSClaimVerification" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "verification_logs" JSONB NOT NULL,
    "verification_status" TEXT NOT NULL,
    "last_verified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSClaimVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DNSClaimVerification_wallet_address_idx" ON "public"."DNSClaimVerification"("wallet_address");
