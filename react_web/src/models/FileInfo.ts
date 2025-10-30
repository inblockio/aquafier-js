import { AquaTree, FileObject } from 'aqua-js-sdk'

export interface ApiFileInfo {
      // id: number | null,
      // name: string,
      // extension: string,
      //page_data: string,
      fileObject: FileObject[]
      aquaTree: AquaTree | null
      linkedFileObjects: FileObject[]
      mode: string
      owner: string
}

export interface ClaimInformation {
      isClaimValid: boolean
      claimInformation: Record<string, string>
      walletAddress: string | null
      latestRevisionHash: string | null
      genesisHash: string | null
}

export interface IAttestationEntry {
      walletAddress: string
      context: string
      createdAt: string
      nonce: string
      file: ApiFileInfo
}
