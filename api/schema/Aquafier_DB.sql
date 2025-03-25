-- PostgreSQL Schema Creation Script

-- Create User table
CREATE TABLE "user" (
    "user" VARCHAR(255) PRIMARY KEY
);

-- Create SiweSession table
CREATE TABLE "siwe_session" (
    "id" SERIAL PRIMARY KEY,
    "address" VARCHAR(255) NOT NULL,
    "nonce" VARCHAR(255) UNIQUE NOT NULL,
    "issued_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expiration_time" TIMESTAMP
);

-- Create Contract table
CREATE TABLE "contract" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "latest" TEXT,
    "sender" VARCHAR(255),
    "receiver" VARCHAR(255),
    "option" VARCHAR(255),
    "reference_count" INTEGER
);

-- Create Latest table
CREATE TABLE "latest" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "user" VARCHAR(255) NOT NULL,
    FOREIGN KEY ("user") REFERENCES "user"("user")
);

-- Create Revision table
CREATE TABLE "revision" (
    "pubkey_hash" VARCHAR(255) PRIMARY KEY,
    "nonce" VARCHAR(255),
    "shared" TEXT[],
    "contract" TEXT[],
    "previous" VARCHAR(255),
    "children" VARCHAR(255),
    "local_timestamp" VARCHAR(255),
    "revision_type" VARCHAR(255),
    "has_content" BOOLEAN DEFAULT false,
    "verification_leaves" TEXT[]
);

-- Create File table
CREATE TABLE "file" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "content" TEXT,
    "file_hash" VARCHAR(255),
    "reference_count" INTEGER
);

-- Create FileIndex table
CREATE TABLE "file_index" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hash" TEXT[],
    "file_hash" VARCHAR(255),
    "uri" VARCHAR(255),
    "reference_count" INTEGER,
    FOREIGN KEY ("id") REFERENCES "file"("hash")
);

-- Create Link table
CREATE TABLE "link" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "link_type" VARCHAR(255),
    "link_require_indepth_verification" BOOLEAN,
    "link_verification_hashes" TEXT[],
    "reference_count" INTEGER,
    "link_file_hashes" TEXT[],
    FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash")
);

-- Create Signature table
CREATE TABLE "signature" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "signature_digest" TEXT,
    "signature_wallet_address" VARCHAR(255),
    "signature_public_key" VARCHAR(255),
    "signature_type" VARCHAR(255),
    "reference_count" INTEGER,
    FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash")
);

-- Create WitnessEvent table
CREATE TABLE "witness_event" (
    "witness_merkle_root" VARCHAR(255) PRIMARY KEY,
    "witness_timestamp" VARCHAR(255),
    "witness_network" VARCHAR(255),
    "witness_smart_contract_address" VARCHAR(255),
    "witness_transaction_hash" VARCHAR(255),
    "witness_sender_account_address" VARCHAR(255)
);

-- Create Witness table
CREATE TABLE "witness" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "witness_merkle_root" VARCHAR(255),
    "reference_count" INTEGER,
    FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash"),
    FOREIGN KEY ("witness_merkle_root") REFERENCES "witness_event"("witness_merkle_root")
);

-- Create MerkleNodes table
CREATE TABLE "merkle_nodes" (
    "node_hash" VARCHAR(255) PRIMARY KEY,
    "parent_hash" VARCHAR(255),
    "height" INTEGER,
    "is_leaf" BOOLEAN,
    "left_child_hash" VARCHAR(255),
    "right_child_hash" VARCHAR(255)
);

-- Create AquaForms table
CREATE TABLE "aqua_forms" (
    "hash" VARCHAR(255) PRIMARY KEY,
    "key" VARCHAR(255),
    "value" JSONB,
    "type" VARCHAR(255),
    "reference_count" INTEGER,
    FOREIGN KEY ("hash") REFERENCES "revision"("pubkey_hash")
);

-- Create Settings table
CREATE TABLE "settings" (
    "user_pub_key" VARCHAR(255) PRIMARY KEY,
    "cli_pub_key" VARCHAR(255),
    "cli_priv_key" VARCHAR(255),
    "witness_network" VARCHAR(255),
    "witness_contract_address" VARCHAR(255),
    "theme" VARCHAR(255),
    FOREIGN KEY ("user_pub_key") REFERENCES "user"("user")
);