import { ApiFileInfo, ClaimInformation } from '../models/FileInfo'
import { AquaTree, CredentialsData, FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk'
import { IContractInformation } from '@/types/contract_workflow'
import { ApiFileInfoState, IIdentityClaimDetails, SummaryDetailsDisplayData } from '@/types/types'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
import { isWorkFlowData, getGenesisHash, isAquaTree, parseAquaTreeContent } from './aqua-tree'
import { ensureDomainUrlHasSSL } from './network'
import { fetchImage } from './api-helpers'
import { getHighestFormIndex } from './arrays'

export const getSignatureRevionHashes = (hashesToLoopPar: Array<string>, selectedFileInfo: ApiFileInfo): Array<SummaryDetailsDisplayData> => {
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
                              const anAquaTree: AquaTree = parseAquaTreeContent(anAquaTreeFileObject.fileContent) as AquaTree
                              if (!anAquaTree || !anAquaTree.revisions) {
                                    console.error("Error parsing AquaTree from file object.")
                                    continue
                              }
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

      if (revisionHashes.length > 5) {
            fourthItemHashOnwards = revisionHashes.slice(5)
            signatureRevisionHashes = getSignatureRevionHashes(fourthItemHashOnwards, selectedFileInfo)

            const signatureRevisionHashesDataAddress = signatureRevisionHashes.map(e => e.walletAddress)
            let remainingSigners = signers.filter(item => !signatureRevisionHashesDataAddress.includes(item))

            // Duct tape fix: if signature group count >= signer count, all signers have signed
            // Reown social login uses rotating ephemeral session keys, so wallet addresses may not match
            // if (remainingSigners.length > 0 && signatureRevisionHashes.length >= signers.length) {
            //       remainingSigners = []
            // }

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
      const isClaimValid = mustContainkeys.every(key => firstRevisionKeys.includes(key)) || firstRevisionKeys.includes("forms_ens_name")

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

export const fetchWalletAddressesAndNamesForInputRecommendation = async (_systemFileInfo: ApiFileInfo[], files: ApiFileInfoState,): Promise<Map<string, string>> => {

      const recommended = new Map<string, string>()

      // const someData = systemFileInfo.map(e => {
      //       try {
      //             return getAquaTreeFileName(e.aquaTree!)
      //       } catch (e) {
      //             //  console.log('Error processing system file') // More descriptive
      //             return ''
      //       }
      // })

      const workflows = await AquaSystemNamesService.getInstance().getSystemNames()

      for (const file of files.fileData) {

            const workFlow = isWorkFlowData(file.aquaTree!, workflows)

            if (workFlow && workFlow.isWorkFlow) {
                  // console.log('Workflow found: ', workFlow.workFlow)
                  const orederdRevisionAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
                  let allHashes = Object.keys(orederdRevisionAquaTree.revisions)
                  let genRevsion = orederdRevisionAquaTree.revisions[allHashes[0]]

                  if (workFlow.workFlow === 'identity_claim') {

                        if (genRevsion && genRevsion[`forms_name`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_name`], genRevsion[`forms_wallet_address`])
                        }
                  }

                  if (workFlow.workFlow === 'identity_attestation') {
                        if (genRevsion && genRevsion[`forms_context`] && genRevsion[`forms_claim_wallet_address`]) {

                              if (genRevsion['forms_attestion_type'] == "user") {

                                    recommended.set(genRevsion[`forms_context`], genRevsion[`forms_claim_wallet_address`])
                              }
                        }
                  }

                  if (workFlow.workFlow === 'phone_number_claim') {

                        if (genRevsion && genRevsion[`forms_phone_number`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_phone_number`], genRevsion[`forms_wallet_address`])
                        }
                  }


                  if (workFlow.workFlow === 'domain_claim') {

                        if (genRevsion && genRevsion[`forms_domain`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_domain`], genRevsion[`forms_wallet_address`])
                        }
                  }


                  if (workFlow.workFlow === 'email_claim') {

                        if (genRevsion && genRevsion[`forms_email`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_email`], genRevsion[`forms_wallet_address`])
                        }
                  }



            } else {
                  //  console.log('Not a workflow data: ', file.aquaTree)
            }

      }

      //  console.log('Recommended wallet addresses: ', JSON.stringify(recommended, null, 2))

      return recommended;
}

export async function loadSignatureImage(aquaTree: AquaTree, fileObject: FileObject[], nonce: string): Promise<string | null | Uint8Array> {
      try {
            const signatureAquaTree = OrderRevisionInAquaTree(aquaTree)
            const fileobjects = fileObject

            const allHashes = Object.keys(signatureAquaTree!.revisions!)

            const thirdRevision = signatureAquaTree?.revisions[allHashes[2]]

            if (!thirdRevision) {
                  return null
            }

            if (!thirdRevision.link_verification_hashes) {
                  return null
            }

            const signatureHash = thirdRevision.link_verification_hashes[0]
            const signatureImageName = signatureAquaTree?.file_index[signatureHash]

            const signatureImageObject = fileobjects.find(e => e.fileName == signatureImageName)

            const fileContentUrl = signatureImageObject?.fileContent

            if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
                  let url = ensureDomainUrlHasSSL(fileContentUrl)
                  let dataUrl = await fetchImage(url, `${nonce}`)

                  if (!dataUrl) {
                        dataUrl = `${window.location.origin}/images/placeholder-img.png`
                  }

                  return dataUrl
            } else if (fileContentUrl instanceof Uint8Array) {

                  return fileContentUrl
            }
      }
      catch (error) {
            return `${window.location.origin}/images/placeholder-img.png`
      }
      return null
}

export const getWalletClaims = (aquaTemplateNames: string[], files: ApiFileInfo[], walletAddress: string, _setSelectedFileInfo: (file: ApiFileInfo | null) => void): IIdentityClaimDetails | null => {
      const aquaTemplates: string[] = aquaTemplateNames

      if (files && files.length > 0) {
            let firstClaim: ApiFileInfo | null = null
            for (let i = 0; i < files.length; i++) {
                  const aquaTree = files[i].aquaTree
                  if (aquaTree) {
                        const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, aquaTemplates)
                        if (isWorkFlow && (workFlow === 'simple_claim' || workFlow === 'identity_claim' || workFlow === "user_signature" || workFlow === "email_claim")) {
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
                  let nameOrEmail = ""
                  if (firstRevision.forms_name) {
                        nameOrEmail = firstRevision.forms_name
                  } else if (firstRevision.forms_email) {
                        nameOrEmail = firstRevision.forms_email
                  }

                  return {
                        name: nameOrEmail
                  }
            }
      }
      return null
}

export function dummyCredential(): CredentialsData {
      return {
            mnemonic: '',
            nostr_sk: '',
            did_key: '',
            alchemy_key: '',
            witness_eth_network: 'sepolia',
            witness_method: 'metamask',
      }
}
