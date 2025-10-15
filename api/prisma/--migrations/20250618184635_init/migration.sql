/*
  Warnings:

  - The primary key for the `file` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `content` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `hash` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `reference_count` on the `file` table. All the data in the column will be lost.
  - The primary key for the `file_index` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `hash` on the `file_index` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `file_index` table. All the data in the column will be lost.
  - You are about to drop the column `reference_count` on the `file_index` table. All the data in the column will be lost.
  - You are about to drop the column `uri` on the `file_index` table. All the data in the column will be lost.
  - Added the required column `file_location` to the `file` table without a default value. This is not possible if the table is not empty.
  - Made the column `file_hash` on table `file` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "file_index" DROP CONSTRAINT "file_index_id_fkey";

-- AlterTable
ALTER TABLE "file" DROP CONSTRAINT "file_pkey",
DROP COLUMN "content",
DROP COLUMN "hash",
DROP COLUMN "reference_count",
ADD COLUMN     "file_location" TEXT NOT NULL,
ALTER COLUMN "file_hash" SET NOT NULL,
ADD CONSTRAINT "file_pkey" PRIMARY KEY ("file_hash");

-- AlterTable
ALTER TABLE "file_index" DROP CONSTRAINT "file_index_pkey",
DROP COLUMN "hash",
DROP COLUMN "id",
DROP COLUMN "reference_count",
DROP COLUMN "uri",
ADD COLUMN     "pubkey_hash" TEXT[],
ADD CONSTRAINT "file_index_pkey" PRIMARY KEY ("file_hash");

-- AlterTable
ALTER TABLE "revision" ADD COLUMN     "file_hash" TEXT;

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "alchemy_key" TEXT NOT NULL DEFAULT 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ';

-- CreateTable
CREATE TABLE IF NOT EXISTS "file_name" (
    "pubkey_hash" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,

    CONSTRAINT "file_name_pkey" PRIMARY KEY ("pubkey_hash")
);
