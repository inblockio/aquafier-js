/*
  Warnings:

  - Added the required column `subtitle` to the `aqua_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."aqua_templates" ADD COLUMN     "subtitle" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."aqua_templates_fields" ADD COLUMN     "default_value" TEXT,
ADD COLUMN     "is_verifiable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."contract" ADD COLUMN     "receiver_has_deleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."verification_data" (
    "id" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "filled_value" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_data_pkey" PRIMARY KEY ("id")
);

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
