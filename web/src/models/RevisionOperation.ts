import { ApiFileInfo } from "./FileInfo";

export interface RevionOperation {
    apiFileInfo:  ApiFileInfo 
    backendUrl : string,
    revision : string,
    nonce : string
    children?: React.ReactNode
}