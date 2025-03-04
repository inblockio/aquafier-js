/*
  Warnings:

  - A unique constraint covering the columns `[nonce]` on the table `SiweSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SiweSession_nonce_key" ON "SiweSession"("nonce");
