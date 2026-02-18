import { AquaTree, FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk'
import { ApiFileInfo } from '../models/FileInfo'
import { ERROR_TEXT, ERROR_UKNOWN } from './constants'

export const isWorkFlowData = (aquaTree: AquaTree, systemAndUserWorkFlow: string[]): { isWorkFlow: boolean; workFlow: string } => {
      const falseResponse = {
            isWorkFlow: false,
            workFlow: '',
      }
      // console.log("System workflows: ", systemAndUserWorkFlow)

      //order revision in aqua tree
      const aquaTreeRevisionsOrderd = OrderRevisionInAquaTree(aquaTree)
      const allHashes = Object.keys(aquaTreeRevisionsOrderd.revisions)
      if (allHashes.length <= 1) {
            // (`Aqua tree has one revision`)
            return falseResponse
      }
      const secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
      if (!secondRevision) {
            // (`Aqua tree has second revision not found`)
            return falseResponse
      }
      if (secondRevision.revision_type == 'link') {
            //get the  system aqua tree name
            const secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
            // (` second hash used ${allHashes[1]}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

            if (secondRevision.link_verification_hashes == undefined) {
                  // (`link verification hash is undefined`)
                  return falseResponse
            }
            const revisionHash = secondRevision.link_verification_hashes[0]
            const name = aquaTreeRevisionsOrderd.file_index[revisionHash]
            // (`--  name ${name}  all hashes ${revisionHash}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

            // if (systemAndUserWorkFlow.map((e)=>e.replace(".json", "")).includes(name)) {

            let nameWithoutJson = '--error--'
            if (name) {
                  nameWithoutJson = name.replace('.json', '')
                  if (systemAndUserWorkFlow.map(e => e.replace('.json', '')).includes(nameWithoutJson)) {
                        return {
                              isWorkFlow: true,
                              workFlow: nameWithoutJson,
                        }
                  }
            }
            return {
                  isWorkFlow: false,
                  workFlow: '',
            }
      }
      // (`Aqua tree has second revision is of type ${secondRevision.revision_type}`)

      return falseResponse
}

export function allLinkRevisionHashes(aquaTree: AquaTree): Array<string> {
      const hashesWithLinkRevisions: Array<string> = []
      const allHashes = Object.keys(aquaTree.revisions)
      for (const hashItem of allHashes) {
            const revision = aquaTree.revisions[hashItem]
            if (revision.revision_type == 'link') {
                  hashesWithLinkRevisions.push(hashItem)
            }
      }

      return hashesWithLinkRevisions
}
export function isAquaTree(content: any): boolean {
      let json = null
      let isJsonAlready = true
      if (typeof content === 'string') {
            isJsonAlready = false
      }
      if (isJsonAlready) {
            json = content
      } else {
            try {
                  json = JSON.parse(content)
            } catch (e) {
                  return false
            }
      }
      // Check if content has the properties of an AquaTree
      return json && typeof json === 'object' && 'revisions' in json && 'file_index' in json
}

export function parseAquaTreeContent(content: any): any {
      // If content is already an object with revisions, return it
      if (content && typeof content === 'object' && 'revisions' in content) {
            return content
      }
      // If content is a string, try to parse it
      if (typeof content === 'string') {
            try {
                  return JSON.parse(content)
            } catch (e) {
                  console.error('Failed to parse AquaTree content:', e)
                  return null
            }
      }
      return content
}

export function getAquaTreeFileName(aquaTree: AquaTree): string {

      let mainAquaHash = ''
      const revisionHashes = Object.keys(aquaTree!.revisions!)
      for (const revisionHash of revisionHashes) {
            const revisionData = aquaTree!.revisions![revisionHash]
            if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == '') {
                  mainAquaHash = revisionHash
                  break
            }
      }

      return aquaTree!.file_index[mainAquaHash] ?? ''
}


export function getAquatreeObject(content: any): AquaTree {
      if (typeof content === 'string') {
            return JSON.parse(content)
      }
      return content
}


export function getAquaTreeFileObject(fileInfo: ApiFileInfo): FileObject | undefined {
      let mainAquaFileName = ''
      let mainAquaHash = ''
      // fetch the genesis
      const revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!)
      for (const revisionHash of revisionHashes) {
            const revisionData = fileInfo.aquaTree!.revisions![revisionHash]
            if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == '') {
                  mainAquaHash = revisionHash
                  break
            }
      }
      mainAquaFileName = fileInfo.aquaTree!.file_index[mainAquaHash]

      return fileInfo.fileObject.find(e => e.fileName == mainAquaFileName) || fileInfo?.linkedFileObjects?.find(e => e.fileName === mainAquaFileName)
}

export function getGenesisHash(aquaTree: AquaTree): string | null {
      let aquaTreeGenesisHash: string | null = null
      const allAquuaTreeHashes = Object.keys(aquaTree!.revisions)

      for (const hash of allAquuaTreeHashes) {
            const revisionItem = aquaTree!.revisions[hash]
            if (revisionItem.previous_verification_hash == '' || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {
                  aquaTreeGenesisHash = hash //revisionItem.previous_verification_hash
                  break
            }
      }

      return aquaTreeGenesisHash
}

/**
 * Validates an AquaTree structure
 * @param tree The AquaTree to validate
 * @returns boolean indicating whether the tree is valid
 */
export function validateAquaTree(tree: AquaTree): [boolean, string] {
      // Check if tree is null or undefined
      if (!tree) {
            return [false, 'aqua tree is null']
      }

      // Check if required top-level properties exist
      if (!tree.revisions || !tree.file_index) {
            return [false, 'revsions and file index must exist in an aqua tree']
      }

      // Check if revisions is a valid object
      if (typeof tree.revisions !== 'object' || Array.isArray(tree.revisions)) {
            return [false, 'revision does not contain revisions']
      }

      // Check if file_index is a valid object
      if (typeof tree.file_index !== 'object' || Array.isArray(tree.file_index)) {
            return [false, 'file index does not contain values ']
      }

      // Validate each revision
      for (const hash in tree.revisions) {
            const revision = tree.revisions[hash]

            // (`Revision --  ${JSON.stringify(revision)}`)
            // Check required fields for all revisions
            if (revision.previous_verification_hash === undefined || revision.previous_verification_hash === null) {
                  return [false, 'A revision must contain previous_verification_hash']
            }
            if (revision.local_timestamp === undefined || revision.local_timestamp === null) {
                  return [false, 'A revision must contain local_timestamp ']
            }
            if (!revision.revision_type === undefined || revision.local_timestamp === null) {
                  return [false, 'A revision must contain  revision_type']
            }

            // Validate revision_type is one of the allowed values
            const validRevisionTypes = ['file', 'witness', 'signature', 'form', 'link']
            if (!validRevisionTypes.includes(revision.revision_type)) {
                  return [false, `unknown revision type ${revision.revision_type}`]
            }

            // Check type-specific required fields
            // Check type-specific required fields
            switch (revision.revision_type) {
                  case 'file':
                        if (revision.file_hash === undefined || revision.file_hash === null) {
                              return [false, 'file revision must contain file_hash']
                        }
                        if (revision.file_nonce === undefined || revision.file_nonce === null) {
                              return [false, 'file revision must contain file_nonce']
                        }
                        break
                  case 'witness':
                        if (revision.witness_merkle_root === undefined || revision.witness_merkle_root === null) {
                              return [false, 'witness revision must contain witness_merkle_root']
                        }
                        if (revision.witness_timestamp === undefined || revision.witness_timestamp === null) {
                              return [false, 'witness revision must contain witness_timestamp']
                        }
                        if (revision.witness_network === undefined || revision.witness_network === null) {
                              return [false, 'witness revision must contain witness_network']
                        }
                        if (revision.witness_smart_contract_address === undefined || revision.witness_smart_contract_address === null) {
                              return [false, 'witness revision must contain witness_smart_contract_address']
                        }
                        if (revision.witness_transaction_hash === undefined || revision.witness_transaction_hash === null) {
                              return [false, 'witness revision must contain witness_transaction_hash']
                        }
                        if (revision.witness_sender_account_address === undefined || revision.witness_sender_account_address === null) {
                              return [false, 'witness revision must contain witness_sender_account_address']
                        }
                        break
                  case 'signature':
                        if (revision.signature === undefined || revision.signature === null) {
                              return [false, 'signature revision must contain signature']
                        }
                        if (revision.signature_public_key === undefined || revision.signature_public_key === null) {
                              return [false, 'signature revision must contain signature_public_key']
                        }
                        if (revision.signature_type === undefined || revision.signature_type === null) {
                              return [false, 'signature revision must contain signature_type']
                        }
                        break
                  case 'link':
                        if (revision.link_type === undefined || revision.link_type === null) {
                              return [false, 'link revision must contain link_type']
                        }
                        if (revision.link_verification_hashes === undefined || revision.link_verification_hashes === null) {
                              return [false, 'link revision must contain link_verification_hashes']
                        }
                        if (!Array.isArray(revision.link_verification_hashes)) {
                              return [false, "link revision's link_verification_hashes must be an array"]
                        }
                        if (revision.link_verification_hashes.length === 0) {
                              return [false, "link revision's link_verification_hashes must not be empty"]
                        }
                        break
            }
      }

      // Check if the file_index contains at least one entry
      if (Object.keys(tree.file_index).length === 0) {
            return [false, 'file_index is empty']
      }

      // If all checks pass, return true
      return [true, 'valid aqua tree']
}

export function getFileNameWithDeepLinking(aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): string {
      const revision = aquaTree.revisions[revisionHash]

      if (revision.previous_verification_hash.length == 0) {
            return aquaTree.file_index[revisionHash]
      }
      if (revision.revision_type == 'link') {
            const isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
            if (isDeepLink == null) {
                  return ERROR_UKNOWN
            }
            if (isDeepLink) {
                  // before returning deep link we traverse the current  aqua tree
                  const aquaTreeFiles = fileObject.filter(file => isAquaTree(file.fileContent))
                  if (aquaTreeFiles.length > 0) {
                        const aquaTreePick = aquaTreeFiles.find(e => {
                              const tree: AquaTree = e.fileContent as AquaTree
                              const allHashes = Object.keys(tree.revisions)
                              return allHashes.includes(revision.link_verification_hashes![0]!)
                        })
                        if (aquaTreePick) {
                              const tree: AquaTree = aquaTreePick.fileContent as AquaTree
                              const genesisHash = getGenesisHash(tree)
                              if (genesisHash) {
                                    const fileName = tree.file_index[genesisHash]
                                    if (fileName) {
                                          return fileName
                                    }
                              }
                        }
                  }

                  return ERROR_TEXT
            } else {
                  return fetchLinkedFileName(aquaTree, revision)
            }
      }

      return ERROR_TEXT
}
export function isDeepLinkRevision(aquaTree: AquaTree, revisionHash: string): boolean | null {
      const revisionData = aquaTree.revisions[revisionHash]

      if (revisionData) {
            const indexData = aquaTree.file_index[revisionData.link_verification_hashes![0]]
            if (indexData) {
                  return false
            }
            return true
      }
      return null
}

export function fetchLinkedFileName(aquaTree: AquaTree, revision: Revision): string {
      if (revision.link_verification_hashes == undefined) {
            return ERROR_TEXT
      }
      const lonkedHash = revision.link_verification_hashes![0]
      // (`fetchLinkedFileName ${lonkedHash}`)
      if (lonkedHash == undefined) {
            // (`fetchLinkedFileName ${lonkedHash} not found in link_verification_hashes`)
            return ERROR_TEXT
      }
      const name = aquaTree.file_index[lonkedHash]
      if (name == undefined) {
            // (`fetchLinkedFileName ${lonkedHash} not found in file_index`)
            return ERROR_TEXT
      }
      return name
}

export const getFileName = (aquaTree: AquaTree) => {
      const hashes = Object.keys(aquaTree!.revisions)
      let fileIndexhash = ''
      for (const item of hashes) {
            const revision = aquaTree!.revisions[item]
            if (revision.previous_verification_hash == null || revision.previous_verification_hash == '') {
                  fileIndexhash = item
                  break
            }
      }

      const name = aquaTree!.file_index[fileIndexhash]
      //  (`getFileName ${name} from hash ${fileIndexhash}`)
      return name
}

export const getLastRevisionVerificationHash = (aquaTree: AquaTree) => {
      const orderedRevisions = OrderRevisionInAquaTree(aquaTree)
      const revisonHashes = Object.keys(orderedRevisions.revisions)
      const hash = revisonHashes[revisonHashes.length - 1]
      return hash
}

export const reorderRevisionsInAquaTree = (aquaTree: AquaTree): string[] => {
      if (!aquaTree.revisions || Object.keys(aquaTree.revisions).length === 0) {
            return []
      }

      const revisions = aquaTree.revisions
      const orderedHashes: string[] = []

      // Find genesis revision (one with empty previous_hash)
      let genesisHash: string | null = null
      for (const [hash, revision] of Object.entries(revisions)) {
            if (!revision.previous_hash || revision.previous_hash === '') {
                  genesisHash = hash
                  break
            }
      }

      if (!genesisHash) {
            // If no genesis found, return all hashes in original order
            return Object.keys(revisions)
      }

      // Build ordered chain starting from genesis
      let currentHash: string | null = genesisHash
      const processedHashes = new Set<string>()

      while (currentHash && !processedHashes.has(currentHash)) {
            const currentRevision = revisions[currentHash]
            if (!currentRevision) break

            // Add current hash to ordered list
            orderedHashes.push(currentHash)
            processedHashes.add(currentHash)

            // Find next revision that has this hash as previous_hash
            let nextHash: string | null = null
            for (const [hash, revision] of Object.entries(revisions)) {
                  if (revision.previous_hash === currentHash && !processedHashes.has(hash)) {
                        nextHash = hash
                        break
                  }
            }
            currentHash = nextHash
      }

      // Add any remaining hashes that weren't part of the main chain
      for (const hash of Object.keys(revisions)) {
            if (!processedHashes.has(hash)) {
                  orderedHashes.push(hash)
            }
      }

      // Return array of ordered hashes
      return orderedHashes
}
