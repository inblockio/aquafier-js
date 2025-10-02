-- CreateTable
CREATE TABLE "users" (
    "address" TEXT NOT NULL,
    "ens_name" TEXT,
    "email" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "user_attestation_addresses" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "trust_level" INTEGER NOT NULL,

    CONSTRAINT "user_attestation_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "siwe_session" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationTime" TIMESTAMP(3),

    CONSTRAINT "siwe_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract" (
    "hash" TEXT NOT NULL,
    "genesis_hash" TEXT,
    "latest" TEXT,
    "sender" TEXT,
    "receiver" TEXT,
    "option" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "latest" (
    "hash" TEXT NOT NULL,
    "user" TEXT NOT NULL,

    CONSTRAINT "latest_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "revision" (
    "pubkey_hash" TEXT NOT NULL,
    "nonce" TEXT,
    "shared" TEXT[],
    "contract" TEXT[],
    "previous" TEXT,
    "children" TEXT,
    "local_timestamp" TEXT,
    "revision_type" TEXT,
    "has_content" BOOLEAN NOT NULL DEFAULT false,
    "verification_leaves" TEXT[],

    CONSTRAINT "revision_pkey" PRIMARY KEY ("pubkey_hash")
);

-- CreateTable
CREATE TABLE "file" (
    "hash" TEXT NOT NULL,
    "content" TEXT,
    "file_hash" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "file_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "file_index" (
    "id" TEXT NOT NULL,
    "hash" TEXT[],
    "file_hash" TEXT NOT NULL,
    "uri" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "file_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link" (
    "hash" TEXT NOT NULL,
    "link_type" TEXT,
    "link_require_indepth_verification" BOOLEAN,
    "link_verification_hashes" TEXT[],
    "reference_count" INTEGER,
    "link_file_hashes" TEXT[],

    CONSTRAINT "link_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "signature" (
    "hash" TEXT NOT NULL,
    "signature_digest" TEXT,
    "signature_wallet_address" TEXT,
    "signature_public_key" TEXT,
    "signature_type" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "signature_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "witness" (
    "hash" TEXT NOT NULL,
    "Witness_merkle_root" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "witness_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "witness_event" (
    "Witness_merkle_root" TEXT NOT NULL,
    "Witness_timestamp" TEXT,
    "Witness_network" TEXT,
    "Witness_smart_contract_address" TEXT,
    "Witness_transaction_hash" TEXT,
    "Witness_sender_account_address" TEXT,

    CONSTRAINT "witness_event_pkey" PRIMARY KEY ("Witness_merkle_root")
);

-- CreateTable
CREATE TABLE "merkle_nodes" (
    "node_hash" TEXT NOT NULL,
    "parent_hash" TEXT,
    "height" INTEGER,
    "is_leaf" BOOLEAN,
    "left_child_hash" TEXT,
    "right_child_hash" TEXT,

    CONSTRAINT "merkle_nodes_pkey" PRIMARY KEY ("node_hash")
);

-- CreateTable
CREATE TABLE "aqua_forms" (
    "hash" TEXT NOT NULL,
    "key" TEXT,
    "value" JSONB,
    "type" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "aqua_forms_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "settings" (
    "user_pub_key" TEXT NOT NULL,
    "cli_pub_key" TEXT,
    "cli_priv_key" TEXT,
    "witness_network" TEXT,
    "witness_contract_address" TEXT,
    "theme" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("user_pub_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "siwe_session_nonce_key" ON "siwe_session"("nonce");

-- AddForeignKey
ALTER TABLE "user_attestation_addresses" ADD CONSTRAINT "user_attestation_addresses_owner_fkey" FOREIGN KEY ("owner") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latest" ADD CONSTRAINT "latest_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_index" ADD CONSTRAINT "file_index_id_fkey" FOREIGN KEY ("id") REFERENCES "file"("hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link" ADD CONSTRAINT "link_hash_fkey" FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signature" ADD CONSTRAINT "signature_hash_fkey" FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "witness" ADD CONSTRAINT "witness_hash_fkey" FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "witness" ADD CONSTRAINT "witness_Witness_merkle_root_fkey" FOREIGN KEY ("Witness_merkle_root") REFERENCES "witness_event"("Witness_merkle_root") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aqua_forms" ADD CONSTRAINT "aqua_forms_hash_fkey" FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_pub_key_fkey" FOREIGN KEY ("user_pub_key") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
