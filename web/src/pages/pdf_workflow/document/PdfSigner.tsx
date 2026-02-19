import React, { useCallback, useEffect, useRef, useState } from 'react'

import { useStore } from 'zustand'
import appStore from '../../../store'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '../../../models/FileInfo'
import {
      ensureDomainUrlHasSSL,
      formatAddressForFilename,
      getLastRevisionVerificationHash,
      getRandomNumber,
      isWorkFlowData,
} from '../../../utils/functions'
import { API_ENDPOINTS } from '../../../utils/constants'
import { SignatureData } from '../../../types/types'
import { Annotation } from '../pdf-viewer/types'
import { PdfRendererComponent } from '../pdf-viewer/SignerPage'
import { downloadPdfWithAnnotations } from '@/utils/pdf-downloader'
import { toast } from 'sonner'
import { useNotificationWebSocketContext } from '@/contexts/NotificationWebSocketContext'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
import { extractEmbeddedAquaData } from '@/utils/pdf-digital-signature'
import { useSignatureManagement } from '@/hooks/useSignatureManagement'
import { usePdfDragDrop } from '@/hooks/usePdfDragDrop'
import { useSignatureSubmission } from '@/hooks/useSignatureSubmission'
import { SignatureSidebar } from './SignatureSidebar'

interface PdfSignerProps {
      fileData: File | null
      setActiveStep: (page: number) => void
      documentSignatures?: SignatureData[]
      selectedFileInfo: ApiFileInfo
      onSidebarReady?: (sidebar: React.ReactNode) => void
}

const PdfSigner: React.FC<PdfSignerProps> = ({ fileData, documentSignatures, selectedFileInfo, setActiveStep, onSidebarReady }) => {
      const { openDialog } = useStore(appStore)

      // Local UI state
      const [signaturePositions, setSignaturePositions] = useState<SignatureData[]>([])
      const [canPlaceSignature, setCanPlaceSignature] = useState(false)
      const [selectedTool, setSelectedTool] = useState<'text' | 'image' | 'profile' | 'signature' | null>(null)
      const [submittingSignatureData, setSubmittingSignatureData] = useState(false)
      const [signingComplete, setSigningComplete] = useState(false)

      const { subscribe, triggerWebsockets } = useNotificationWebSocketContext()

      // Get wallet address from store
      const { session, backend_url } = useStore(appStore)

      // Ref to always call the latest updateSelectedFileInfo from the subscription callback
      const updateSelectedFileInfoRef = useRef<() => void>(() => { })

      // PDF viewer container ref
      const pdfMainContainerRef = useRef<HTMLDivElement>(null)

      // --- Extracted hooks ---

      const {
            signers,
            allSignersBeforeMe,
            mySignaturesAquaTree,
            mySignatureData,
            selectedSignatureId,
            setSelectedSignatureId,
            pdfFile,
      } = useSignatureManagement({
            selectedFileInfo,
            fileData,
      })

      usePdfDragDrop({
            pdfMainContainerRef,
            setSignaturePositions,
      })

      const {
            handleSignatureSubmission,
            updateSelectedFileInfo,
      } = useSignatureSubmission({
            selectedFileInfo,
            selectedSignatureId,
            mySignaturesAquaTree,
            setActiveStep,
            setSubmittingSignatureData,
            setSigningComplete,
            triggerWebsockets,
      })

      // Keep the ref in sync so the subscription callback always calls the latest version
      updateSelectedFileInfoRef.current = updateSelectedFileInfo

      // Subscribe to websocket notifications
      useEffect(() => {
            subscribe((message) => {
                  console.log("Notification received: ", message)
                  updateSelectedFileInfoRef.current()
            })
            // #FIX: disabled cleanup function since it was causing chaos
            // return unsubscribe;
      }, [subscribe])

      // Resize handler to force re-render of signature positions
      useEffect(() => {
            const handleResize = () => {
                  setSignaturePositions(prev => [...prev])
            }

            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
      }, [])

      // Lift sidebar content to parent via callback
      useEffect(() => {
            if (onSidebarReady) {
                  onSidebarReady(signingComplete ? null : (
                        <SignatureSidebar
                              signers={signers}
                              allSignersBeforeMe={allSignersBeforeMe}
                              mySignaturesAquaTree={mySignaturesAquaTree}
                              mySignatureData={mySignatureData}
                              selectedSignatureId={selectedSignatureId}
                              canPlaceSignature={canPlaceSignature}
                              signaturePositions={signaturePositions}
                              submittingSignatureData={submittingSignatureData}
                              setSelectedTool={setSelectedTool}
                              setCanPlaceSignature={setCanPlaceSignature}
                              setSignaturePositions={setSignaturePositions}
                              handleSignatureSubmission={async () => {
                                    await handleSignatureSubmission(signaturePositions)
                              }}
                        />
                  ))
            }
      }, [signers, mySignaturesAquaTree, selectedSignatureId, canPlaceSignature, signaturePositions, submittingSignatureData, documentSignatures, allSignersBeforeMe, mySignatureData, openDialog, signingComplete])

      // --- Annotation handlers (kept in orchestrator) ---

      const addAnnotation = useCallback(
            (newAnnotationData: Annotation) => {
                  const id = Date.now().toString() + Math.random().toString(36).substring(2, 9)
                  const selectedSignatureInfo = mySignatureData.find(signature => signature.hash === selectedSignatureId)

                  if (!selectedSignatureInfo) {
                        return
                  }
                  const newAnnotation: SignatureData = {
                        ...(newAnnotationData as SignatureData),
                        id,
                        name: selectedSignatureInfo.name,
                        walletAddress: selectedSignatureInfo.walletAddress,
                        dataUrl: selectedSignatureInfo.dataUrl,
                  }

                  const data = signaturePositions.find((anno: SignatureData) => anno.id === newAnnotation.id)

                  if (data) {
                        return
                  }
                  setSignaturePositions((prev: any) => {
                        let newData = [...prev, newAnnotation]
                        // Remove duplicates based on id
                        newData = newData.filter((item: SignatureData, index: number, self: SignatureData[]) => index === self.findIndex(t => t.id === item.id))
                        return newData
                  })

                  setSelectedTool(null)
                  setCanPlaceSignature(false)
            },
            [mySignatureData, selectedSignatureId]
      )

      const updateAnnotation = useCallback((updatedAnnotation: Annotation) => {
            setSignaturePositions((prev: any) => prev.map((anno: any) => (anno.id === updatedAnnotation.id ? updatedAnnotation : anno)))
      }, [])

      const deleteAnnotation = useCallback(
            (id: string) => {
                  setSignaturePositions(prev => prev.filter(anno => anno.id !== id))
                  if (selectedSignatureId === id) {
                        setSelectedSignatureId(null)
                  }
            },
            [selectedSignatureId]
      )

      // --- PDF-workflow-specific functions ---

      const createFileBackupOnServer = async (): Promise<string | null> => {
            const hash = selectedFileInfo?.aquaTree ? getLastRevisionVerificationHash(selectedFileInfo.aquaTree) : null
            if (!hash) {
                  return null
            }
            // Goes to the backend and creates a backup of the file to the server account
            let documentBackupID: string | null = null
            try {
                  const endpoint = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.CREATE_SERVER_ACCOUNT_BACKUP}`)
                  const res = await apiClient.post(endpoint, {
                        latestRevisionHash: hash,
                  }, {
                        headers: {
                              nonce: session?.nonce,
                        }
                  })
                  const resData = res.data
                  if (resData.success) {
                        documentBackupID = resData.backupId
                  }
            } catch (error) {

            }
            return documentBackupID
      }

      const handleDownload = async () => {
            if (!pdfFile) {
                  toast.error("No PDF - Please upload or load a PDF file first.")
                  return
            }

            let fileName = `${pdfFile.name.replace('.pdf', '')}_signed.pdf`
            // If the file is not an aqua sign workflow, just download the PDF directly
            let isAquaSignWorkflow = false
            if (selectedFileInfo?.aquaTree) {
                  const workflows = await AquaSystemNamesService.getInstance().getSystemNames()
                  const workFlow = isWorkFlowData(selectedFileInfo.aquaTree, workflows)
                  isAquaSignWorkflow = workFlow.isWorkFlow && workFlow.workFlow === 'aqua_sign'
                  console.log('handleDownload - workflow check:', { isWorkFlow: workFlow.isWorkFlow, workFlowType: workFlow.workFlow, isAquaSignWorkflow })
            } else {
                  console.log('handleDownload - no aquaTree on selectedFileInfo, skipping workflow check')
            }

            if (!isAquaSignWorkflow) {
                  console.log('handleDownload - not an aqua_sign workflow, downloading plain PDF')
                  const blob = new Blob([pdfFile], { type: 'application/pdf' })
                  const link = document.createElement('a')
                  link.href = URL.createObjectURL(blob)
                  const addressSuffix = formatAddressForFilename(appStore.getState().session?.address)
                  let downloadName = fileName || (pdfFile.name ? `${pdfFile.name.replace('.pdf', '')}_raw.pdf` : `${getRandomNumber(99, 999)}_document.pdf`)
                  if (downloadName.toLowerCase().endsWith('.pdf')) {
                        downloadName = downloadName.slice(0, -4) + addressSuffix + '.pdf'
                  } else {
                        downloadName = downloadName + addressSuffix
                  }
                  link.download = downloadName
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  toast.success("Download Started - PDF downloaded.")
                  return
            }

            // Check if the PDF already has signatures baked in (from a previous signing).
            // If so, skip documentSignatures to avoid drawing them twice.
            let pdfAlreadyHasEmbeddedSignatures = false
            try {
                  const pdfBytes = await pdfFile.arrayBuffer()
                  const embeddedData = await extractEmbeddedAquaData(new Uint8Array(pdfBytes))
                  if (embeddedData.aquaJson) {
                        pdfAlreadyHasEmbeddedSignatures = true
                  }
            } catch (error) {
                  console.error('Error checking PDF for embedded signatures:', error)
            }

            // Combine existing document signatures + new user-placed signatures
            // Skip existing signatures if they are already baked into the PDF bytes
            const existingSigs = pdfAlreadyHasEmbeddedSignatures ? [] : (documentSignatures || []).map((sig: SignatureData) => ({
                  type: 'profile' as const,
                  id: sig.id,
                  x: sig.x,
                  y: sig.y,
                  page: typeof sig.page === 'string' ? parseInt(sig.page) : sig.page,
                  rotation: sig.rotation ?? 0,
                  imageSrc: sig.dataUrl,
                  imageWidth: sig.imageWidth ?? '140px',
                  imageHeight: sig.imageHeight ?? '80px',
                  imageAlt: sig.name,
                  name: sig.name,
                  walletAddress: sig.walletAddress,
                  scale: sig.scale ?? 1,
            }))

            const newSigs = signaturePositions.map((sig: SignatureData) => ({
                  type: 'profile' as const,
                  id: sig.id,
                  x: sig.x,
                  y: sig.y,
                  page: typeof sig.page === 'string' ? parseInt(sig.page) : sig.page,
                  rotation: sig.rotation ?? 0,
                  imageSrc: sig.dataUrl,
                  imageWidth: sig.imageWidth ?? '140px',
                  imageHeight: sig.imageHeight ?? '80px',
                  imageAlt: sig.name,
                  name: sig.name,
                  walletAddress: sig.walletAddress,
                  scale: sig.scale ?? 1,
            }))

            const allAnnotations = [...existingSigs, ...newSigs]

            console.log('PdfSigner handleDownload - selectedFileInfo:', {
                  exists: !!selectedFileInfo,
                  hasAquaTree: !!selectedFileInfo?.aquaTree,
                  fileObjectLength: selectedFileInfo?.fileObject?.length,
            })

            await downloadPdfWithAnnotations({
                  pdfFile,
                  annotations: allAnnotations as any,
                  fileName: fileName,
                  backupFn: createFileBackupOnServer,
                  fileInfo: selectedFileInfo
            })
      }

      return (
            <div className="h-[calc(100vh-70px)] overflow-y-scroll md:overflow-hidden">
                  <div className="h-[60px] flex items-center">
                        <h1 className="text-2xl font-bold">PDF Signer</h1>
                  </div>

                  {/* PDF viewer and signature tools */}
                  <div className="h-[calc(100%-60px)]">
                        {pdfFile ? (
                              <>
                                    <div className="h-auto md:h-full">
                                          <div className="h-auto md:h-full">
                                                <div className="grid grid-cols-12 gap-0 h-auto md:h-full">
                                                      <div className="col-span-12 overflow-x-auto overflow-y-scroll h-full">
                                                            <div className="h-auto md:h-full p-0 m-0">
                                                                  {/* This is a custom component do not convert to tailwind, we will convert it separately */}
                                                                  <PdfRendererComponent
                                                                        pdfFile={pdfFile}
                                                                        annotations={signaturePositions}
                                                                        annotationsInDocument={documentSignatures ?? []}
                                                                        onAnnotationAdd={addAnnotation}
                                                                        onAnnotationUpdate={updateAnnotation}
                                                                        onAnnotationDelete={deleteAnnotation}
                                                                        selectedTool={selectedTool}
                                                                        selectedAnnotationId={selectedSignatureId}
                                                                        onAnnotationSelect={() => { }}
                                                                        onAnnotationRotate={() => { }}
                                                                        onDownload={handleDownload}
                                                                  />
                                                            </div>
                                                      </div>
                                                </div>
                                          </div>
                                    </div>
                              </>
                        ) : (
                              <>Error Loading PDF</>
                        )}
                  </div>

                  {/* Signature drawing modal */}
                  {/* <Dialog open={isOpen} onOpenChange={open => setIsOpen(open)}>
                        <DialogContent className="sm:rounded-lg md:rounded-xl">
                              <DialogHeader>
                                    <DialogTitle>Draw Signature</DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col gap-4 p-4">
                                    <div className="space-y-2">
                                          <Label htmlFor="signer-name">Signer Name</Label>
                                          <Input id="signer-name" value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Enter your name" className="rounded-lg" />
                                    </div>

                                    <p className="text-sm text-gray-700">
                                          Wallet Address: {session?.address ? `${session?.address.substring(0, 6)}...${session?.address.substring(session?.address.length - 4)}` : 'Not connected'}
                                    </p>

                                    <div className="border border-gray-200 w-full h-[200px] bg-white">
                                          <SignatureCanvas
                                                ref={signatureRef}
                                                canvasProps={{
                                                      style: {
                                                            maxWidth: '100%',
                                                      },
                                                      width: 500,
                                                      height: 200,
                                                      className: 'signature-canvas',
                                                }}
                                                backgroundColor="transparent"
                                          />
                                    </div>

                                    <div className="flex flex-row space-x-2">
                                          <Button variant="outline" size="icon" className="text-red-500 border-red-200 hover:bg-red-50" onClick={clearSignature}>
                                                <LuTrash className="h-4 w-4" />
                                          </Button>
                                          <Button
                                                data-testid="action-loading-save-signature-button"
                                                disabled={creatingUserSignature}
                                                className="bg-blue-600 text-white hover:bg-blue-700"
                                                onClick={saveSignature}
                                          >
                                                {creatingUserSignature ? (
                                                      <>
                                                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-t-transparent border-white"></div>
                                                            loading
                                                      </>
                                                ) : (
                                                      <span>Save Signature</span>
                                                )}
                                          </Button>
                                    </div>
                              </div>
                        </DialogContent>
                  </Dialog> */}
            </div>
      )
}

// Add PDF.js types to window object
declare global {
      interface Window {
            pdfjsLib: any
      }
}

export default PdfSigner
