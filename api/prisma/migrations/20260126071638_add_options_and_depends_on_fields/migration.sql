-- AlterTable
ALTER TABLE "aqua_templates_fields" ADD COLUMN     "depend_on_field" TEXT,
ADD COLUMN     "depend_on_value" TEXT,
ADD COLUMN     "options" TEXT[];
