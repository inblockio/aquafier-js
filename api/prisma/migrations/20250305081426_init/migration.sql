-- CreateTable
CREATE TABLE "SiweSession" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationTime" TIMESTAMP(3),

    CONSTRAINT "SiweSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "user" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user")
);

-- CreateTable
CREATE TABLE "Contract" (
    "hash" TEXT NOT NULL,
    "latest" JSONB NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "reference_count" INTEGER NOT NULL,
    "userUser" TEXT,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Latest" (
    "hash" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "revisionHash" TEXT,

    CONSTRAINT "Latest_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Revision" (
    "hash" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "shared" JSONB NOT NULL,
    "contract" JSONB NOT NULL,
    "previous" TEXT,
    "children" JSONB NOT NULL,
    "local_timestamp" TIMESTAMP(3) NOT NULL,
    "Revision_type" TEXT NOT NULL,
    "Verification_leaves" JSONB NOT NULL,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "FileNames" (
    "id" SERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "fileId" INTEGER NOT NULL,

    CONSTRAINT "FileNames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "hash" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "reference_count" INTEGER NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Link" (
    "hash" TEXT NOT NULL,
    "link_type" TEXT NOT NULL,
    "link_require_indepth_verification" BOOLEAN NOT NULL,
    "link_verification_hash" TEXT,
    "reference_count" INTEGER NOT NULL,

    CONSTRAINT "Link_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Index" (
    "hash" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "reference_count" INTEGER NOT NULL,

    CONSTRAINT "Index_pkey" PRIMARY KEY ("hash","file_hash")
);

-- CreateTable
CREATE TABLE "Signature" (
    "hash" TEXT NOT NULL,
    "signature_digest" TEXT NOT NULL,
    "signature_wallet_address" TEXT NOT NULL,
    "signature_type" TEXT NOT NULL,
    "reference_count" INTEGER NOT NULL,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Witness" (
    "hash" TEXT NOT NULL,
    "Witness_merkle_root" TEXT NOT NULL,
    "reference_count" INTEGER NOT NULL,

    CONSTRAINT "Witness_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "WitnessEvent" (
    "Witness_merkle_root" TEXT NOT NULL,
    "Witness_timestamp" TIMESTAMP(3) NOT NULL,
    "Witness_network" TEXT NOT NULL,
    "Witness_smart_contract_address" TEXT NOT NULL,
    "Witness_transaction_hash" TEXT NOT NULL,
    "Witness_sender_account_address" TEXT NOT NULL,

    CONSTRAINT "WitnessEvent_pkey" PRIMARY KEY ("Witness_merkle_root")
);

-- CreateTable
CREATE TABLE "MerkleNodes" (
    "node_hash" TEXT NOT NULL,
    "parent_hash" TEXT,
    "height" INTEGER NOT NULL,
    "is_leaf" BOOLEAN NOT NULL,
    "left_child_hash" TEXT,
    "right_child_hash" TEXT,
    "witnessHash" TEXT,
    "witnessEventWitnessMerkleRoot" TEXT,

    CONSTRAINT "MerkleNodes_pkey" PRIMARY KEY ("node_hash")
);

-- CreateTable
CREATE TABLE "AquaForms" (
    "hash" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "reference_count" INTEGER NOT NULL,

    CONSTRAINT "AquaForms_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Settings" (
    "user_pub_key" TEXT NOT NULL,
    "cli_pub_key" TEXT NOT NULL,
    "cli_priv_key" TEXT NOT NULL,
    "Witness_network" TEXT NOT NULL,
    "Witness_contract_address" TEXT NOT NULL,
    "theme" TEXT NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("user_pub_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiweSession_nonce_key" ON "SiweSession"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "FileNames_fileId_key" ON "FileNames"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "File_hash_key" ON "File"("hash");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userUser_fkey" FOREIGN KEY ("userUser") REFERENCES "User"("user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Latest" ADD CONSTRAINT "Latest_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Latest" ADD CONSTRAINT "Latest_revisionHash_fkey" FOREIGN KEY ("revisionHash") REFERENCES "Revision"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileNames" ADD CONSTRAINT "FileNames_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_hash_fkey" FOREIGN KEY ("hash") REFERENCES "Revision"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_hash_fkey" FOREIGN KEY ("hash") REFERENCES "Revision"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Index" ADD CONSTRAINT "Index_file_hash_fkey" FOREIGN KEY ("file_hash") REFERENCES "File"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_hash_fkey" FOREIGN KEY ("hash") REFERENCES "Revision"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_hash_fkey" FOREIGN KEY ("hash") REFERENCES "Revision"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_Witness_merkle_root_fkey" FOREIGN KEY ("Witness_merkle_root") REFERENCES "WitnessEvent"("Witness_merkle_root") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerkleNodes" ADD CONSTRAINT "MerkleNodes_witnessHash_fkey" FOREIGN KEY ("witnessHash") REFERENCES "Witness"("hash") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerkleNodes" ADD CONSTRAINT "MerkleNodes_witnessEventWitnessMerkleRoot_fkey" FOREIGN KEY ("witnessEventWitnessMerkleRoot") REFERENCES "WitnessEvent"("Witness_merkle_root") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AquaForms" ADD CONSTRAINT "AquaForms_hash_fkey" FOREIGN KEY ("hash") REFERENCES "Revision"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_user_pub_key_fkey" FOREIGN KEY ("user_pub_key") REFERENCES "User"("user") ON DELETE RESTRICT ON UPDATE CASCADE;
