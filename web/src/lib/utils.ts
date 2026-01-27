import { ApiFileInfo } from '@/models/FileInfo'
import { IAquaCertFileInfoProcessResult } from '@/types/types'
import { reorderRevisionsInAquaTree } from '@/utils/functions'
import { Revision } from 'aqua-js-sdk'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs))
}


export function getCorrectUTF8JSONString(fileContent: any, tabs?: number): Uint8Array {
      // Handle Uint8Array - return as is
      if (fileContent instanceof Uint8Array) {
            return fileContent
      }

      // Handle ArrayBuffer - convert to Uint8Array
      if (fileContent instanceof ArrayBuffer) {
            return new Uint8Array(fileContent)
      }

      // Handle string - encode to UTF-8
      if (typeof fileContent === 'string') {
            const encoder = new TextEncoder()
            return encoder.encode(fileContent)
      }

      // Handle other types (objects, arrays, etc.) - stringify then encode
      const jsonContent = tabs
            ? JSON.stringify(fileContent, null, tabs)
            : JSON.stringify(fileContent)
      const encoder = new TextEncoder()
      return encoder.encode(jsonContent)
}


export function getLinkedFiles(fileInfo: ApiFileInfo): IAquaCertFileInfoProcessResult {
      const mainAquaTree = fileInfo.aquaTree!
      let revisionHashes = reorderRevisionsInAquaTree(fileInfo.aquaTree!)
      let linkedRevisions: Revision[] = []
      let linkedVerificationHashes: string[] = []
      let genRevision = mainAquaTree.revisions[revisionHashes[0]]

      let res: IAquaCertFileInfoProcessResult = {
            data: {
                  genesisRevision: genRevision,
                  linkedRevisions,
                  linkedVerificationHashes,
            }
      }
      
      for (let i = 2; i < revisionHashes.length; i++) {
            const revisionHash = revisionHashes[i];
            const revision = mainAquaTree?.revisions[revisionHash]
            if (revision?.revision_type === "link") {
                  linkedRevisions.push(revision)
                  linkedVerificationHashes = linkedVerificationHashes.concat(revision.link_verification_hashes!)
            }
            if(revision.revision_type === "signature"){
                  break;
            }
      }

      res.data.linkedRevisions = linkedRevisions
      res.data.linkedVerificationHashes = linkedVerificationHashes

      return res
}