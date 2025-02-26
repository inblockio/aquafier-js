-- CreateTable
CREATE TABLE "SiweSession" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationTime" TIMESTAMP(3),

    CONSTRAINT "SiweSession_pkey" PRIMARY KEY ("id")
);
