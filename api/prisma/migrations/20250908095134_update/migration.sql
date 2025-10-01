/*
  Warnings:

  - You are about to drop the column `receiver` on the `contract` table. All the data in the column will be lost.
  - The `receiver_has_deleted` column on the `contract` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."contract" DROP COLUMN "receiver",
DROP COLUMN "receiver_has_deleted",
ADD COLUMN     "receiver_has_deleted" TEXT[];
