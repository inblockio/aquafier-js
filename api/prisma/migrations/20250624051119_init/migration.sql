/*
  Warnings:

  - The primary key for the `file` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `file_location` on the `file` table. All the data in the column will be lost.
  - The primary key for the `file_index` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `pubkey_hash` on the `file_index` table. All the data in the column will be lost.
  - You are about to drop the column `file_hash` on the `revision` table. All the data in the column will be lost.
  - You are about to drop the `file_name` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `hash` to the `file` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `file_index` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "file" DROP CONSTRAINT "file_pkey",
DROP COLUMN "file_location",
ADD COLUMN     "content" TEXT,
ADD COLUMN     "hash" TEXT NOT NULL,
ADD COLUMN     "reference_count" INTEGER,
ALTER COLUMN "file_hash" DROP NOT NULL,
ADD CONSTRAINT "file_pkey" PRIMARY KEY ("hash");

-- AlterTable
ALTER TABLE "file_index" DROP CONSTRAINT "file_index_pkey",
DROP COLUMN "pubkey_hash",
ADD COLUMN     "hash" TEXT[],
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "reference_count" INTEGER,
ADD COLUMN     "uri" TEXT,
ADD CONSTRAINT "file_index_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "revision" DROP COLUMN "file_hash";

-- DropTable
DROP TABLE "file_name";

-- AddForeignKey
ALTER TABLE "file_index" ADD CONSTRAINT "file_index_id_fkey" FOREIGN KEY ("id") REFERENCES "file"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;
