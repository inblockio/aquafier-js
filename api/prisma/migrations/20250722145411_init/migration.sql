-- AlterTable
ALTER TABLE "aqua_templates_fields" ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_editable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "support_text" TEXT;
