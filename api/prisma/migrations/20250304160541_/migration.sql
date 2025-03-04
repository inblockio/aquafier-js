/*
  Warnings:

  - The primary key for the `File` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[hash]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "File" DROP CONSTRAINT "File_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "File_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "FileNames" (
    "id" SERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "fileId" INTEGER NOT NULL,

    CONSTRAINT "FileNames_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FileNames_fileId_key" ON "FileNames"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "File_hash_key" ON "File"("hash");

-- AddForeignKey
ALTER TABLE "FileNames" ADD CONSTRAINT "FileNames_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
