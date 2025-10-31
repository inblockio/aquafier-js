/*
  Warnings:

  - The `children` column on the `revision` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."revision" DROP COLUMN "children",
ADD COLUMN     "children" TEXT[];
