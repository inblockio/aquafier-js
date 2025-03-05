-- CreateTable
CREATE TABLE "siwe_session" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationTime" TIMESTAMP(3),

    CONSTRAINT "siwe_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "siwe_session_nonce_key" ON "siwe_session"("nonce");
