-- CreateTable
CREATE TABLE "users" (
    "address" TEXT NOT NULL,
    "ens_name" TEXT,
    "email" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "aqua_templates" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL,

    CONSTRAINT "aqua_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aqua_templates_fields" (
    "id" TEXT NOT NULL,
    "aqua_form_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "is_array" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "aqua_templates_fields_pkey" PRIMARY KEY ("id")
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
    "file_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "latest" (
    "hash" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "template_id" TEXT,
    "is_workflow" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "latest_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "revision" (
    "pubkey_hash" TEXT NOT NULL,
    "nonce" TEXT,
    "file_hash" TEXT,
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
    "file_hash" TEXT NOT NULL,
    "file_location" TEXT NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("file_hash")
);

-- CreateTable
CREATE TABLE "file_index" (
    "file_hash" TEXT NOT NULL,
    "pubkey_hash" TEXT[],

    CONSTRAINT "file_index_pkey" PRIMARY KEY ("file_hash")
);

-- CreateTable
CREATE TABLE "file_name" (
    "pubkey_hash" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,

    CONSTRAINT "file_name_pkey" PRIMARY KEY ("pubkey_hash")
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
CREATE TABLE "aqua_forms" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "key" TEXT,
    "value" JSONB,
    "type" TEXT,
    "reference_count" INTEGER,

    CONSTRAINT "aqua_forms_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "settings" (
    "user_pub_key" TEXT NOT NULL,
    "cli_pub_key" TEXT,
    "cli_priv_key" TEXT,
    "alchemy_key" TEXT NOT NULL DEFAULT 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ',
    "witness_network" TEXT,
    "witness_contract_address" TEXT,
    "theme" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("user_pub_key")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "navigate_to" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "siwe_session_nonce_key" ON "siwe_session"("nonce");

-- AddForeignKey
ALTER TABLE "aqua_templates_fields" ADD CONSTRAINT "aqua_templates_fields_aqua_form_id_fkey" FOREIGN KEY ("aqua_form_id") REFERENCES "aqua_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_attestation_addresses" ADD CONSTRAINT "user_attestation_addresses_owner_fkey" FOREIGN KEY ("owner") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latest" ADD CONSTRAINT "latest_user_fkey" FOREIGN KEY ("user") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

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
