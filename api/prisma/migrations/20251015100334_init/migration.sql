-- CreateTable
CREATE TABLE "public"."users" (
    "address" TEXT NOT NULL,
    "ens_name" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "public"."aqua_templates" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL,
    "created_at_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aqua_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_data" (
    "id" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "filled_value" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."aqua_templates_fields" (
    "id" TEXT NOT NULL,
    "aqua_form_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "is_array" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "is_verifiable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "placeholder" TEXT,
    "support_text" TEXT,
    "default_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aqua_templates_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_attestation_addresses" (
    "id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "trust_level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_attestation_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."siwe_session" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expirationTime" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siwe_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contract" (
    "hash" TEXT NOT NULL,
    "genesis_hash" TEXT,
    "latest" TEXT,
    "sender" TEXT,
    "recipients" TEXT[],
    "option" TEXT,
    "reference_count" INTEGER,
    "file_name" TEXT,
    "receiver_has_deleted" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "public"."latest" (
    "hash" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "template_id" TEXT,
    "is_workflow" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "latest_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "public"."revision" (
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_pkey" PRIMARY KEY ("pubkey_hash")
);

-- CreateTable
CREATE TABLE "public"."file" (
    "file_hash" TEXT NOT NULL,
    "file_location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_pkey" PRIMARY KEY ("file_hash")
);

-- CreateTable
CREATE TABLE "public"."file_index" (
    "file_hash" TEXT NOT NULL,
    "pubkey_hash" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_index_pkey" PRIMARY KEY ("file_hash")
);

-- CreateTable
CREATE TABLE "public"."file_name" (
    "pubkey_hash" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_name_pkey" PRIMARY KEY ("pubkey_hash")
);

-- CreateTable
CREATE TABLE "public"."link" (
    "hash" TEXT NOT NULL,
    "link_type" TEXT,
    "link_require_indepth_verification" BOOLEAN,
    "link_verification_hashes" TEXT[],
    "reference_count" INTEGER,
    "link_file_hashes" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "link_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "public"."signature" (
    "hash" TEXT NOT NULL,
    "signature_digest" TEXT,
    "signature_wallet_address" TEXT,
    "signature_public_key" TEXT,
    "signature_type" TEXT,
    "reference_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "public"."witness" (
    "hash" TEXT NOT NULL,
    "Witness_merkle_root" TEXT,
    "reference_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "witness_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "public"."witness_event" (
    "Witness_merkle_root" TEXT NOT NULL,
    "Witness_timestamp" TEXT,
    "Witness_network" TEXT,
    "Witness_smart_contract_address" TEXT,
    "Witness_transaction_hash" TEXT,
    "Witness_sender_account_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "witness_event_pkey" PRIMARY KEY ("Witness_merkle_root")
);

-- CreateTable
CREATE TABLE "public"."aqua_forms" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "key" TEXT,
    "value" JSONB,
    "type" TEXT,
    "reference_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aqua_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."merkle_nodes" (
    "node_hash" TEXT NOT NULL,
    "parent_hash" TEXT,
    "height" INTEGER,
    "is_leaf" BOOLEAN,
    "left_child_hash" TEXT,
    "right_child_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merkle_nodes_pkey" PRIMARY KEY ("node_hash")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "user_pub_key" TEXT NOT NULL,
    "cli_pub_key" TEXT,
    "cli_priv_key" TEXT,
    "alchemy_key" TEXT NOT NULL DEFAULT 'ZaQtnup49WhU7fxrujVpkFdRz4JaFRtZ',
    "witness_network" TEXT,
    "witness_contract_address" TEXT,
    "theme" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("user_pub_key")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "navigate_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationAttempt" (
    "id" SERIAL NOT NULL,
    "email_or_phone_number" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "nonce" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DNSClaimVerificationOne" (
    "id" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "verification_logs" JSONB NOT NULL,
    "verification_status" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_domain_verified" BOOLEAN NOT NULL DEFAULT true,
    "last_verified" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DNSClaimVerificationOne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "siwe_session_nonce_key" ON "public"."siwe_session"("nonce");

-- CreateIndex
CREATE INDEX "VerificationAttempt_email_or_phone_number_verification_type_idx" ON "public"."VerificationAttempt"("email_or_phone_number", "verification_type", "action");

-- CreateIndex
CREATE INDEX "DNSClaimVerificationOne_wallet_address_idx" ON "public"."DNSClaimVerificationOne"("wallet_address");

-- AddForeignKey
ALTER TABLE "public"."aqua_templates_fields" ADD CONSTRAINT "aqua_templates_fields_aqua_form_id_fkey" FOREIGN KEY ("aqua_form_id") REFERENCES "public"."aqua_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_attestation_addresses" ADD CONSTRAINT "user_attestation_addresses_owner_fkey" FOREIGN KEY ("owner") REFERENCES "public"."users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."latest" ADD CONSTRAINT "latest_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."link" ADD CONSTRAINT "link_hash_fkey" FOREIGN KEY ("hash") REFERENCES "public"."revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."signature" ADD CONSTRAINT "signature_hash_fkey" FOREIGN KEY ("hash") REFERENCES "public"."revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."witness" ADD CONSTRAINT "witness_hash_fkey" FOREIGN KEY ("hash") REFERENCES "public"."revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."witness" ADD CONSTRAINT "witness_Witness_merkle_root_fkey" FOREIGN KEY ("Witness_merkle_root") REFERENCES "public"."witness_event"("Witness_merkle_root") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."aqua_forms" ADD CONSTRAINT "aqua_forms_hash_fkey" FOREIGN KEY ("hash") REFERENCES "public"."revision"("pubkey_hash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settings" ADD CONSTRAINT "settings_user_pub_key_fkey" FOREIGN KEY ("user_pub_key") REFERENCES "public"."users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
