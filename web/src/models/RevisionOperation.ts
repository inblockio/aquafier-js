import { AquaTree } from "aqua-js-sdk";

export interface RevionOperation {
    aquaTree: AquaTree 
    backendUrl : string,
    revision : string,
    nonce : string
}