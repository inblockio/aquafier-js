import { AquaTree, FileObject } from "aquafier-js-sdk";

export interface ApiFileInfo {
    id: number,
    // name: string,
    // extension: string,
    //page_data: string,
    fileObject: FileObject
    aquaTree: AquaTree,
    linkedFileObjects: FileObject[],
    mode: string,
    owner: string
}

