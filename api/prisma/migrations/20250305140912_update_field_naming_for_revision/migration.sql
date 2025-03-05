/*
  Warnings:

  - You are about to drop the column `Revision_type` on the `revision` table. All the data in the column will be lost.
  - You are about to drop the column `Verification_leaves` on the `revision` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "revision" DROP COLUMN "Revision_type",
DROP COLUMN "Verification_leaves",
ADD COLUMN     "revision_type" TEXT,
ADD COLUMN     "verification_leaves" TEXT[];
