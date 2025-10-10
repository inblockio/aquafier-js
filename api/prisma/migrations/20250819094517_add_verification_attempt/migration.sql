-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."VerificationAttempt" (
    "id" SERIAL NOT NULL,
    "email_or_phone_number" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "nonce" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationAttempt_email_or_phone_number_verification_type_idx" ON "public"."VerificationAttempt"("email_or_phone_number", "verification_type", "action");
