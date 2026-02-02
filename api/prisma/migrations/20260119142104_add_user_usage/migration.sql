-- AlterTable
ALTER TABLE "file" ADD COLUMN     "file_size" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_usage" (
    "user_address" TEXT NOT NULL,
    "storage_usage_bytes" BIGINT NOT NULL DEFAULT 0,
    "files_count" INTEGER NOT NULL DEFAULT 0,
    "contracts_count" INTEGER NOT NULL DEFAULT 0,
    "templates_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_usage_pkey" PRIMARY KEY ("user_address")
);

-- AddForeignKey
ALTER TABLE "user_usage" ADD CONSTRAINT "user_usage_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
