import { AquaTree, Revision, FileObject } from "aqua-js-sdk";

export interface SaveAquaTree {
  tree: AquaTree;
  fileObject: FileObject[];
}
export interface VerifyRequestBody {
  tree: AquaTree;
  revision: Revision;
  hash: string;
  fileObject: FileObject[];
}


export interface FetchAquaTreeRequest {
  latestRevisionHash: string

}
export interface SettingsRequest {
  user_pub_key: string;
  cli_pub_key: string | null;
  cli_priv_key: string | null;
  witness_network: string | null;
  witness_contract_address: string | null;
  theme: string | null;
  ens_name: string
}
export interface SiweRequest {
  message: string;
  signature: string;
  domain: string;
}



export interface ShareRequest {
  latest: string;
  recipient: string;
  option: string;
  hash: string;
  genesis_hash: string;
}


export interface SessionQuery {
  nonce?: string;
}


export interface DeleteRevision {
  revisionHash: string
}

export interface SaveRevision {
  revision: Revision,
  revisionHash: string
}

export interface AquaNameWithHash {
  name: string,
  hash: string
}
export interface AquaJsonInZip {
  genesis: string,
  name_with_hash: Array<AquaNameWithHash>
}