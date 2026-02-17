import React, {useEffect, useState} from 'react'
import appStore from '../../../store'
import {useStore} from 'zustand'
import {ContractDocumentViewProps, SignatureData, SummaryDetailsDisplayData} from '../../../types/types'
import {
    AquaTree,
    getGenesisHash,
    getLatestVH,
    OrderRevisionInAquaTree,
    Revision
} from 'aqua-js-sdk/web'
import {ensureDomainUrlHasSSL, getAquatreeObject, getHighestFormIndex, isAquaTree, parseAquaTreeContent, reorderRevisionsInAquaTree} from '../../../utils/functions'

import {PDFDisplayWithJustSimpleOverlay} from './SignatureOverlay'
import {toast} from 'sonner'
import PdfSigner from './PdfSigner'
import apiClient from '@/api/axiosInstance'

export const ContractDocumentView: React.FC<ContractDocumentViewProps & { onSidebarReady?: (sidebar: React.ReactNode) => void }> = ({ setActiveStep, selectedFileInfo, onSidebarReady }) => {
      const [pdfLoadingFile, setLoadingPdfFile] = useState<boolean>(true)
      const [pdfFile, setPdfFile] = useState<File | null>(null)
      const [pdfURLObject, setPdfURLObject] = useState<string | null>(null)
      const [signatures, setSignatures] = useState<SignatureData[]>([])
      const [signaturesLoading, setSignaturesLoading] = useState<boolean>(false)
      const { session, backend_url } = useStore(appStore)

      useEffect(() => {
            initializeComponent()
      }, [selectedFileInfo])

      // Check if user has already signed (computed early so useEffect below is always called)
      const isUserSignatureIncluded = signatures.some(sig => sig.walletAddress === session?.address)

      useEffect(() => {
            if (isUserSignatureIncluded && onSidebarReady) {
                  onSidebarReady(null)
            }
      }, [isUserSignatureIncluded])

      const getSignatureRevionHashes = (hashesToLoopPar: Array<string>): Array<SummaryDetailsDisplayData> => {
            const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

            for (let i = 0; i < hashesToLoopPar.length; i += 3) {
                  const batch = hashesToLoopPar.slice(i, i + 3)

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
                                    const aquaTreeData = parseAquaTreeContent(anAquaTreeFileObject.fileContent) as AquaTree
                                    if (!aquaTreeData || !aquaTreeData.revisions) {
                                          toast.error("Error parsing AquaTree from file object.");
                                          continue
                                    }
                                    const allHashes = Object.keys(aquaTreeData.revisions)
                                    if (allHashes.includes(hashSigPositionHashString)) {
                                          const revData = aquaTreeData.revisions[hashSigPositionHashString]
                                          signaturePositionCount = getHighestFormIndex(revData)

                                          break
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

      const fetchImage = async (fileUrl: string) => {
            try {
                  const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl)
                  const response = await apiClient.get(actualUrlToFetch, {
                        headers: {
                              nonce: `${session?.nonce}`,
                        },
                        responseType: 'arraybuffer',
                        validateStatus: (status) => status < 500,
                  })

                  if (response.status < 200 || response.status >= 300) {
                        console.error('FFFailed to fetch file:', response.status)
                        return null
                  }

                  // Get content type from headers
                  let contentType = response.headers['content-type'] || ''

                  // If content type is missing or generic, try to detect from URL
                  if (contentType === 'application/octet-stream' || contentType === '') {
                        contentType = 'image/png'
                  }

                  if (contentType.startsWith('image')) {
                        const arrayBuffer = response.data
                        const blob = new Blob([arrayBuffer], { type: contentType })
                        return URL.createObjectURL(blob)
                  }

                  return null
            } catch (error) {
                  console.error('Error fetching file:', error)
                  return null
            }
      }

      const findImageUrl = (fileHash: string): string | null => {
            for (const fileObject of selectedFileInfo!.fileObject) {
                  const fileContent = fileObject.fileContent

                  if (typeof fileContent === 'string' && fileContent.includes(fileHash)) {
                        return fileContent
                  }
            }

            const actualUrlToFetch = ensureDomainUrlHasSSL(backend_url)

            return `${actualUrlToFetch}/files/${fileHash}`
      }
      const loadSignatures = async (): Promise<SignatureData[]> => {
            const sigData: SignatureData[] = []
            const orderedHashes = reorderRevisionsInAquaTree(selectedFileInfo!.aquaTree!)

            // const revisions = orderedTree.revisions
            const revisionHashes = orderedHashes // Object.keys(revisions)
            let fourthItmeHashOnwards: string[] = []
            let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

            if (revisionHashes.length > 5) {
                  // remove the first 4 elements from the revision list
                  fourthItmeHashOnwards = revisionHashes.slice(5)
                  signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)
            }

            for (const sigHash of signatureRevionHashes) {

                  const revisionSigImage = selectedFileInfo!.aquaTree!.revisions[sigHash.revisionHashWithSinatureRevision]
                  const linkRevisionWithSignaturePositions: Revision = selectedFileInfo!.aquaTree!.revisions[sigHash.revisionHashWithSignaturePosition]
                  const revisionMetMask: Revision = selectedFileInfo!.aquaTree!.revisions[sigHash.revisionHashMetamask]
                  // get the name
                  const referenceRevisin: string = revisionSigImage.link_verification_hashes![0]
                  let name = 'name-err'
                  let imageDataUrl = ''
                  for (const item of selectedFileInfo?.fileObject ?? []) {
                        const isAquaTreeItem = isAquaTree(item.fileContent)
                        if (isAquaTreeItem) {
                              const aquaTreeGeneral = getAquatreeObject(item.fileContent)
                              const orderedHashes = reorderRevisionsInAquaTree(aquaTreeGeneral)
                              const aquaTree = aquaTreeGeneral// reorderAquaTreeRevisionsProperties(aquaTreeGeneral)
                              const allHashes = orderedHashes // Object.keys(aquaTree.revisions)
                              if (allHashes.includes(referenceRevisin)) {
                                    const genesisHash = getGenesisHash(aquaTree)!
                                    const genRevision = aquaTree.revisions[genesisHash]
                                    name = genRevision['forms_name']

                                    //the image url
                                    //seconnd last or 3 one
                                    const signatureRevisionHash: string = allHashes[2]
                                    const signatureRevision: Revision = aquaTree.revisions[signatureRevisionHash]
                                    if (signatureRevision.revision_type != 'link') {
                                          throw Error(`Error expected link`)
                                    }
                                    const imgFileHash = signatureRevision.link_file_hashes![0]
                                    const imageUrl = findImageUrl(imgFileHash)
                                    if (imageUrl) {
                                          const image = await fetchImage(imageUrl)
                                          if (image) {
                                                imageDataUrl = image
                                          } else {
                                                // Read default preview image from public folder and convert to data URL
                                                try {
                                                      const response = await fetch('/preview.png')
                                                      if (response.ok) {
                                                            const blob = await response.blob()
                                                            imageDataUrl = await new Promise<string>(resolve => {
                                                                  const reader = new FileReader()
                                                                  reader.onloadend = () => resolve(reader.result as string)
                                                                  reader.readAsDataURL(blob)
                                                            })
                                                      }
                                                } catch (error) {
                                                      console.error('Error loading preview.png:', error)
                                                      imageDataUrl = 'errror' // fallback to empty string
                                                }
                                          }
                                    }
                                    break
                              }
                        }
                  }

                  let revisionSigPosition: Revision | null = null

                  const revisionHashWithPositions = linkRevisionWithSignaturePositions.link_verification_hashes![0]

                  for (const item of selectedFileInfo?.fileObject ?? []) {
                        const isAquaTreeItem = isAquaTree(item.fileContent)
                        if (isAquaTreeItem) {
                              const aquaTreeGeneral = getAquatreeObject(item.fileContent)

                              const aquaTree = OrderRevisionInAquaTree(aquaTreeGeneral)
                              const allHashes = Object.keys(aquaTree.revisions)
                              
                              if (allHashes.includes(revisionHashWithPositions)) {
                                    revisionSigPosition = aquaTree.revisions[revisionHashWithPositions]
                              }
                        }
                  }

                  if (revisionSigPosition != null) {
                        if (sigHash.revisionHashWithSignaturePositionCount == 0) {
                              const signatureDetails: SignatureData = {
                                    id: sigHash.revisionHashWithSignaturePosition, // Use the hash key instead of revision.revision_hash
                                    height: revisionSigPosition.forms_height_0,
                                    width: revisionSigPosition.forms_width_0,
                                    x: revisionSigPosition.forms_x_0,
                                    y: revisionSigPosition.forms_y_0,
                                    page: revisionSigPosition.forms_page_0,
                                    name: name,
                                    walletAddress: revisionMetMask.signature_wallet_address ?? 'error',
                                    // ISSUE 2: created_at doesn't exist, use local_timestamp instead
                                    createdAt: new Date(
                                          revisionSigPosition.local_timestamp
                                                ? `${revisionSigPosition.local_timestamp.slice(0, 4)}-${revisionSigPosition.local_timestamp.slice(4, 6)}-${revisionSigPosition.local_timestamp.slice(6, 8)}T${revisionSigPosition.local_timestamp.slice(8, 10)}:${revisionSigPosition.local_timestamp.slice(10, 12)}:${revisionSigPosition.local_timestamp.slice(12, 14)}`
                                                : Date.now()
                                    ),
                                    dataUrl: imageDataUrl,
                                    hash: sigHash.revisionHashWithSignaturePosition, // Use the hash key
                                    isDragging: false,
                                    signatureId: sigHash.revisionHashWithSignaturePosition, // Use the hash key
                                    type: 'signature',
                                    imageWidth: 100,
                                    imageHeight: 120,
                                    imageAlt: 'err -img not found',
                                    rotation: 0,
                              }
                              sigData.push(signatureDetails)
                        } else {
                              const randomArray = Array.from(
                                    {
                                          length: sigHash.revisionHashWithSignaturePositionCount + 1,
                                    },
                                    () => Math.random()
                              )
                              for (let index = 0; index < randomArray.length; index++) {
                                    const signatureDetails: SignatureData = {
                                          id: `${sigHash.revisionHashWithSignaturePosition}_${index}`, // Make unique IDs for multiple signatures
                                          height: revisionSigPosition[`forms_height_${index}`],
                                          width: revisionSigPosition[`forms_width_${index}`],
                                          x: revisionSigPosition[`forms_x_${index}`],
                                          y: revisionSigPosition[`forms_y_${index}`],
                                          page: revisionSigPosition[`forms_page_${index}`],
                                          name: name,
                                          walletAddress: revisionMetMask.signature_wallet_address ?? 'error',
                                          createdAt: new Date(
                                                revisionSigPosition.local_timestamp
                                                      ? `${revisionSigPosition.local_timestamp.slice(0, 4)}-${revisionSigPosition.local_timestamp.slice(4, 6)}-${revisionSigPosition.local_timestamp.slice(6, 8)}T${revisionSigPosition.local_timestamp.slice(8, 10)}:${revisionSigPosition.local_timestamp.slice(10, 12)}:${revisionSigPosition.local_timestamp.slice(12, 14)}`
                                                      : Date.now()
                                          ),
                                          dataUrl: imageDataUrl,
                                          hash: sigHash.revisionHashWithSignaturePosition,
                                          isDragging: false,
                                          signatureId: `${sigHash.revisionHashWithSignaturePosition}_${index}`, // Make unique signature IDs
                                          type: 'signature',
                                          imageWidth: 100,
                                          imageHeight: 120,
                                          imageAlt: 'error -img not found.',
                                          rotation: 0,
                                    }
                                    sigData.push(signatureDetails)
                              }
                        }
                  } else {
                        // we try with fetching the image
                  }
            }

            return sigData
      }

      const initializeComponent = async () => {
            try {
                  if (pdfFile == null) {
                        // Load PDF first
                        const pdfFile = await fetchPDFfile()

                        setPdfFile(pdfFile)
                        setLoadingPdfFile(false)

                        const shouldLoad = shouldLoadSignatures()

                        if (shouldLoad) {
                              setSignaturesLoading(true)
                              const allSignatures: SignatureData[] = await loadSignatures()

                            
                              setSignatures(allSignatures)
                              setSignaturesLoading(false)
                        }
                  }
            } catch (error) {
                  console.error('Error initializing component:', error)
                  setLoadingPdfFile(false)
                  setSignaturesLoading(false)
            }
      }

      const fetchPDFfile = async (): Promise<File | null> => {
            try {
                  if (!selectedFileInfo?.aquaTree?.revisions) {
                        throw new Error('Selected file info or revisions not found')
                  }

                  const orderedTree = OrderRevisionInAquaTree(selectedFileInfo.aquaTree)
                  const allHashes = Object.keys(orderedTree.revisions)
                  const pdfLinkRevision = orderedTree.revisions[allHashes[2]]

                  if (!pdfLinkRevision?.link_verification_hashes?.[0]) {
                        throw new Error('PDF link revision not found')
                  }

                  const pdfHash = pdfLinkRevision.link_verification_hashes[0]
                  const pdfName = selectedFileInfo.aquaTree.file_index?.[pdfHash]

                  if (!pdfName) {
                        throw new Error('PDF name not found in index')
                  }

                  const pdfFileObject = selectedFileInfo.fileObject.find(e => e.fileName === pdfName)

                  if (!pdfFileObject) {
                        throw new Error('PDF file object not found')
                  }

                  const fileContentUrl = pdfFileObject.fileContent
                  if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
                        return await fetchFileFromUrl(fileContentUrl, pdfName)
                  }

                  // Handle object that might be binary data (like PDF bytes)
                  if (typeof fileContentUrl === 'object' && fileContentUrl !== null) {

                        // Check if it's an array-like object with numeric indices (like your example)
                        if (Object.keys(fileContentUrl).every(key => !isNaN(Number(key)))) {
                              // Convert the object to a Uint8Array
                              const bytes = new Uint8Array(Object.values(fileContentUrl) as number[])

                              // Create a blob from the bytes
                              const blob = new Blob([bytes], { type: 'application/pdf' })
                              const urlObject = URL.createObjectURL(blob)

                              // Set the PDF URL object for display
                              setPdfURLObject(urlObject)

                              // Return as a File object
                              return new File([blob], pdfName, {
                                    type: 'application/pdf',
                                    lastModified: Date.now(),
                              })
                        }
                  }
                  return null
            } catch (error) {
                  console.error('Error fetching PDF file:', error)
                  return null
            }
      }

      const fetchFileFromUrl = async (fileContentUrl: string, fileName: string): Promise<File> => {
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileContentUrl)
            const response = await apiClient.get(actualUrlToFetch, {
                  headers: { nonce: `${session?.nonce}` },
                  responseType: 'arraybuffer',
                  validateStatus: (status) => status < 500,
            })

            if (response.status < 200 || response.status >= 300) {
                  toast.error(`${fileName} not found in system`)
                  throw new Error(`Failed to fetch file: ${response.status}`)
            }

            let contentType = response.headers['content-type'] || ''

            // Detect content type from URL if missing
            if (contentType === 'application/octet-stream' || contentType === '') {
                  if (fileContentUrl.toLowerCase().endsWith('.pdf')) {
                        contentType = 'application/pdf'
                  }
            }

            const arrayBuffer = response.data
            const finalContentType = contentType || 'application/pdf'
            const blob = new Blob([arrayBuffer], { type: finalContentType })
            const urlObject = URL.createObjectURL(blob)

            setPdfURLObject(urlObject)

            return new File([blob], fileName, {
                  type: finalContentType,
                  lastModified: Date.now(),
            })
      }

      const shouldLoadSignatures = (): boolean => {
            if (!selectedFileInfo?.aquaTree?.revisions) return false

            const orderedTree = OrderRevisionInAquaTree(selectedFileInfo.aquaTree)
            const revisionHashes = Object.keys(orderedTree.revisions)
            return revisionHashes.length >= 4 // Document has signatures
      }

      // Error boundary for the component
      if (!selectedFileInfo?.aquaTree?.revisions) {
            return (
                  <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                        <p className="font-semibold">Error: Document data not found</p>
                  </div>
            )
      }

      const orderedTreeForFirstRevision = OrderRevisionInAquaTree(selectedFileInfo.aquaTree)
      const firstRevision = orderedTreeForFirstRevision.revisions[Object.keys(orderedTreeForFirstRevision.revisions)[0]]
      if (!firstRevision?.forms_signers) {
            return (
                  <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                        <p className="font-semibold">Error: Signers not found</p>
                  </div>
            )
      }

      // Loading states
      if (pdfLoadingFile) {
            return (
                  <div className="flex flex-col items-center space-y-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <h2 className="text-2xl font-bold text-gray-700">Loading PDF</h2>
                  </div>
            )
      }

      if (signaturesLoading) {
            return (
                  <div className="flex flex-col items-center space-y-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <h3 className="text-xl font-bold text-gray-700">Loading signatures...</h3>
                  </div>
            )
      }

      if (isUserSignatureIncluded) {
            return (
                  <div>
                        <PDFDisplayWithJustSimpleOverlay pdfUrl={pdfURLObject!} annotationsInDocument={signatures} signatures={signatures} latestRevisionHash={getLatestVH(selectedFileInfo.aquaTree!)} />
                  </div>
            )
      } 

      // Default case - show signing interface
      return <PdfSigner selectedFileInfo={selectedFileInfo} documentSignatures={signatures} fileData={pdfFile} setActiveStep={setActiveStep} onSidebarReady={onSidebarReady} />
}