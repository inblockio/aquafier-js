/*
  Warnings:

  - The primary key for the `file` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `file` table. All the data in the column will be lost.
  - The primary key for the `file_index` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `file_index` table. All the data in the column will be lost.
  - The primary key for the `file_name` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `file_name` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "file" DROP CONSTRAINT "file_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "file_pkey" PRIMARY KEY ("file_hash");

-- AlterTable
ALTER TABLE "file_index" DROP CONSTRAINT "file_index_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "file_index_pkey" PRIMARY KEY ("file_hash");

-- AlterTable
ALTER TABLE "file_name" DROP CONSTRAINT "file_name_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "file_name_pkey" PRIMARY KEY ("pubkey_hash");
