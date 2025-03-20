CREATE TABLE IF NOT EXISTS siwe_sessions (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  nonce TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  -- Using TIMESTAMPTZ for timestamp with time zone
  expiration_time TIMESTAMPTZ -- TIMESTAMPTZ to handle expiration timestamps with time zone
);
CREATE TABLE "User" ("user" pubkey PRIMARY KEY);
CREATE TABLE "Contract" (
  "hash" hash PRIMARY KEY,
  "latest" array,
  "sender" pubkey,
  "receiver" pubkey,
  "option" string,
  "reference_count" int
);
CREATE TABLE "Latest" ("hash" hash PRIMARY KEY, "user" pubkey);
CREATE TABLE "Revision" (
  "hash" hash PRIMARY KEY,
  "user" pubkey,
  "nonce" string,
  "shared" array_pubkey,
  "contract" array,
  "previous" varchar,
  "children" hash_map,
  "local_timestamp" timestamp,
  "Revision_type" string,
  "Verification_leaves" hash_map
);
CREATE TABLE "FileNames" (
  "id" SERIAL PRIMARY KEY,
  "name" text,
  fileId integer,
);
CREATE TABLE "File" (
  "hash" hash PRIMARY KEY,
  "content" utf8_content,
  "file_hash" hash,
  "reference_count" int
);
CREATE TABLE "Link" (
  "hash" hash PRIMARY KEY,
  "link_type" string,
  "link_require_indepth_verification" boolean,
  "link_verification_hash" hash_map,
  "reference_count" int
);
CREATE TABLE "Index" (
  "hash" array,
  "file_hash" hash,
  "uri" URLPath_and_Title,
  "reference_count" int,
  PRIMARY KEY ("hash", "file_hash")
);
CREATE TABLE "Signature" (
  "hash" hash PRIMARY KEY,
  "signature_digest" string,
  "signature_wallet_address" varchar,
  "signature_type" hash,
  "reference_count" int
);
CREATE TABLE "Witness" (
  "hash" hash PRIMARY KEY,
  "Witness_merkle_root" hash,
  "reference_count" int
);
CREATE TABLE "WitnessEvent" (
  "Witness_merkle_root" hash PRIMARY KEY,
  "Witness_timestamp" timestamp,
  "Witness_network" chain_id,
  "Witness_smart_contract_address" hash,
  "Witness_transaction_hash" tx_hash,
  "Witness_sender_account_address" pubkey
);
CREATE TABLE "MerkleNodes" (
  "node_hash" TEXT,
  "parent_hash" TEXT,
  "height" INTEGER,
  "is_leaf" BOOLEAN,
  "left_child_hash" TEXT,
  "right_child_hash" TEXT
);
CREATE TABLE "AquaForms" (
  "hash" hash PRIMARY KEY,
  "key" string,
  "value" object,
  "type" string,
  "reference_count" int
);
CREATE TABLE "Settings" (
  "user_pub_key" pubkey PRIMARY KEY,
  "cli_pub_key" pubkey,
  "cli_priv_key" private_key,
  "Witness_network" chain_id,
  "Witness_contract_address" hash,
  "theme" string
);
ALTER TABLE "Latest"
ADD FOREIGN KEY ("hash") REFERENCES "User" ("user");
ALTER TABLE "Settings"
ADD FOREIGN KEY ("user_pub_key") REFERENCES "User" ("user");
ALTER TABLE "Contract"
ADD FOREIGN KEY ("hash") REFERENCES "User" ("user");
ALTER TABLE "Revision"
ADD FOREIGN KEY ("hash") REFERENCES "Latest" ("hash");
ALTER TABLE "File"
ADD FOREIGN KEY ("hash") REFERENCES "Revision" ("hash");
ALTER TABLE "Signature"
ADD FOREIGN KEY ("hash") REFERENCES "Revision" ("hash");
ALTER TABLE "Witness"
ADD FOREIGN KEY ("hash") REFERENCES "Revision" ("hash");
ALTER TABLE "Link"
ADD FOREIGN KEY ("hash") REFERENCES "Revision" ("hash");
ALTER TABLE "Contract"
ADD FOREIGN KEY ("hash") REFERENCES "Revision" ("hash");
ALTER TABLE "Index"
ADD FOREIGN KEY ("hash") REFERENCES "File" ("hash");
ALTER TABLE "Link"
ADD FOREIGN KEY ("link_verification_hash") REFERENCES "Index" ("hash");
ALTER TABLE "Revision"
ADD FOREIGN KEY ("hash") REFERENCES "Index" ("file_hash");
ALTER TABLE "Witness"
ADD FOREIGN KEY ("Witness_merkle_root") REFERENCES "WitnessEvent" ("Witness_merkle_root");
ALTER TABLE "MerkleNodes"
ADD FOREIGN KEY ("node_hash") REFERENCES "Witness" ("hash");
ALTER TABLE "MerkleNodes"
ADD FOREIGN KEY ("node_hash") REFERENCES "WitnessEvent" ("Witness_merkle_root");
ALTER TABLE "MerkleNodes"
ADD FOREIGN KEY ("node_hash") REFERENCES "MerkleNodes" ("parent_hash");
ALTER TABLE "MerkleNodes"
ADD FOREIGN KEY ("node_hash") REFERENCES "MerkleNodes" ("left_child_hash");
ALTER TABLE "MerkleNodes"
ADD FOREIGN KEY ("node_hash") REFERENCES "MerkleNodes" ("right_child_hash");
ALTER TABLE "AquaForms"
ADD FOREIGN KEY ("hash") REFERENCES "Revision" ("hash");