-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'AQUAFIER';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "licence_genesis_hash" TEXT;
