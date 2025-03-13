import { AquaTree, FileObject } from "aqua-js-sdk";

export interface ApiFileInfo {
    // id: number | null,
    // name: string,
    // extension: string,
    //page_data: string,
    fileObject: FileObject[]
    aquaTree: AquaTree | null,
    linkedFileObjects: FileObject[],
    mode: string,
    owner: string
}

