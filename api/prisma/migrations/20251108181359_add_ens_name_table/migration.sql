-- CreateTable
CREATE TABLE "public"."ENSName" (
    "id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "ens_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ENSName_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_address_ens_name" ON "public"."ENSName"("wallet_address", "ens_name");
