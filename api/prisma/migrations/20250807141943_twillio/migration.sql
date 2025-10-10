-- AlterTable
ALTER TABLE "aqua_templates_fields" ADD COLUMN     "is_verifiable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "verification_data" (
    "id" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "filled_value" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_data_pkey" PRIMARY KEY ("id")
);
