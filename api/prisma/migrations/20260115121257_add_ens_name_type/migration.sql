-- CreateEnum
CREATE TYPE "EnsNameType" AS ENUM ('ALIAS', 'ENS_NAME');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ens_name_type" "EnsNameType" NOT NULL DEFAULT 'ENS_NAME';
