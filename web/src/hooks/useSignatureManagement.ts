import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { PDFDocument } from 'pdf-lib'

import appStore from '@/store'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '@/models/FileInfo'
import { SignatureData } from '@/types/types'
import { ensureDomainUrlHasSSL, fetchImage, getGenesisHash, timeStampToDateObject } from '@/utils/functions'
import { API_ENDPOINTS } from '@/utils/constants'
import { reloadDB, RELOAD_KEYS } from '@/utils/reloadDatabase'
import { toast } from 'sonner'

interface UseSignatureManagementProps {
      selectedFileInfo: ApiFileInfo
      fileData: File | null
}

interface UseSignatureManagementReturn {
      signers: string[]
      allSignersBeforeMe: string[]
      mySignaturesAquaTree: ApiFileInfo[]
      mySignatureData: SignatureData[]
      selectedSignatureId: string | null
      setSelectedSignatureId: React.Dispatch<React.SetStateAction<string | null>>
      pdfFile: File | null
      loadUserSignatures: (selectSignature?: boolean) => Promise<void>
}

export function useSignatureManagement({
      selectedFileInfo,
      fileData,
}: UseSignatureManagementProps): UseSignatureManagementReturn {
      const { session, backend_url, openDialog } = useStore(appStore)

      const [signers, setSigners] = useState<string[]>([])
      const [allSignersBeforeMe, setAllSignersBeforeMe] = useState<string[]>([])
      const [mySignaturesAquaTree, setMySignaturesAquaTree] = useState<Array<ApiFileInfo>>([])
      const [mySignatureData, setMySignatureData] = useState<Array<SignatureData>>([])
      const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null)

      const [pdfFile, setPdfFile] = useState<File | null>(null)
      const [_pdfUrl, setPdfUrl] = useState<string | null>(null)
      const [_pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null)

      const loadUserSignatures = async (selectSignature: boolean = false) => {
            if (backend_url == 'http://0.0.0.0:0' || backend_url == 'https://0.0.0.0:0') {
                  return
            }
            if (session?.address == undefined || session?.address == '') {
                  return
            }

            const url = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`)
            try {
                  const params = {
                        page: 1,
                        limit: 200,
                        claim_types: JSON.stringify(["user_signature"]),
                        wallet_address: session?.address,
                  }
                  const signaturesQuery = await apiClient.get(url, {
                        headers: {
                              nonce: session?.nonce,
                        },
                        params
                  })

                  const response = signaturesQuery.data
                  const signatureAquaTrees = response.aquaTrees

                  const userSignaturesApiInfo: Array<ApiFileInfo> = signatureAquaTrees
                  setMySignaturesAquaTree(userSignaturesApiInfo)

                  const apiSigntures: SignatureData[] = []
                  for (const userSignature of userSignaturesApiInfo) {
                        const allHashes = Object.keys(userSignature.aquaTree!.revisions!)

                        const firstRevision = userSignature.aquaTree?.revisions[allHashes[0]]
                        if (!firstRevision) continue
                        if (!firstRevision.forms_wallet_address) continue
                        if (!firstRevision.forms_name) continue

                        const sinatureAquaTreeName = userSignature.aquaTree?.file_index[allHashes[0]]
                        if (!sinatureAquaTreeName) continue

                        const thirdRevision = userSignature.aquaTree?.revisions[allHashes[2]]
                        if (!thirdRevision) continue
                        if (!thirdRevision.link_verification_hashes) continue

                        const signatureHash = thirdRevision.link_verification_hashes[0]
                        const signatureImageName = userSignature.aquaTree?.file_index[signatureHash]
                        if (!signatureImageName) continue

                        const signatureImageObject = userSignature.fileObject.find(e => e.fileName == signatureImageName)
                        if (!signatureImageObject) continue

                        const forthRevision = userSignature.aquaTree?.revisions[allHashes[3]]
                        if (!thirdRevision) continue

                        // Check ownership: for smart account wallets (social login), signature_wallet_address
                        // is the EOA signer, not the smart account. Fall back to forms_wallet_address.
                        const isOwner = forthRevision?.signature_wallet_address === session.address
                              || firstRevision.forms_wallet_address === session.address
                        if (!isOwner) continue

                        const fileContentUrl = signatureImageObject.fileContent

                        if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
                              let url = ensureDomainUrlHasSSL(fileContentUrl)
                              let dataUrl = await fetchImage(url, `${session?.nonce}`)

                              if (!dataUrl) {
                                    dataUrl = `${window.location.origin}/images/placeholder-img.png`
                              }

                              const sign: SignatureData = {
                                    type: 'signature',
                                    id: crypto.randomUUID(),
                                    hash: getGenesisHash(userSignature.aquaTree!) ?? 'err2',
                                    name: firstRevision.forms_name,
                                    walletAddress: firstRevision.forms_wallet_address,
                                    dataUrl: dataUrl,
                                    createdAt: timeStampToDateObject(firstRevision.local_timestamp) ?? new Date(),
                                    page: 0,
                                    x: 0,
                                    y: 0,
                                    width: 100,
                                    height: 120,
                                    isDragging: false,
                                    signatureId: signatureHash,
                                    rotation: 0,
                                    imageWidth: 100,
                                    imageHeight: 150,
                                    imageAlt: 'No image found',
                              }
                              apiSigntures.push(sign)
                        }
                  }
                  setMySignatureData(apiSigntures)

                  if (selectSignature) {
                        let latestObject: SignatureData | null = null
                        let latestTimestamp: Date | null = null
                        if (apiSigntures.length > 0) {
                              for (const obj of apiSigntures) {
                                    if (latestTimestamp == null) {
                                          latestTimestamp = obj.createdAt
                                          latestObject = obj
                                    } else {
                                          if (obj.createdAt > latestTimestamp) {
                                                latestTimestamp = obj.createdAt
                                                latestObject = obj
                                          }
                                    }
                              }
                        }

                        if (latestObject != null) {
                              setSelectedSignatureId(latestObject.hash)
                        }
                  }
            } catch (e) {
            }
      }

      // Effect to set up signers, PDF file, and load signatures
      useEffect(() => {
            let signersList: string[] = []
            const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
            const firstRevision = selectedFileInfo!.aquaTree?.revisions[allHashes[0]]

            if (firstRevision?.forms_signers) {
                  if (firstRevision.forms_signers.includes(',')) {
                        signersList = firstRevision.forms_signers.split(',').map((e: string) => e.trim().replace('"', ''))
                  } else {
                        signersList.push(firstRevision?.forms_signers.replace('"', ''))
                  }
            }

            setSigners(signersList)

            const fourthItmeHashOnwards = allHashes.slice(4)
            let allSignersData = [...signersList]

            try {
                  if (signersList.includes(session!.address)) {
                        let index = 0
                        for (let i = 0; i < fourthItmeHashOnwards.length; i += 3) {
                              const batch = fourthItmeHashOnwards.slice(i, i + 3)
                              const hashSigMetamak = batch[2] ?? ''

                              const revision = selectedFileInfo!.aquaTree!.revisions![hashSigMetamak]

                              allSignersData = allSignersData.filter(item => item !== revision.signature_wallet_address)

                              index += 1
                        }

                        const indexOfMyWalletAddressAfter = allSignersData.indexOf(session!.address)
                        const allSignersBeforeMeList = allSignersData.slice(0, indexOfMyWalletAddressAfter)
                        setAllSignersBeforeMe(allSignersBeforeMeList)
                  }
            } catch (e) {
                  toast.error(`Error Loading pdf`)
            }

            if (fileData) {
                  ;(async () => {
                        setPdfFile(fileData)

                        const fileUrl = URL.createObjectURL(fileData)
                        setPdfUrl(fileUrl)

                        const arrayBuffer = await fileData.arrayBuffer()
                        const pdfDoc = await PDFDocument.load(arrayBuffer)
                        setPdfDoc(pdfDoc)
                  })()
            }

            ;(async () => {
                  await loadUserSignatures(true)
            })()

      }, [selectedFileInfo])

      // Reload signatures when dialog closes
      useEffect(() => {
            if (openDialog == null) {
                  ;(async () => {
                        await loadUserSignatures(true)
                  })()
            }
      }, [openDialog, selectedFileInfo])

      // Reload signatures when user_signature reload key changes
      const userSignatureReload = useLiveQuery(
            () => reloadDB.reloadConfigs.where('key').equals(RELOAD_KEYS.user_signature).first(),
            []
      )

      useEffect(() => {
            if (userSignatureReload?.value) {
                  ;(async () => {
                        await loadUserSignatures(true)
                  })()
            }
      }, [userSignatureReload?.timestamp])

      return {
            signers,
            allSignersBeforeMe,
            mySignaturesAquaTree,
            mySignatureData,
            selectedSignatureId,
            setSelectedSignatureId,
            pdfFile,
            loadUserSignatures,
      }
}
