/*
  Warnings:

  - The primary key for the `aqua_forms` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `aqua_forms` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "aqua_forms" DROP CONSTRAINT "aqua_forms_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "aqua_forms_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "latest" ADD COLUMN     "is_workflow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "alchemy_key" TEXT NOT NULL DEFAULT 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ';

-- CreateTable
CREATE TABLE "aqua_templates" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL,

    CONSTRAINT "aqua_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aqua_templates_fields" (
    "id" TEXT NOT NULL,
    "aqua_form_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "is_array" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "aqua_templates_fields_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "aqua_templates_fields" ADD CONSTRAINT "aqua_templates_fields_aqua_form_id_fkey" FOREIGN KEY ("aqua_form_id") REFERENCES "aqua_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
