import { ApiFileInfo, ClaimInformation } from '@/models/FileInfo'
import { Divergence, RevisionsComparisonResult } from '../models/revision_merge'
import { AquaTree, FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk'
import { ERROR_TEXT, ERROR_UKNOWN } from './constants'
import { DNSProof, IIdentityClaimDetails, SummaryDetailsDisplayData } from '@/types/types'
import { IContractInformation } from '@/types/contract_workflow'

export function analyzeAndMergeRevisions(existingRevisions: string[], upcomingRevisions: string[]): RevisionsComparisonResult {
      // Sort the arrays
      const sortedExistingRevisions = [...existingRevisions] //.sort();
      const sortedUpcomingRevisions = [...upcomingRevisions] //.sort();

      // Check for divergence
      const divergences: Divergence[] = []
      const maxLength = Math.max(sortedExistingRevisions.length, sortedUpcomingRevisions.length)

      let lastIdenticalRevision: string | null = null

      for (let i = 0; i < maxLength; i++) {
            const existingRevisionHash = sortedExistingRevisions[i] || null
            const upcomingRevisionHash = sortedUpcomingRevisions[i] || null

            if (existingRevisionHash !== upcomingRevisionHash) {
                  divergences.push({
                        index: i,
                        existingRevisionHash,
                        upcomingRevisionHash,
                  })
            } else if (existingRevisionHash && upcomingRevisionHash) {
                  lastIdenticalRevision = existingRevisionHash // Update if they match
            }
      }
      // Merge arrays without duplicates
      const mergedArray = Array.from(new Set([...sortedExistingRevisions, ...sortedUpcomingRevisions]))

      // Properties to check
      const identical = divergences.length === 0 // True if no divergences
      const sameLength = sortedExistingRevisions.length === sortedUpcomingRevisions.length

      // Return results
      return {
            divergences,
            mergedArray,
            identical,
            sameLength,
            existingRevisionsLength: sortedExistingRevisions.length,
            upcomingRevisionsLength: sortedUpcomingRevisions.length,
            lastIdenticalRevisionHash: lastIdenticalRevision,
      }
}






export function getAquaTreeFileName(aquaTree: AquaTree): string {

    // ('((((((((( getAquaTreeFileName aquaTree'+ JSON.stringify(aquaTree, null, 4)    )
      let mainAquaHash = ''
      // fetch the genesis
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

      return fileInfo.fileObject.find(e => e.fileName == mainAquaFileName)
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


export function isAquaTree(content: any): boolean {
      // Check if content has the properties of an AquaTree
      return content && typeof content === 'object' && 'revisions' in content && 'file_index' in content
}



/**
 * Validates an AquaTree object to ensure all required properties exist and are valid
 * @param tree The AquaTree object to validate
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



export const getLastRevisionVerificationHash = (aquaTree: AquaTree) => {
      const orderedRevisions = OrderRevisionInAquaTree(aquaTree)
      const revisonHashes = Object.keys(orderedRevisions.revisions)
      const hash = revisonHashes[revisonHashes.length - 1]
      return hash
}



export function getLatestApiFileInfObject(jsonArray: ApiFileInfo[]): ApiFileInfo | null {
      if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
            return null
      }

      let latestObject: ApiFileInfo | null = null
      let latestTimestamp = ''

      jsonArray.forEach(obj => {
            // Navigate through the nested structure to find revisions
            const aquaTree = obj.aquaTree
            if (aquaTree && aquaTree.revisions) {
                  // Get all revision keys and check their timestamps
                  Object.keys(aquaTree.revisions).forEach(revisionKey => {
                        const revision = aquaTree.revisions[revisionKey]
                        const timestamp = revision.local_timestamp

                        // Compare timestamps (they're in YYYYMMDDHHMMSS format, so string comparison works)
                        if (timestamp > latestTimestamp) {
                              latestTimestamp = timestamp
                              latestObject = obj
                        }
                  })
            }
      })

      return latestObject
}


export const extractDNSClaimInfo = (
      record: string
): {
      walletAddress: string
      timestamp: number
      expiration: number
      signature: string
} => {
      const [walletAddress, timestamp, expiration, signature] = record.split('&').map(e => e.split('=')[1])
      return {
            walletAddress,
            timestamp: Number(timestamp),
            expiration: Number(expiration),
            signature,
      }
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


const getSignatureRevionHashes = (hashesToLoopPar: Array<string>, selectedFileInfo: ApiFileInfo): Array<SummaryDetailsDisplayData> => {
      const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

      for (let i = 0; i < hashesToLoopPar.length; i += 3) {
            const batch = hashesToLoopPar.slice(i, i + 3)
          // (`Processing batch ${i / 3 + 1}:`, batch);

            let signaturePositionCount = 0
            const hashSigPosition = batch[0] ?? ''
            const hashSigRev = batch[1] ?? ''
            const hashSigMetamak = batch[2] ?? ''
            let walletAddress = ''

            if (hashSigPosition.length > 0) {
                  const allAquaTrees = selectedFileInfo?.fileObject.filter(e => isAquaTree(e.fileContent))

                  const hashSigPositionHashString = selectedFileInfo!.aquaTree!.revisions[hashSigPosition].link_verification_hashes![0]
                  if (allAquaTrees) {
                        for (const anAquaTreeFileObject of allAquaTrees) {
                              const anAquaTree: AquaTree = anAquaTreeFileObject.fileContent as AquaTree
                              const allHashes = Object.keys(anAquaTree.revisions)
                              if (allHashes.includes(hashSigPositionHashString)) {
                                    const revData = anAquaTree.revisions[hashSigPositionHashString]
                                    signaturePositionCount = getHighestFormIndex(revData) + 1 // sinature count is 0 base

                                    break
                              } else {
                                  // (`allHashes ${allHashes} does not incude ${hashSigPositionHashString} `)
                              }
                        }
                  }
            }

            const metaMaskRevision = selectedFileInfo!.aquaTree!.revisions[hashSigMetamak]
            if (metaMaskRevision) {
                  walletAddress = metaMaskRevision.signature_wallet_address ?? ''
            }
            const data: SummaryDetailsDisplayData = {
                  revisionHashWithSignaturePositionCount: signaturePositionCount,
                  revisionHashWithSignaturePosition: hashSigPosition,
                  revisionHashWithSinatureRevision: hashSigRev,
                  revisionHashMetamask: hashSigMetamak,
                  walletAddress: walletAddress,
            }

            signatureRevionHashes.push(data)
      }

      return signatureRevionHashes
}

export const processContractInformation = (selectedFileInfo: ApiFileInfo): IContractInformation => {
      if (!selectedFileInfo) {
            // Return default values if no file info is provided
            return {
                  firstRevisionData: {} as Revision,
                  fileNameData: '',
                  creatorEthereumSignatureRevisionData: undefined,
                  contractCreatorAddress: '--error--',
                  isWorkFlowComplete: [],
                  signatureRevisionHashes: [],
            }
      }

      const orderedTree = OrderRevisionInAquaTree(selectedFileInfo.aquaTree!)
      const revisions = orderedTree.revisions
      const revisionHashes = Object.keys(revisions)

      const firstHash: string = revisionHashes[0]
      const firstRevision: Revision = selectedFileInfo.aquaTree!.revisions[firstHash]

      const pdfHash = revisionHashes[2]
      const thirdRevision: Revision = selectedFileInfo.aquaTree!.revisions[pdfHash]
      const hashOfLinkedDocument = thirdRevision.link_verification_hashes![0]!
      const fileName = selectedFileInfo.aquaTree!.file_index[hashOfLinkedDocument]

      const creatorSignatureHash = revisionHashes[3]
      const signatureRevision: Revision | undefined = selectedFileInfo.aquaTree!.revisions[creatorSignatureHash]
      const contractCreatorAddress = signatureRevision?.revision_type === 'signature' ? (signatureRevision.signature_wallet_address ?? '--error--') : '--error--'

      let fourthItemHashOnwards: string[] = []
      let signatureRevisionHashes: SummaryDetailsDisplayData[] = []
      const signers: string[] = firstRevision.forms_signers.split(',').map((e: string) => e.trim())

      if (revisionHashes.length > 4) {
            fourthItemHashOnwards = revisionHashes.slice(4)
            signatureRevisionHashes = getSignatureRevionHashes(fourthItemHashOnwards, selectedFileInfo)

            const signatureRevisionHashesDataAddress = signatureRevisionHashes.map(e => e.walletAddress)
            const remainingSigners = signers.filter(item => !signatureRevisionHashesDataAddress.includes(item))

            // verifyAquaTreeRevisions(selectedFileInfo);

            return {
                  firstRevisionData: firstRevision,
                  fileNameData: fileName,
                  creatorEthereumSignatureRevisionData: signatureRevision,
                  contractCreatorAddress,
                  isWorkFlowComplete: remainingSigners,
                  signatureRevisionHashes,
            }
      }

      // verifyAquaTreeRevisions(selectedFileInfo);

      return {
            firstRevisionData: firstRevision,
            fileNameData: fileName,
            creatorEthereumSignatureRevisionData: signatureRevision,
            contractCreatorAddress,
            isWorkFlowComplete: signers,
            signatureRevisionHashes,
      }
}

export const processSimpleWorkflowClaim = (selectedFileInfo: ApiFileInfo): ClaimInformation => {
      const _aquaTree = selectedFileInfo.aquaTree!
      const aquaTree = OrderRevisionInAquaTree(_aquaTree)
      const revisionHashes = Object.keys(aquaTree.revisions)
      const claimInformation: Record<string, string> = {}
      const firstRevisionHash = revisionHashes[0]
      const lastRevisionHash = revisionHashes[revisionHashes.length - 1]
      const firstRevision = aquaTree.revisions[firstRevisionHash]
      const firstRevisionKeys = Object.keys(firstRevision)

      const mustContainkeys = [
            'forms_type',
            // 'forms_wallet_address',
            // 'forms_claim_context',
      ]
      const isClaimValid = mustContainkeys.every(key => firstRevisionKeys.includes(key))

      if (!isClaimValid) {
            return {
                  isClaimValid,
                  claimInformation,
                  walletAddress: null,
                  latestRevisionHash: null,
                  genesisHash: null,
            }
      }

      firstRevisionKeys.map(key => {
            if (key.startsWith('forms_')) {
                  // const processedKey = key.split('_').slice(1).join(' ')
                  claimInformation[key] = firstRevision[key]
            }
      })

      // Order the claimInformation keys in ascending order
      const orderedClaimInformation = Object.keys(claimInformation)
            .sort()
            .reduce((obj: Record<string, string>, key) => {
                  obj[key] = claimInformation[key]
                  return obj
            }, {})
      return {
            claimInformation: orderedClaimInformation,
            isClaimValid,
            walletAddress: firstRevision['forms_wallet_address'],
            latestRevisionHash: lastRevisionHash,
            genesisHash: firstRevisionHash,
      }
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


/**
 * Extracts the highest form index from an object with keys following the pattern "forms_*_N"
 * where N is the index number we want to find the maximum of.
 */
export const getHighestFormIndex = (obj: Record<string, any>): number => {
      let highestIndex = -1

      // Loop through all object keys
      for (const key of Object.keys(obj)) {
            // Check if key matches the expected pattern (forms_*_N)
            const match = key.match(/^forms_[^_]+_(\d+)$/)

            if (match) {
                  // Extract the index number and convert to integer
                  const index = parseInt(match[1], 10)

                  // Update highest index if this one is greater
                  if (!isNaN(index) && index > highestIndex) {
                        highestIndex = index
                  }
            }
      }

      return highestIndex
}




export function generateProofFromSignature(domain: string, walletAddress: string, timestamp: string, expiration: string, signature: string): DNSProof {
      return {
            walletAddress,
            domainName: domain,
            timestamp,
            expiration,
            signature
      };
}



export const isWorkFlowData = (aquaTree: AquaTree, systemAndUserWorkFlow: string[]): { isWorkFlow: boolean; workFlow: string } => {
      const falseResponse = {
            isWorkFlow: false,
            workFlow: '',
      }
    // ("System workflows: ", systemAndUserWorkFlow)

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


export const getWalletClaims = (systemFileInfo: ApiFileInfo[], files: ApiFileInfo[], walletAddress: string, _setSelectedFileInfo: (file: ApiFileInfo | null) => void): IIdentityClaimDetails | null => {
      const aquaTemplates: string[] = systemFileInfo.map(e => {
            try {
                  return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                ('Error processing system file') // More descriptive
                  return ''
            }
      })

      if (files && files.length > 0) {
            let firstClaim: ApiFileInfo | null = null
            for (let i = 0; i < files.length; i++) {
                  const aquaTree = files[i].aquaTree
                  if (aquaTree) {
                        const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, aquaTemplates)
                        if (isWorkFlow && (workFlow === 'simple_claim' || workFlow === 'identity_claim')) {
                              const orderedAquaTree = OrderRevisionInAquaTree(aquaTree)
                              const revisionHashes = Object.keys(orderedAquaTree.revisions)
                              const firstRevisionHash = revisionHashes[0]
                              const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                              const _wallet_address = firstRevision.forms_wallet_address
                              if (walletAddress === _wallet_address) {
                                    firstClaim = files[i]
                                    break
                              }
                        }
                  }
            }
            if (firstClaim) {
                  const genesisHash = getGenesisHash(firstClaim.aquaTree!)
                  const firstRevision = firstClaim.aquaTree!.revisions[genesisHash!]
                  const name = firstRevision.forms_name

                  return {
                        name
                  }
            }
      }
      return null
}
