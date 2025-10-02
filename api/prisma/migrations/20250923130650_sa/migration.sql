-- CreateTable
CREATE TABLE "public"."DNSClaimVerificationOne" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "verification_logs" JSONB NOT NULL,
    "verification_status" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_domain_verified" BOOLEAN NOT NULL DEFAULT true,
    "last_verified" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSClaimVerificationOne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DNSClaimVerificationOne_wallet_address_idx" ON "public"."DNSClaimVerificationOne"("wallet_address");
