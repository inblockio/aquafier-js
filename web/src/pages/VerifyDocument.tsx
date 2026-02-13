import { useEffect, useState } from 'react'
import { PDFDocument, PDFName, PDFString, PDFHexString, PDFDict } from 'pdf-lib'
import { useStore } from 'zustand'
import appStore from '../store'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '../models/FileInfo'
// import { ClipLoader } from "react-spinners";
import { IDrawerStatus } from '../models/AquaTreeDetails'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions/import_aqua_tree_from_aqua_tree'
import { toast } from 'sonner'
import { extractEmbeddedAquaData } from '@/utils/pdf-digital-signature'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { PdfDropzone } from '@/components/ui/pdf-dropzone'
import { CompleteChainView } from '../components/files_chain_details'
import { ensureDomainUrlHasSSL } from '@/utils/functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EasyPDFRenderer } from '@/pages/aqua_sign_wokflow/ContractDocument/signer/SignerPage'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, FileText, User, Calendar, Link, Hash, ShieldCheck, AlertCircle, Loader2, X, ShieldCheckIcon, Wallet2, Copy, InfoIcon, ShieldUser, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WalletAdrressClaim from './v2_claims_workflow/WalletAdrressClaim'


interface IMetadata {
      // Standard fields
      title?: string
      author?: string
      subject?: string
      keywords?: string
      creator?: string
      producer?: string
      creationDate?: Date
      modificationDate?: Date
      // Custom Aquafier fields
      signedBy?: string
      signerWallet?: string
      signatureReason?: string
      signatureLocation?: string
      signatureDate?: string
      signaturePlatform?: string
      signaturePlatformURL?: string
      documentHash?: string
      certificateFingerprint?: string
      documentId?: string
      verificationURL?: string
}


const CustomPDFMetada = ({ metadata, drawerStatus }: { metadata: IMetadata | null, drawerStatus: IDrawerStatus | null }) => {

      return (
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white to-neutral-50 shadow-sm ring-1 ring-neutral-200/70 dark:from-neutral-900/70 dark:to-neutral-950/80 dark:ring-white/10">
                  {/* Subtle top accent */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-400/60 via-violet-400/60 to-fuchsia-400/60 dark:from-indigo-500/60 dark:via-violet-500/60 dark:to-fuchsia-500/60" />
                  {/* Header */}
                  <header className="flex items-start gap-3 border-b border-neutral-200/70 p-5 md:p-6 dark:border-white/10">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-b from-indigo-500/10 to-violet-500/10 ring-1 ring-indigo-400/30 dark:from-indigo-500/15 dark:to-violet-500/15 dark:ring-indigo-400/30">
                              <ShieldCheckIcon
                                    className="h-5 w-5 text-indigo-500 dark:text-indigo-400"
                                    style={{ strokeWidth: "1.5" }}
                              />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                              <div className="min-w-0">
                                    <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white md:text-xl">
                                          Signature Information
                                    </h2>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                          {drawerStatus === null
                                                ? 'Verifying document metadata...'
                                                : drawerStatus.isVerificationSuccessful
                                                      ? 'Verified metadata for this document'
                                                      : 'Verification failed for this document'}
                                    </p>
                              </div>
                              {drawerStatus === null ? (
                                    <span
                                          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-neutral-600 ring-1 ring-neutral-500/20 dark:text-neutral-400"
                                          id="statusPill"
                                    >
                                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-neutral-500 animate-pulse" />
                                          Pending
                                    </span>
                              ) : drawerStatus.isVerificationSuccessful ? (
                                    <span
                                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400"
                                          id="statusPill"
                                    >
                                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                          Verified
                                    </span>
                              ) : (
                                    <span
                                          className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[0.7rem] font-medium text-red-600 ring-1 ring-red-500/20 dark:text-red-400"
                                          id="statusPill"
                                    >
                                          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                                          Failed
                                    </span>
                              )}
                        </div>
                  </header>
                  {/* Content (with data) */}
                  <div id="withData" className="space-y-4 p-5 md:p-6">
                        {/* Signed By */}
                        <div className="flex items-start gap-3 rounded-xl bg-neutral-100/80 p-3 ring-1 ring-neutral-200/70 dark:bg-white/5 dark:ring-white/10">
                              <User
                                    className="mt-0.5 h-4 w-4 text-indigo-500 dark:text-indigo-400"
                                    style={{ strokeWidth: "1.5" }}
                              />
                              <div className="min-w-0 flex-1">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                          Signed By
                                    </p>
                                    {
                                          metadata?.signedBy?.split(",").map(item => item.trim()).map((_name, idx) => (

                                                <p
                                                      key={`${idx + 1}._${_name}`}
                                                      className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100"
                                                >
                                                      {`${idx + 1}. ${_name}`}
                                                </p>

                                          ))
                                    }
                              </div>
                        </div>
                        {/* Wallet */}
                        <div className="flex items-start gap-3 rounded-xl bg-neutral-100/80 p-3 ring-1 ring-neutral-200/70 dark:bg-white/5 dark:ring-white/10">
                              <Wallet2
                                    className="mt-0.5 h-4 w-4 text-indigo-500 dark:text-indigo-400"
                                    style={{ strokeWidth: "1.5" }}
                              />
                              <div className="min-w-0 flex-1">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                          Wallet Address
                                    </p>
                                    {
                                          metadata?.signerWallet?.split(",").map(item => item.trim()).map((_address, idx) => (
                                                <div key={`wallet_${_address}_${idx}`} className="flex items-center gap-2">
                                                      <WalletAdrressClaim walletAddress={_address} />
                                                </div>
                                          ))
                                    }
                              </div>
                        </div>
                        {/* Signed On */}
                        <div className="flex items-start gap-3 rounded-xl bg-neutral-100/80 p-3 ring-1 ring-neutral-200/70 dark:bg-white/5 dark:ring-white/10">
                              <Calendar
                                    className="mt-0.5 h-4 w-4 text-indigo-500 dark:text-indigo-400"
                                    style={{ strokeWidth: "1.5" }}
                              />
                              <div className="min-w-0 flex-1">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                          Signed On
                                    </p>
                                    <p
                                          id="signatureDate"
                                          className="text-sm text-neutral-900 dark:text-neutral-100"
                                    >
                                          {metadata?.signatureDate}
                                    </p>
                              </div>
                        </div>
                        {/* Separator */}
                        <div className="my-4 h-px bg-gradient-to-r from-transparent via-neutral-200/80 to-transparent dark:via-white/10" />
                        {/* Document ID */}
                        <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                                    <Hash
                                          className="h-3.5 w-3.5"
                                          style={{ strokeWidth: "1.5" }}
                                    />
                                    <p className="text-xs">Document ID</p>
                              </div>
                              <div className="flex items-center gap-2">
                                    <code
                                          id="documentId"
                                          className="block max-w-full truncate rounded-md bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 ring-1 ring-neutral-200/80 dark:bg-white/5 dark:text-neutral-100 dark:ring-white/10"
                                          title=""
                                    >
                                          {metadata?.documentId}
                                    </code>
                                    <button
                                          id="copyDocumentId"
                                          className="inline-flex h-7 items-center gap-1 rounded-md bg-neutral-900/5 px-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-300/60 transition hover:bg-neutral-900/10 hover:ring-neutral-400/70 active:scale-[0.98] dark:bg-white/5 dark:text-neutral-300 dark:ring-white/10 dark:hover:bg-white/10"
                                          aria-label="Copy document id"
                                    >
                                          <Copy
                                                className="h-3.5 w-3.5"
                                                style={{ strokeWidth: "1.5" }}
                                          />
                                          Copy
                                    </button>
                              </div>
                        </div>
                        {/* Document Hash */}
                        <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                                    <Hash
                                          className="h-3.5 w-3.5"
                                          style={{ strokeWidth: "1.5" }}
                                    />
                                    <p className="text-xs">Document Hash</p>
                              </div>
                              <div className="flex items-center gap-2">
                                    <code
                                          id="documentHash"
                                          className="block max-w-full truncate rounded-md bg-neutral-100 px-2 py-1.5 text-xs text-neutral-900 ring-1 ring-neutral-200/80 dark:bg-white/5 dark:text-neutral-100 dark:ring-white/10"
                                          title=""
                                    >
                                          {metadata?.documentHash}
                                    </code>
                                    <button
                                          id="copyDocumentHash"
                                          className="inline-flex h-7 items-center gap-1 rounded-md bg-neutral-900/5 px-2 text-xs font-medium text-neutral-700 ring-1 ring-neutral-300/60 transition hover:bg-neutral-900/10 hover:ring-neutral-400/70 active:scale-[0.98] dark:bg-white/5 dark:text-neutral-300 dark:ring-white/10 dark:hover:bg-white/10"
                                          aria-label="Copy document hash"
                                    >
                                          <Copy
                                                className="h-3.5 w-3.5"
                                                style={{ strokeWidth: "1.5" }}
                                          />
                                          Copy
                                    </button>
                              </div>
                        </div>
                        {/* Platform */}
                        <div className="flex items-center gap-2 pt-1 text-neutral-500 dark:text-neutral-400">
                              <Link
                                    className="h-4 w-4"
                                    style={{ strokeWidth: "1.5" }}
                              />
                              <p className="text-xs">
                                    Signed via{" "}
                                    <span
                                          id="signaturePlatform"
                                          className="font-medium text-neutral-900 dark:text-neutral-100"
                                    >
                                          {metadata?.signaturePlatform}
                                    </span>
                              </p>
                        </div>
                  </div>
                  {/* Empty state (no data) */}
                  <div id="noData" className="hidden p-10 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 ring-1 ring-neutral-200/80 dark:bg-white/5 dark:ring-white/10">
                              <InfoIcon
                                    className="h-6 w-6 text-neutral-500 dark:text-neutral-400"
                                    style={{ strokeWidth: "1.5" }}
                              />
                        </div>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                              No Signature Found
                        </p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                              This document doesn’t contain Aquafier signature metadata
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2">
                              <button className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 text-xs font-medium text-white shadow-sm ring-1 ring-black/10 transition hover:brightness-[1.05] active:scale-[0.98] dark:bg-white dark:text-neutral-900 dark:ring-white/10 px-3 py-2">
                                    <ShieldUser
                                          className="h-4 w-4"
                                          style={{ strokeWidth: "1.5" }}
                                    />
                                    Learn about signing
                              </button>
                              {/* <button className="inline-flex items-center gap-1.5 rounded-lg bg-transparent text-xs font-medium text-neutral-700 ring-1 ring-neutral-300/70 transition hover:bg-neutral-900/5 active:scale-[0.98] dark:text-neutral-300 dark:ring-white/10 dark:hover:bg-white/5 px-3 py-2">
                                    <HiDocumentPlus
                                          className="h-4 w-4"
                                          style={{ strokeWidth: "1.5" }}
                                    />
                                    Upload another file
                              </button> */}
                        </div>
                  </div>
            </section>

      )
} 
 
const VerifyDocument = () => {
      const { backend_url, metamaskAddress, session } = useStore(appStore)
      const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
      const [contractData, setContractData] = useState<any | null>(null)
      const [loading, setLoading] = useState(false)
      const [hasError, setHasError] = useState<string | null>(null)
      const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)
      const [pdfFile, setPDFFile] = useState<File | null>()

      const [pdfMetadata, setPdfMetadata] = useState<IMetadata | null>(null)

      const loadPageData = async (documentId: string) => {
            if (loading) {
                  toast.warning('Already loading, skipping new request')
                  return
            }
            if (!documentId) {
                  return
            }
            if (!backend_url.includes('0.0.0.0')) {
                  try {
                        setLoading(true)
                        const url = ensureDomainUrlHasSSL(`${backend_url}/share_data/${documentId}`)
                        const response = await apiClient.get(url, {
                              headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    nonce: "RANDOM_NONCE",
                              },
                        })

                        if (response.status === 200) {
                              setFileInfo(response.data.data.displayData[0])
                              setContractData(response.data.data.contractData)
                        }
                        setLoading(false)
                  } catch (error: any) {
                        if (error.response) {
                              if (error.response.status == 401) {
                                    // Unauthorized - do nothing special
                              } else if (error.response.status == 404) {
                                    setHasError(`File could not be found (probably it was deleted)`)
                              } else if (error.response.status == 412) {
                                    setHasError(`File not found or no permission for access granted.`)
                              } else {
                                    setHasError(`Error : ${error}`)
                              }
                        } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                              setHasError(`Cannot connect to server. Please check your connection.`)
                        } else {
                              setHasError(`Error : ${error.message || error}`)
                        }
                        setLoading(false)
                        toast.error(`Error fetching data`)
                  }
            }
      }

      const loadPDFMetadata = async (file: File) => {
            try {
                  setLoading(true)
                  const arrayBuffer = await file.arrayBuffer()
                  const pdfDoc = await PDFDocument.load(arrayBuffer)

                  // Helper to extract string value from PDF info dict
                  const getInfoValue = (key: string): string | undefined => {
                        try {
                              const infoDict = pdfDoc.context.trailerInfo.Info
                              if (!infoDict) return undefined
                              const dict = pdfDoc.context.lookup(infoDict) as PDFDict
                              const value = dict.get(PDFName.of(key))
                              if (value instanceof PDFString || value instanceof PDFHexString) {
                                    return value.decodeText()
                              }
                              return undefined
                        } catch {
                              return undefined
                        }
                  }

                  const metadata = {
                        // Standard fields
                        title: pdfDoc.getTitle(),
                        author: pdfDoc.getAuthor(),
                        subject: pdfDoc.getSubject(),
                        keywords: pdfDoc.getKeywords(),
                        creator: pdfDoc.getCreator(),
                        producer: pdfDoc.getProducer(),
                        creationDate: pdfDoc.getCreationDate(),
                        modificationDate: pdfDoc.getModificationDate(),
                        // Custom Aquafier fields
                        signedBy: getInfoValue('SignedBy'),
                        signerWallet: getInfoValue('SignerWallet'),
                        signatureReason: getInfoValue('SignatureReason'),
                        signatureLocation: getInfoValue('SignatureLocation'),
                        signatureDate: getInfoValue('SignatureDate'),
                        signaturePlatform: getInfoValue('SignaturePlatform'),
                        signaturePlatformURL: getInfoValue('SignaturePlatformURL'),
                        documentHash: getInfoValue('DocumentHash'),
                        certificateFingerprint: getInfoValue('CertificateFingerprint'),
                        documentId: getInfoValue('DocumentId'),
                        verificationURL: getInfoValue('VerificationURL'),
                  }

                  setPdfMetadata(metadata)

                  // Try to extract embedded aqua data first
                  const uint8Array = new Uint8Array(arrayBuffer)
                  const embeddedData = await extractEmbeddedAquaData(uint8Array)

                  // If embedded aqua.json exists, use it for verification
                  if (embeddedData.aquaJson) {
                        toast.success('Using embedded aqua chain data for verification', {
                              description: 'Verifying document from embedded metadata (offline)',
                              duration: 4000,
                        })

                        try {
                              const aquaJson = embeddedData.aquaJson

                              // Validate aqua.json structure
                              if (!aquaJson.genesis || !aquaJson.name_with_hash || !Array.isArray(aquaJson.name_with_hash)) {
                                    throw new Error('Invalid aqua.json structure: missing genesis or name_with_hash')
                              }

                              // Get the main aqua tree file
                              const mainAquaTreeFileName = `${aquaJson.genesis}.aqua.json`
                              const mainAquaTreeFile = embeddedData.aquaChainFiles.find(f => f.filename === mainAquaTreeFileName)

                              if (!mainAquaTreeFile) {
                                    throw new Error(`Main aqua tree file not found: ${mainAquaTreeFileName}`)
                              }

                              // Parse the main aqua tree
                              const aquaTreeData = JSON.parse(mainAquaTreeFile.content)

                              // Validate it's a proper aqua tree
                              if (!aquaTreeData.revisions || !aquaTreeData.file_index) {
                                    throw new Error('Invalid aqua tree structure: missing revisions or file_index')
                              }

                              // Create Aquafier instance for validation
                              // const aquafier = new Aquafier()

                              // Validate all files in name_with_hash exist and match hashes
                              const fileObjects: any[] = []

                              for (const nameHash of aquaJson.name_with_hash) {
                                    if (nameHash.name.endsWith('.aqua.json')) {
                                          // For aqua tree files, find them in embedded files
                                          const aquaFile = embeddedData.aquaChainFiles.find(f => f.filename === nameHash.name)
                                          if (!aquaFile) {
                                                continue // Skip if not found instead of throwing
                                          }

                                          // Validate hash
                                          // const calculatedHash = aquafier.getFileHash(aquaFile.content)

                                          // SDK expects aqua tree fileContent as parsed object, not string
                                          let parsedContent: any = aquaFile.content;
                                          try {
                                                parsedContent = JSON.parse(aquaFile.content);
                                          } catch {
                                                // Keep as string if not valid JSON
                                          }

                                          fileObjects.push({
                                                fileName: nameHash.name,
                                                fileContent: parsedContent,
                                                fileSize: aquaFile.content.length,
                                          })
                                    } else {
                                          // This is an asset file - check if it's embedded
                                          const assetFile = embeddedData.assetFiles.find(f => f.filename === nameHash.name)
                                          if (assetFile) {
                                                // Convert ArrayBuffer to Uint8Array for binary files (SDK expects string | Uint8Array)
                                                const content = assetFile.content instanceof ArrayBuffer
                                                      ? new Uint8Array(assetFile.content)
                                                      : assetFile.content;
                                                fileObjects.push({
                                                      fileName: nameHash.name,
                                                      fileContent: content,
                                                      fileSize: typeof assetFile.content === 'string' ? assetFile.content.length : (assetFile.content as ArrayBuffer).byteLength,
                                                })
                                          }
                                    }
                              }

                              // Create ApiFileInfo from embedded data
                              const mockFileInfo: ApiFileInfo = {
                                    aquaTree: aquaTreeData,
                                    fileObject: fileObjects,
                                    linkedFileObjects: [],
                                    mode: 'view',
                                    owner: metadata.signerWallet || '',
                              }

                              setFileInfo(mockFileInfo)
                              setLoading(false)
                              return

                        } catch (error) {
                              toast.error('Failed to process embedded data', {
                                    description: error instanceof Error ? error.message : 'Falling back to online verification',
                              })
                              setLoading(false)
                        }
                  }

                  // Fallback to loading from backend if documentId exists and no embedded data
                  if (metadata.documentId && !embeddedData.aquaJson) {
                        toast.info('Checking document metadata online', {
                              description: 'Verifying document via backend API',
                              duration: 3000,
                        })
                        loadPageData(metadata.documentId)
                  } else if (!metadata.documentId && !embeddedData.aquaJson) {
                        toast.warning('No verification data found', {
                              description: 'This PDF does not contain Aquafier signature data',
                              duration: 5000,
                        })
                        setLoading(false)
                  }

            } catch (error) {
                  toast.error('Failed to read PDF metadata')
                  setLoading(false)
            }
      }

      useEffect(() => {
            if (pdfFile) {
                  loadPDFMetadata(pdfFile)
            } else {
                  setPDFFile(null)
                  setFileInfo(null)
                  setPdfMetadata(null)
                  // setFoundDocumentId(null)
            }
      }, [pdfFile])

      const updateDrawerStatus = (_drawerStatus: IDrawerStatus) => {
            setDrawerStatus(_drawerStatus)
      }

      return (
            <div className="min-h-screen bg-linear-to-b from-background to-muted/20 relative">
                  <div className="container max-w-8xl mx-auto px-4 pb-8 relative">
                        {/* Page Header */}
                        <div className="mb-8 mt-4 sticky top-0 z-10 py-2 px-2 bg-white/95 border border-b rounded-md">
                              <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                          <ShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                          <h1 className="text-2xl font-bold tracking-tight">Verify Document</h1>
                                          <p className="text-muted-foreground text-sm">
                                                Upload a signed PDF to verify its authenticity and view signature details
                                          </p>
                                    </div>
                              </div>
                        </div>

                        {/* Login Required Alert */}
                        {!session && (
                              <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                                    <AlertCircle className="h-4 w-4 text-amber-600" />
                                    <AlertTitle className="text-amber-800 dark:text-amber-200">Login Required</AlertTitle>
                                    <AlertDescription className="text-amber-700 dark:text-amber-300 flex items-center justify-between">
                                          <span>You need to be logged in to verify documents and view full details.</span>
                                          <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-4 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/30"
                                                onClick={() => window.location.href = '/app'}
                                          >
                                                <LogIn className="h-4 w-4 mr-2" />
                                                Login
                                          </Button>
                                    </AlertDescription>
                              </Alert>
                        )}

                        {/* Error Alert */}
                        {hasError && (
                              <Alert variant="destructive" className="mb-6">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{hasError}</AlertDescription>
                              </Alert>
                        )}

                        {/* Main Content */}
                        {!pdfFile ? (
                              /* Dropzone Section */
                              <Card className="border-2 border-dashed bg-card/50 backdrop-blur">
                                    <CardContent className="p-0">
                                          <PdfDropzone pdfFile={pdfFile} setPdfFile={setPDFFile} />
                                    </CardContent>
                              </Card>
                        ) : (  
                              /* Document View Section */
                              <div className="space-y-6">
                                    {/* Top Action Bar */}
                                    <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                      <h2 className="font-semibold truncate max-w-md">{pdfFile.name}</h2>
                                                      <p className="text-xs text-muted-foreground">
                                                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                                                      </p>
                                                </div>
                                                <Badge
                                                      variant={pdfMetadata?.documentId ? 'default' : 'secondary'}
                                                      className={pdfMetadata?.documentId ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                                                >
                                                      {pdfMetadata?.documentId ? 'Signed' : 'Unsigned'}
                                                </Badge>
                                                {loading && (
                                                      <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            <span className="text-sm">Verifying...</span>
                                                      </div>
                                                )}
                                          </div>
                                          <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                      setPDFFile(null)
                                                      setFileInfo(null)
                                                      setPdfMetadata(null)
                                                      setHasError(null)
                                                }}
                                          >
                                                <X className="h-4 w-4 mr-2" />
                                                Clear
                                          </Button>
                                    </div>

                                    {/* Two Column Layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                                          {/* Left Section - PDF Viewer */}
                                          <div className="lg:col-span-2">
                                                <Card className="overflow-hidden">
                                                      <CardContent className="p-0">
                                                            <div className="bg-muted/30 min-h-150">
                                                                  <EasyPDFRenderer
                                                                        pdfFile={pdfFile}
                                                                        annotations={[]}
                                                                        annotationsInDocument={[]}
                                                                        latestRevisionHash=""
                                                                  />
                                                            </div>
                                                      </CardContent>
                                                </Card>
                                          </div>

                                          {/* Right Section - Metadata & Verification */}
                                          <div className="space-y-4">
                                                {/* Signature Information Card */}
                                                <CustomPDFMetada metadata={pdfMetadata} drawerStatus={drawerStatus} />

                                                {/* Verification Status Card */}
                                                {fileInfo && (
                                                      <Card className="border-green-200 dark:border-green-900">
                                                            <CardHeader className="pb-3">
                                                                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                                        Aqua File  Verification
                                                                  </CardTitle>
                                                            </CardHeader>
                                                            <CardContent>
                                                                  <CompleteChainView
                                                                        callBack={updateDrawerStatus}
                                                                        selectedFileInfo={fileInfo}
                                                                        hideFilePreview={true}
                                                                  />
                                                            </CardContent>
                                                      </Card>
                                                )}

                                                {/* Import to Account Card */}
                                                {fileInfo && metamaskAddress && drawerStatus && (
                                                      <ImportAquaChainFromChain
                                                            showButtonOnly={false}
                                                            fileInfo={fileInfo}
                                                            contractData={contractData}
                                                            isVerificationSuccessful={drawerStatus?.isVerificationSuccessful ?? false}
                                                      />
                                                )}
                                          </div>
                                    </div>
                              </div>
                        )}
                  </div>
            </div>
      )
}

export default VerifyDocument
