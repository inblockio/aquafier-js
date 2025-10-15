-- AlterTable
ALTER TABLE "aqua_templates_fields" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_editable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "support_text" TEXT;

-- AlterTable
ALTER TABLE "contract" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "file_name" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "navigate_to" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
