/*
  Warnings:

  - You are about to drop the column `content` on the `file` table. All the data in the column will be lost.
  - Added the required column `file_location` to the `file` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "file" DROP COLUMN "content",
ADD COLUMN     "file_location" TEXT NOT NULL;
