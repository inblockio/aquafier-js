import { AquaTree, Revision, FileObject } from "aquafier-js-sdk";

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