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


  export   interface SessionQuery {
    nonce?: string;
  }