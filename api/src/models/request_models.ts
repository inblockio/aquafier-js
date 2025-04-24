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



// Define the field type for the "fields" array
export interface AquaFormFieldRequest {
  id: string;
  label: string;
  name: string;
  type: string;
  required: boolean;
}

// Define the main data model
export interface AquaFormRequest {
  id: string;
  name: string;
  title: string;
  public : boolean;
  fields: AquaFormFieldRequest[];
}


export interface FetchAquaTreeRequest {
  latestRevisionHash: string

}
export interface UserAttestationAddressesRequest {
  address: string;
  trust_level: number;
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