import { useStore } from 'zustand'
import { toast } from 'sonner'
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, getAquaTreeFileObject } from 'aqua-js-sdk/web'

import appStore from '@/store'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '@/models/FileInfo'
import { SignatureData } from '@/types/types'
import {
      dummyCredential,
      ensureDomainUrlHasSSL,
      estimateFileSize,
      getGenesisHash,
      getLastRevisionVerificationHash,
      getRandomNumber,
      reorderRevisionsInAquaTree,
} from '@/utils/functions'
import { API_ENDPOINTS } from '@/utils/constants'
import { signMessageWithAppKit } from '@/utils/appkit-wallet-utils'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'
import { saveAquaTree } from '@/utils/aquaTreeUpload'

interface UseSignatureSubmissionProps {
      selectedFileInfo: ApiFileInfo
      selectedSignatureId: string | null
      mySignaturesAquaTree: ApiFileInfo[]
      setActiveStep: (page: number) => void
      setSubmittingSignatureData: React.Dispatch<React.SetStateAction<boolean>>
      setSigningComplete: React.Dispatch<React.SetStateAction<boolean>>
      triggerWebsockets: (receiver: string, content: Object) => void
}

interface UseSignatureSubmissionReturn {
      submitSignatureData: (signaturePosition: SignatureData[]) => Promise<void>
      handleSignatureSubmission: (signaturePositions: SignatureData[]) => Promise<void>
      saveAllRevisionsToServer: (aquaTrees: AquaTree[]) => Promise<void>
      saveAllRevisionsToServerForUser: (aquaTrees: AquaTree[], address: string) => Promise<void>
      updateSelectedFileInfo: () => Promise<void>
}

export function useSignatureSubmission({
      selectedFileInfo,
      selectedSignatureId,
      mySignaturesAquaTree,
      setActiveStep,
      setSubmittingSignatureData,
      setSigningComplete,
      triggerWebsockets,
}: UseSignatureSubmissionProps): UseSignatureSubmissionReturn {
      const { session, backend_url, webConfig, setSelectedFileInfo } = useStore(appStore)

      // Helper function to show error messages
      const showError = (message: string) => {
            toast.error(message)
      }

      // Helper function to create signature form data
      const createSignatureFormData = (signaturePosition: SignatureData[]) => {
            const signForm: { [key: string]: string | number } = {}

            signaturePosition.forEach((signaturePositionItem, index) => {
                  const pageIndex = signaturePositionItem.page
                  signForm[`x_${index}`] = Number(signaturePositionItem.x.toFixed(14))
                  signForm[`y_${index}`] = Number(signaturePositionItem.y.toFixed(14))
                  signForm[`page_${index}`] = pageIndex.toString()
                  signForm[`width_${index}`] = signaturePositionItem.width.toString()
                  signForm[`height_${index}`] = signaturePositionItem.height.toString()
                  signForm[`scale_${index}`] = (signaturePositionItem.scale ?? 1).toString()
            })

            return signForm
      }

      // Helper function to create user signature aqua tree
      const createUserSignatureAquaTree = async (aquafier: Aquafier, signForm: any) => {
            const jsonString = JSON.stringify(signForm, null, 2)
            const estimateSize = estimateFileSize(jsonString)

            const randomNumber = getRandomNumber(100, 1000)
            const lastFourChar = session?.address.substring(session?.address.length - 4)
            const fileObjectUserSignature: FileObject = {
                  fileContent: jsonString,
                  fileName: `user_signature_data_${lastFourChar}_${randomNumber}.json`,
                  path: './',
                  fileSize: estimateSize,
            }

            const userSignatureDataAquaTree = await aquafier.createGenesisRevision(fileObjectUserSignature, true, false, false)

            if (userSignatureDataAquaTree.isErr()) {
                  showError('Signature data creation failed')
                  return null
            }

            // Save to server
            await saveAquaTree({
                  aquaTree: userSignatureDataAquaTree.data.aquaTree!,
                  fileObject: fileObjectUserSignature,
                  backendUrl: backend_url,
                  nonce: session?.nonce,
                  account: session?.address || '',
                  isWorkflow: true,
                  templateId: '',
                  reloadKeys: [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files, RELOAD_KEYS.aqua_sign],
            })

            return {
                  aquaTree: userSignatureDataAquaTree.data.aquaTree!,
                  fileObject: fileObjectUserSignature,
            }
      }

      // Helper function to link main document with signature data
      const linkMainDocumentWithSignatureData = async (aquafier: Aquafier, userSignatureData: any) => {
            const sigFileObject = getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]

            const aquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: selectedFileInfo!.aquaTree!,
                  revision: '',
                  fileObject: sigFileObject,
            }

            const userSignatureDataAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: userSignatureData.aquaTree,
                  revision: '',
                  fileObject: userSignatureData.fileObject,
            }

            const resLinkedAquaTreeWithUserSignatureData = await aquafier.linkAquaTree(aquaTreeWrapper, userSignatureDataAquaTreeWrapper)

            if (resLinkedAquaTreeWithUserSignatureData.isErr()) {
                  showError('Signature data not appended to main tree successfully')
                  return null
            }

            return resLinkedAquaTreeWithUserSignatureData.data.aquaTree!
      }

      // Helper function to link signature tree to document
      const linkSignatureTreeToDocument = async (aquafier: Aquafier, linkedAquaTree: any) => {
            const linkedAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: linkedAquaTree,
                  revision: '',
                  fileObject: getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0],
            }

            if (selectedSignatureId == null) {
                  throw Error(`selected signature id is null `)
            }

            let sigData: ApiFileInfo | undefined = undefined

            for (const e of mySignaturesAquaTree) {
                  const allHashes = Object.keys(e.aquaTree?.revisions ?? {})
                  if (allHashes.includes(selectedSignatureId)) {
                        sigData = e
                        break
                  }
            }

            if (sigData == undefined) {
                  throw Error(`signature api data not found `)
            }

            const signatureAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: sigData.aquaTree!,
                  revision: '',
                  fileObject: getAquaTreeFileObject(sigData),
            }

            const resLinkedAquaTree = await aquafier.linkAquaTree(linkedAquaTreeWrapper, signatureAquaTreeWrapper)

            if (resLinkedAquaTree.isErr()) {
                  showError('Signature tree not appended to main tree successfully')
                  return null
            }

            return resLinkedAquaTree.data.aquaTree!
      }

      // Helper function to sign with MetaMask
      const signWithMetaMask = async (aquafier: Aquafier, aquaTree: AquaTree) => {
            if (webConfig.AUTH_PROVIDER == "metamask") {
                  const signatureFileObject = getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]

                  const aquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: aquaTree,
                        revision: '',
                        fileObject: signatureFileObject,
                  }

                  const resLinkedMetaMaskSignedAquaTree = await aquafier.signAquaTree(aquaTreeWrapper, 'metamask', dummyCredential())

                  if (resLinkedMetaMaskSignedAquaTree.isErr()) {
                        showError('MetaMask signature not appended to main tree successfully')
                        return null
                  }

                  return resLinkedMetaMaskSignedAquaTree.data.aquaTree!
            } else {
                  const signatureFileObject = getAquaTreeFileObject(selectedFileInfo!) ?? selectedFileInfo?.fileObject[0]

                  const aquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: aquaTree,
                        revision: '',
                        fileObject: signatureFileObject,
                  }

                  const targetRevisionHash = getLastRevisionVerificationHash(aquaTree)
                  const messageToSign = `I sign this revision: [${targetRevisionHash}]`
                  const { signature, signerAddress } = await signMessageWithAppKit(messageToSign, session?.address!)

                  const resLinkedMetaMaskSignedAquaTree = await aquafier.signAquaTree(aquaTreeWrapper, 'inline', dummyCredential(), true, undefined, {
                        signature,
                        walletAddress: signerAddress,
                  })

                  if (resLinkedMetaMaskSignedAquaTree.isErr()) {
                        showError('MetaMask signature not appended to main tree successfully')
                        return null
                  }

                  return resLinkedMetaMaskSignedAquaTree.data.aquaTree!
            }
      }

      // New bulk revision saving for other users using /tree/user/all endpoint
      const saveAllRevisionsToServerForUser = async (aquaTrees: AquaTree[], address: string) => {
            try {
                  const revisions: { revision: any, revisionHash: string, index: number }[] = []

                  for (let i = 0; i < aquaTrees.length; i++) {
                        const aquaTree = aquaTrees[i]
                        const orderedHashes = reorderRevisionsInAquaTree(aquaTree)
                        const lastHash = orderedHashes[orderedHashes.length - 1]
                        const lastRevision = aquaTree.revisions[lastHash]

                        revisions.push({
                              revision: lastRevision,
                              revisionHash: lastHash,
                              index: i
                        })
                  }

                  const url = `${backend_url}/tree/user/all`
                  const actualUrlToFetch = ensureDomainUrlHasSSL(url)

                  await apiClient.post(
                        actualUrlToFetch,
                        {
                              revisions: revisions,
                              address: address,
                              originAddress: session?.address,
                              isWorkflow: true
                        },
                        {
                              headers: {
                                    nonce: session?.nonce,
                              },
                              reloadKeys: [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files, RELOAD_KEYS.aqua_sign],
                        }
                  )

            } catch (error) {
                  console.error(`Error saving all revisions for user ${address}:`, error)
                  // Don't throw error to avoid breaking the flow if one user fails, just log it
            }
      }

      const shareRevisionsToOwnerAnOtherSignersOfDocument = async (aquaTrees: AquaTree[]) => {
            const genesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)

            if (genesisHash) {
                  const revision = selectedFileInfo!.aquaTree!.revisions[genesisHash]
                  const sender: string | undefined = revision['forms_sender']
                  const signers: string | undefined = revision['forms_signers']

                  console.log(`Sharing revisions to other signers       ... sender ${sender}  signers ${signers} `)
                  if (sender == undefined) {
                        showError('Workflow sender not found')
                        return
                  }

                  if (signers == undefined) {
                        showError('Workflow signers not found')
                        return
                  }

                  if (sender == signers) {
                        console.log("Only sender involved, no need to share revisions")
                        return
                  }

                  if (signers.includes(',')) {
                        const allSigners: string[] = signers.split(',')

                        for (const aSigner of allSigners) {
                              if (aSigner != sender) {
                                    await saveAllRevisionsToServerForUser(aquaTrees, aSigner)

                                    triggerWebsockets(aSigner, {
                                          target: "aqua_sign_workflow",
                                          genesisHash: genesisHash,
                                    })
                              }
                        }
                  } else {
                        if (signers != session?.address) {
                              await saveAllRevisionsToServerForUser(aquaTrees, signers)

                              triggerWebsockets(signers, {
                                    target: "aqua_sign_workflow",
                                    genesisHash: genesisHash,
                              })
                        }
                  }

                  // sender could be another user too
                  // send the signatures to workflow creator
                  await saveAllRevisionsToServerForUser(aquaTrees, sender)

                  // send notification to workflow creator
                  triggerWebsockets(sender, {
                        target: "aqua_sign_workflow",
                        genesisHash: genesisHash,
                  })
            }
      }

      // Function to create a notification for contract signing
      const createSigningNotification = async (senderAddress: string, receiverAddress: string, genesisHash: string) => {
            try {
                  if (senderAddress === receiverAddress) {
                        return
                  }

                  const url = `${backend_url}${API_ENDPOINTS.NOTIFICATIONS}`
                  const actualUrlToFetch = ensureDomainUrlHasSSL(url)

                  await apiClient.post(
                        actualUrlToFetch,
                        {
                              receiver: receiverAddress,
                              content: `Has signed the shared contract`,
                        },
                        {
                              headers: {
                                    'Content-Type': 'application/json',
                                    nonce: session?.nonce,
                              },
                        }
                  )

                  const url2 = `${backend_url}${API_ENDPOINTS.NOTIFICATIONS_AQUA_SIGN}/${receiverAddress}`
                  const actualUrlToFetch2 = ensureDomainUrlHasSSL(url2)

                  await apiClient.post(
                        actualUrlToFetch2,
                        {
                              receiver: receiverAddress,
                              content: {
                                    target: "reload_aqua_sign",
                                    genesisHash: genesisHash
                              },
                        },
                        {
                              headers: {
                                    'Content-Type': 'application/json',
                                    nonce: session?.nonce,
                              },
                        }
                  )

            } catch (error) {
                  console.error('Error creating signing notification:', error)
                  // Don't show error to user as this is not critical functionality
            }
      }

      // New bulk revision saving using /tree/all endpoint
      const saveAllRevisionsToServer = async (aquaTrees: AquaTree[]) => {
            try {
                  const revisions: { revision: any, revisionHash: string, index: number }[] = []

                  for (let i = 0; i < aquaTrees.length; i++) {
                        const aquaTree = aquaTrees[i]
                        const orderedHashes = reorderRevisionsInAquaTree(aquaTree)
                        const lastHash = orderedHashes[orderedHashes.length - 1]
                        const lastRevision = aquaTree.revisions[lastHash]

                        revisions.push({
                              revision: lastRevision,
                              revisionHash: lastHash,
                              index: i
                        })
                  }

                  const url = `${backend_url}/tree/all`
                  const actualUrlToFetch = ensureDomainUrlHasSSL(url)

                  await apiClient.post(
                        actualUrlToFetch,
                        {
                              revisions: revisions,
                              originAddress: session?.address,
                              isWorkflow: true
                        },
                        {
                              headers: {
                                    nonce: session?.nonce,
                              },
                              reloadKeys: [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files, RELOAD_KEYS.aqua_sign],
                        }
                  )

            } catch (error) {
                  console.error('Error saving all revisions:', error)
                  throw new Error('Error saving all revisions to server')
            }
      }

      const updateSelectedFileInfo = async () => {
            try {
                  const orderedRevisionHashes = reorderRevisionsInAquaTree(selectedFileInfo!.aquaTree!)

                  const url = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`)
                  const res = await apiClient.post(url, {
                        revisionHashes: orderedRevisionHashes
                  }, {
                        headers: {
                              'Content-Type': 'application/json',
                              nonce: session?.nonce,
                        },
                  })
                  if (res.status === 200) {
                        const incomingAquaTree = res.data.data
                        const incomingGenesisHash = getGenesisHash(incomingAquaTree.aquaTree)
                        const selectedFileGenesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)

                        if (incomingGenesisHash === selectedFileGenesisHash) {
                              setSelectedFileInfo(incomingAquaTree)
                              setActiveStep(1)
                        }
                  }
            } catch (error) {
                  console.error('Failed to load existing chain file:', error)
            }
      }

      // Helper function to update UI after success
      const updateUIAfterSuccess = async () => {
            try {
                  updateSelectedFileInfo()
            } catch (error) {
                  toast.error(`An error occurred, refresh this tab to see the updated document.`)
                  console.error("Error updating selected file info after signing: ", error)
            }
      }

      const submitSignatureData = async (signaturePosition: SignatureData[]) => {
            setSubmittingSignatureData(true)
            try {
                  const aquafier = new Aquafier()

                  // Step 1: Create signature form data
                  const signForm = createSignatureFormData(signaturePosition)

                  // Step 2: Create user signature data aqua tree
                  const userSignatureDataAquaTree = await createUserSignatureAquaTree(aquafier, signForm)
                  if (!userSignatureDataAquaTree) return

                  // Step 3: Link main document with user signature data
                  const linkedAquaTreeWithUserSignatureData = await linkMainDocumentWithSignatureData(aquafier, userSignatureDataAquaTree)
                  if (!linkedAquaTreeWithUserSignatureData) return

                  // Step 4: Link signature tree with the document
                  const linkedAquaTreeWithSignature = await linkSignatureTreeToDocument(aquafier, linkedAquaTreeWithUserSignatureData)
                  if (!linkedAquaTreeWithSignature) return

                  // Step 5: Sign with MetaMask
                  const metaMaskSignedAquaTree = await signWithMetaMask(aquafier, structuredClone(linkedAquaTreeWithSignature))
                  if (!metaMaskSignedAquaTree) return

                  // Step 6: Save all revisions to server in a single request (bulk save)
                  await saveAllRevisionsToServer([linkedAquaTreeWithUserSignatureData, linkedAquaTreeWithSignature, metaMaskSignedAquaTree])

                  // Step 7: Share revisions to owner and other signers (uses bulk endpoint)
                  await shareRevisionsToOwnerAnOtherSignersOfDocument([linkedAquaTreeWithUserSignatureData, linkedAquaTreeWithSignature, metaMaskSignedAquaTree])

                  // Step 8: Create notification for the contract sender
                  const genesisHash = getGenesisHash(selectedFileInfo!.aquaTree!)
                  if (genesisHash) {
                        const revision = selectedFileInfo!.aquaTree!.revisions[genesisHash]
                        const sender = revision['forms_sender']

                        // Notify the document sender that the current user has signed
                        if (sender && session?.address && sender !== session.address) {
                              await createSigningNotification(session.address, sender, genesisHash)
                        }

                        let signersString = revision['forms_signers']
                        let signersList: string[] = []
                        if (signersString.includes(',')) {
                              signersList = signersString.split(',')
                        } else {
                              signersList.push(signersString)
                        }

                        for (const wallet of signersList) {
                              if (wallet.toLowerCase() !== sender.toLowerCase() && wallet.toLowerCase() !== session?.address.toLowerCase()) {
                                    await createSigningNotification(session!.address, wallet, genesisHash)
                              }
                        }
                  }

                  // Step 9: Update UI and refresh files
                  await updateUIAfterSuccess()

                  // Step 10: Hide signing sidebar
                  setSigningComplete(true)

            } catch (error) {
                  console.error('Error in submitSignatureData:', error)
                  showError('An unexpected error occurred during signature submission')
            } finally {
                  setSubmittingSignatureData(false)
            }
      }

      const handleSignatureSubmission = async (signaturePositions: SignatureData[]) => {
            if (signaturePositions.length == 0) {
                  toast.error('No signature detected in document')
                  return
            }
            await submitSignatureData(signaturePositions)
      }

      return {
            submitSignatureData,
            handleSignatureSubmission,
            saveAllRevisionsToServer,
            saveAllRevisionsToServerForUser,
            updateSelectedFileInfo,
      }
}
