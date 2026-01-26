/*
  Warnings:

  - You are about to drop the column `options` on the `aqua_templates_fields` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "aqua_templates_fields" DROP COLUMN "options";

-- CreateTable
CREATE TABLE "aqua_template_field_options" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aqua_template_field_options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "aqua_template_field_options" ADD CONSTRAINT "aqua_template_field_options_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "aqua_templates_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
