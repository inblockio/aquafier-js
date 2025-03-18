import { AquaTree, Revision, FileObject } from "aqua-js-sdk";

export interface VerifyRequestBody {
  tree: AquaTree;
  revision: Revision;
  hash: string;
  fileObject: FileObject[];
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