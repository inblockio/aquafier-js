import {RevisionDetailsSummaryData} from '@/models/AquaTreeDetails'
import appStore from '@/store'
import {AquaTree, FileObject, getGenesisHash, isAquaTree, Revision} from 'aqua-js-sdk'
import {useStore} from 'zustand'
import {Card, CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Badge} from '@/components/ui/badge'
import {ChevronRight, Clock, Copy, ExternalLink, Eye, FileSignature, Hash, Link2, Network} from 'lucide-react'
import {API_ENDPOINTS, ERROR_TEXT, ERROR_UKNOWN, WITNESS_NETWORK_MAP} from '@/utils/constants'
import {
    displayTime,
    ensureDomainUrlHasSSL,
    fetchFiles,
    fetchLinkedFileName,
    formatCryptoAddress,
    getAquaTreeFileObject,
    getFileNameWithDeepLinking,
    isDeepLinkRevision,
    isPDFFile,
    isHttpUrl,
    isValidUrl,
} from '@/utils/functions'
import {ApiFileInfo} from '@/models/FileInfo'
import {toast} from 'sonner'
import {lazy, Suspense, useEffect, useState} from 'react'
import {ClipLoader} from 'react-spinners'
import {extractEmbeddedAquaData} from '@/utils/pdf-digital-signature'
import {LuSave} from 'react-icons/lu'
import JSZip from 'jszip'
import apiClient from '@/api/axiosInstance'
import {RELOAD_KEYS} from '@/utils/reloadDatabase'

const WalletAddressProfile = lazy(() => import('@/pages/v2_claims_workflow/WalletAddressProfile'))

export const RevisionDetailsSummary = ({ fileInfo, isWorkFlow }: RevisionDetailsSummaryData) => {
      const { files, setSelectedFileInfo, session, backend_url, metamaskAddress, setFiles } = useStore(appStore)
      const revisionHashes = Object.keys(fileInfo!.aquaTree!.revisions)

      const [pdfHasAquaData, setPdfHasAquaData] = useState(false)
      const [pdfAquaDataChecked, setPdfAquaDataChecked] = useState(false)
      const [importingPdf, setImportingPdf] = useState(false)
      const [pdfEmbeddedData, setPdfEmbeddedData] = useState<Awaited<ReturnType<typeof extractEmbeddedAquaData>> | null>(null)
      const [aquaSignAlreadyImported, setAquaSignAlreadyImported] = useState(false)

      const revisionsWithSignatures: Array<Revision> = []
      const revisionsWithWitness: Array<Revision> = []
      const revisionHashesWithLinks: Array<string> = []

      for (let i = 0; i < revisionHashes.length; i++) {
            const currentRevision: string = revisionHashes[i]
            const revision: Revision = fileInfo.aquaTree!.revisions[currentRevision]

            if (revision.revision_type == 'signature') {
                  revisionsWithSignatures.push(revision)
            }

            if (revision.revision_type == 'witness') {
                  revisionsWithWitness.push(revision)
            }

            if (revision.revision_type == 'link') {
                  revisionHashesWithLinks.push(currentRevision)
            }
      }

      // Check if the main file is a PDF with embedded aqua data
      useEffect(() => {
            const checkPdfForAquaData = async () => {
                  const mainFileObj = getAquaTreeFileObject(fileInfo)
                  if (!mainFileObj || !isPDFFile(mainFileObj.fileName)) {
                        setPdfAquaDataChecked(true)
                        return
                  }

                  try {
                        let pdfBytes: Uint8Array | null = null

                        if (typeof mainFileObj.fileContent === 'string' && isValidUrl(mainFileObj.fileContent) && isHttpUrl(mainFileObj.fileContent)) {
                              // Fetch PDF from URL
                              const response = await apiClient.get(ensureDomainUrlHasSSL(mainFileObj.fileContent), {
                                    headers: { nonce: `${session?.nonce}` },
                                    responseType: 'arraybuffer',
                              })
                              pdfBytes = new Uint8Array(response.data)
                        } else if (mainFileObj.fileContent instanceof Uint8Array) {
                              pdfBytes = mainFileObj.fileContent
                        } else if (mainFileObj.fileContent instanceof ArrayBuffer) {
                              pdfBytes = new Uint8Array(mainFileObj.fileContent)
                        }

                        if (!pdfBytes) {
                              setPdfAquaDataChecked(true)
                              return
                        }

                        const embeddedData = await extractEmbeddedAquaData(pdfBytes)
                        if (embeddedData.aquaJson && embeddedData.aquaJson.genesis && embeddedData.aquaJson.name_with_hash) {
                              setPdfHasAquaData(true)
                              setPdfEmbeddedData(embeddedData)

                              // Check if this aqua sign is already imported
                              try {
                                    // Find the genesis hash from the embedded main aqua tree
                                    const mainAquaTreeFileName = `${embeddedData.aquaJson.genesis}.aqua.json`
                                    const mainAquaTreeFile = embeddedData.aquaChainFiles.find(f => f.filename === mainAquaTreeFileName)
                                    if (mainAquaTreeFile) {
                                          const aquaTreeData = JSON.parse(mainAquaTreeFile.content)
                                          const embeddedGenesisHash = getGenesisHash(aquaTreeData)

                                          if (embeddedGenesisHash) {
                                                // Query backend for existing aqua_sign files
                                                const response = await apiClient.get(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`), {
                                                      headers: {
                                                            'Content-Type': 'application/json',
                                                            'nonce': `${session?.nonce}`,
                                                      },
                                                      params: {
                                                            claim_types: JSON.stringify(['aqua_sign']),
                                                            page: 1,
                                                            limit: 100,
                                                      }
                                                })

                                                const existingAquaSigns: ApiFileInfo[] = response.data?.aquaTrees ?? []
                                                const alreadyExists = existingAquaSigns.some((f: ApiFileInfo) => {
                                                      if (!f.aquaTree) return false
                                                      const existingGenesis = getGenesisHash(f.aquaTree)
                                                      return existingGenesis === embeddedGenesisHash
                                                })

                                                if (alreadyExists) {
                                                      setAquaSignAlreadyImported(true)
                                                }
                                          }
                                    }
                              } catch (error) {
                                    console.error('Error checking for existing aqua sign:', error)
                              }
                        }
                  } catch (error) {
                        console.error('Error checking PDF for aqua data:', error)
                  } finally {
                        setPdfAquaDataChecked(true)
                  }
            }

            setPdfAquaDataChecked(false)
            setPdfHasAquaData(false)
            setPdfEmbeddedData(null)
            setAquaSignAlreadyImported(false)
            checkPdfForAquaData()
      }, [fileInfo])

      const handleImportAquaSign = async () => {
            if (!pdfEmbeddedData?.aquaJson || importingPdf) return

            setImportingPdf(true)
            try {
                  const zip = new JSZip()
                  const assetFileNames = new Set(pdfEmbeddedData.assetFiles.map(f => f.filename))

                  zip.file('aqua.json', JSON.stringify(pdfEmbeddedData.aquaJson))

                  for (const chainFile of pdfEmbeddedData.aquaChainFiles) {
                        zip.file(chainFile.filename, chainFile.content)

                        const assetName = chainFile.filename.replace(/\.aqua\.json$/, '')
                        if (assetName !== chainFile.filename && !assetFileNames.has(assetName)) {
                              zip.file(assetName, chainFile.content)
                              assetFileNames.add(assetName)
                        }
                  }

                  for (const assetFile of pdfEmbeddedData.assetFiles) {
                        if (assetFile.content instanceof ArrayBuffer) {
                              zip.file(assetFile.filename, new Uint8Array(assetFile.content))
                        } else {
                              zip.file(assetFile.filename, assetFile.content)
                        }
                  }

                  const zipBlob = await zip.generateAsync({ type: 'blob' })
                  const mainFileObj = getAquaTreeFileObject(fileInfo)
                  const zipFile = new File([zipBlob], `${mainFileObj?.fileName ?? 'pdf'}.aqua.zip`, { type: 'application/zip' })

                  const formData = new FormData()
                  formData.append('file', zipFile)
                  formData.append('account', `${metamaskAddress}`)

                  const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_aqua_zip`)
                  await apiClient.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              nonce: session?.nonce,
                        },
                        reloadKeys: [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files],
                  })

                  const urlPath = `${backend_url}/explorer_files`
                  const url2 = ensureDomainUrlHasSSL(urlPath)
                  const filesApi = await fetchFiles(session!.address, url2, session!.nonce)
                  setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

                  toast.success('Aqua Sign imported successfully from PDF')
                  setPdfHasAquaData(false)
            } catch (error) {
                  toast.error(`Failed to import Aqua Sign: ${error}`)
            } finally {
                  setImportingPdf(false)
            }
      }

      const copyToClipboard = (text: string) => {
            navigator.clipboard.writeText(text)
      }

      return (
            <div className="max-w-4xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                        <div>
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Revision Details</h2>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total revisions: {revisionHashes.length}</p>
                        </div>
                        {/* <Badge variant="outline" className="px-3 py-1">
                    {revisionHashes.length} Total
                </Badge> */}
                  </div>

                  {/* Import Aqua Sign from PDF */}
                  {pdfAquaDataChecked && pdfHasAquaData && (
                        <Card className={`border-0 shadow-lg bg-gradient-to-br ${aquaSignAlreadyImported ? 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20' : 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'}`}>
                              <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                                <div className={`p-2 ${aquaSignAlreadyImported ? 'bg-blue-500' : 'bg-orange-500'} rounded-lg`}>
                                                      <FileSignature className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {aquaSignAlreadyImported ? 'Aqua Sign Already Imported' : 'Aqua Sign Detected in PDF'}
                                                      </h3>
                                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                                            {aquaSignAlreadyImported
                                                                  ? 'This Aqua Sign has already been imported to your files'
                                                                  : 'This PDF contains embedded Aqua chain data that can be imported'}
                                                      </p>
                                                </div>
                                          </div>
                                          {!aquaSignAlreadyImported && (
                                                <Button
                                                      data-testid="action-import-pdf-aqua-revision-button"
                                                      size="sm"
                                                      variant="outline"
                                                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                      onClick={handleImportAquaSign}
                                                      disabled={importingPdf}
                                                >
                                                      {importingPdf ? <span className="w-4 h-4 animate-spin border-2 border-green-600 border-t-transparent rounded-full mr-1" /> : <LuSave className="w-4 h-4 mr-1" />}
                                                      Import Aqua Sign
                                                </Button>
                                          )}
                                    </div>
                              </CardContent>
                        </Card>
                  )}

                  {/* Signatures Section */}
                  {revisionsWithSignatures.length === 0 ? (
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                          <FileSignature className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Signatures</h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithSignatures.length} digital signatures found</p>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                              <CardContent className="p-3">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="p-2 bg-blue-500 rounded-lg">
                                                <FileSignature className="h-5 w-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Signatures</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithSignatures.length} digital signatures found</p>
                                          </div>
                                    </div>

                                    <div className="space-y-4">
                                          <Suspense fallback={<ClipLoader size={20} color="#000000" />}>
                                                {revisionsWithSignatures.map((revision, index) => (
                                                      <WalletAddressProfile
                                                            key={`signature_${index}`}
                                                            signatureHash={revision.signature}
                                                            timestamp={displayTime(revision.local_timestamp)}
                                                            walletAddress={revision.signature_wallet_address!!}
                                                            index={index + 1}
                                                      />
                                                ))}
                                          </Suspense>
                                    </div>
                              </CardContent>
                        </Card>
                  )}

                  {/* Witnesses Section */}
                  {revisionsWithWitness.length === 0 ? (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500 rounded-lg">
                                          <Eye className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Witnesses</h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithWitness.length} witnesses found</p>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                              <CardContent className="p-3">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="p-2 bg-green-500 rounded-lg">
                                                <Eye className="h-5 w-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Witnesses</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{revisionsWithWitness.length} witnesses found</p>
                                          </div>
                                    </div>

                                    <div className="space-y-1">
                                          {revisionsWithWitness.map((revision, index) => (
                                                <div key={`witness_${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                                                      <div className="flex items-start gap-4">
                                                            <Badge variant="secondary" className="mt-1">
                                                                  {index + 1}
                                                            </Badge>

                                                            <div className="flex-1 space-y-3">
                                                                  <div className="flex items-center gap-2">
                                                                        <Network className="h-4 w-4 text-gray-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network:</span>
                                                                        <Badge variant="outline" className="capitalize">
                                                                              {formatCryptoAddress(revision.witness_network ?? '', 4, 6)}
                                                                        </Badge>
                                                                  </div>

                                                                  <div className="flex items-center gap-2">
                                                                        <Clock className="h-4 w-4 text-gray-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Timestamp:</span>
                                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{displayTime(revision.witness_timestamp?.toString() ?? '')}</span>
                                                                  </div>

                                                                  <div className="flex items-center gap-2">
                                                                        <Hash className="h-4 w-4 text-gray-500" />
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Transaction:</span>
                                                                        <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">
                                                                              {formatCryptoAddress(
                                                                                    revision.witness_transaction_hash?.startsWith('0x')
                                                                                          ? (revision.witness_transaction_hash ?? '')
                                                                                          : `0x${revision.witness_transaction_hash ?? ''}`,
                                                                                    4,
                                                                                    6
                                                                              )}
                                                                        </code>
                                                                        <Button
                                                                              variant="ghost"
                                                                              size="sm"
                                                                              onClick={() => copyToClipboard(`0x${revision.witness_transaction_hash ?? ''}`)}
                                                                              className="p-1 h-auto"
                                                                        >
                                                                              <Copy className="h-3 w-3" />
                                                                        </Button>
                                                                        <a
                                                                              href={`${WITNESS_NETWORK_MAP[revision.witness_network ?? '']}/${revision.witness_transaction_hash}`}
                                                                              target="_blank"
                                                                              rel="noopener noreferrer"
                                                                              className="inline-flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors"
                                                                        >
                                                                              <ExternalLink className="h-3 w-3" />
                                                                        </a>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                </div>
                                          ))}
                                    </div>
                              </CardContent>
                        </Card>
                  )}

                  {/* Links Section */}
                  {revisionHashesWithLinks.length === 0 ? (
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500 rounded-lg">
                                          <Link2 className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Links</h3>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">{revisionHashesWithLinks.length} file links found</p>
                                    </div>
                              </div>
                        </div>
                  ) : (
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                              <CardContent className="p-1">
                                    <div className="flex items-center gap-3 mb-4">
                                          <div className="p-2 bg-purple-500 rounded-lg">
                                                <Link2 className="h-5 w-5 text-white" />
                                          </div>
                                          <div className="flex-1">
                                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Links</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{revisionHashesWithLinks.length} file links found</p>
                                          </div>
                                    </div>

                                    <div className="space-y-4 w-full">
                                          {revisionHashesWithLinks.map((revisionHash, index) => {
                                                const revision = fileInfo!.aquaTree?.revisions[revisionHash]
                                                return (
                                                      <div key={`link_${index}`} className="bg-white px-4 dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 w-full !max-w-full overflow-hidden">
                                                            <div className="flex items-start gap-2 w-full max-w-full overflow-hidden">
                                                                  <Badge variant="default" className="mt-1">
                                                                        {index + 1}
                                                                  </Badge>

                                                                  <div className="flex-1 space-y-3 bg-yellow">
                                                                        <div className="w-full !max-w-full flex flex-wrap">
                                                                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 p-1" style={{
                                                                                    display: "block"
                                                                              }}>Linked To:</span>
                                                                              <div className="flex-1 min-w-[100px] !overflow-hidden">
                                                                                    {revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo!.fileObject)}
                                                                              </div>
                                                                        </div>

                                                                        <div className="w-full">
                                                                              {viewLinkedFile(fileInfo!, revisionHash, revision!, files.fileData, setSelectedFileInfo, isWorkFlow)}
                                                                        </div>
                                                                  </div>
                                                            </div>
                                                      </div>
                                                )
                                          })}
                                    </div>
                              </CardContent>
                        </Card>
                  )}
            </div>
      )
}

export const revisionDataHeader = (aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): React.JSX.Element => {
      const revision = aquaTree.revisions[revisionHash]

      if (revision.previous_verification_hash.length == 0) {
            return (
                  <div className="inline-flex rounded-[50px] items-center px-2.5 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 max-w-full w-full" style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: '1.2'
                  }}>
                        Genesis Revision
                  </div>
            )
      }

      if (revision.revision_type == 'link') {
            const isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
            if (isDeepLink == null) {
                  return (
                        <div className="inline-flex rounded-[50px] items-center px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 max-w-full w-full" style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              whiteSpace: 'normal',
                              lineHeight: '1.2'
                        }}>
                              {ERROR_TEXT}
                        </div>
                  )
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
                                          return (
                                                <div className="inline-flex rounded-[50px] items-center px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 max-w-full w-full" style={{
                                                      wordBreak: 'break-word',
                                                      overflowWrap: 'break-word',
                                                      whiteSpace: 'normal',
                                                      lineHeight: '1.2'
                                                }}>
                                                      Linked to {fileName}
                                                </div>
                                          )
                                    }
                              }
                        }
                  }

                  return (
                        <div className="inline-flex rounded-[50px] items-center px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 max-w-full w-full" style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              whiteSpace: 'normal',
                              lineHeight: '1.2'
                        }}>
                              {/* Deep Link previous {revision.previous_verification_hash} revisionHash {revisionHash} */}
                              Linked File Not Found
                        </div>
                  )
            } else {
                  return (
                        <div className="inline-flex rounded-[50px] items-center px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 max-w-full w-full" style={{
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                              whiteSpace: 'normal',
                              lineHeight: '1.2'
                        }}>
                              {`Linked to ${fetchLinkedFileName(aquaTree, revision)}`}
                        </div>
                  )
            }
      }

      return (
            <div className="inline-flex rounded-[50px] items-center px-2.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 max-w-full w-full capitalize" style={{
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.2'
            }}>
                  {revision.revision_type}
            </div>
      )
}

export const viewLinkedFile = (
      selectedApiFileInfo: ApiFileInfo,
      revisionHash: string,
      revision: Revision,
      apiFileInfo: ApiFileInfo[],
      updateSelectedFile: (fileInfo: ApiFileInfo) => void,
      isWorkflow: boolean
): React.JSX.Element => {
      if (revision.revision_type == 'link') {
            if (isDeepLinkRevision(selectedApiFileInfo.aquaTree!, revisionHash)) {
                  return <></>
            }

            return (
                  <Button
                        data-testid="view-linked-file"
                        onClick={() => {
                              let linkedFileName = fetchLinkedFileName(selectedApiFileInfo.aquaTree!, revision)
                              let allFileObjects = [...selectedApiFileInfo.fileObject]
                              apiFileInfo.forEach(e => {
                                    allFileObjects = [...allFileObjects, ...e.fileObject]
                              })
                              if (isWorkflow || linkedFileName == ERROR_TEXT) {
                                    linkedFileName = getFileNameWithDeepLinking(selectedApiFileInfo.aquaTree!, revisionHash, allFileObjects)
                              }

                              let fileInfoFound: ApiFileInfo | undefined = undefined
                              if (linkedFileName != ERROR_TEXT && linkedFileName != ERROR_UKNOWN) {
                                    for (const fileInfo of apiFileInfo) {
                                          const fileObject = getAquaTreeFileObject(fileInfo)
                                          if (fileObject) {
                                                if (linkedFileName == fileObject.fileName) {
                                                      fileInfoFound = fileInfo
                                                      break
                                                }
                                          }
                                    }
                                    if (fileInfoFound) {
                                          updateSelectedFile({
                                                aquaTree: fileInfoFound.aquaTree,
                                                fileObject: [...fileInfoFound.fileObject, ...allFileObjects],
                                                linkedFileObjects: [],
                                                mode: '',
                                                owner: '',
                                          })
                                    } else {
                                          for (const fileObject of allFileObjects) {
                                                if (linkedFileName == fileObject.fileName) {
                                                      let aquaTree: AquaTree | undefined = undefined
                                                      if (linkedFileName.endsWith('.aqua.json')) {
                                                            aquaTree = fileObject.fileContent as AquaTree
                                                      } else {
                                                            const fileObjCtItem = allFileObjects.find(e => e.fileName == `${linkedFileName}.aqua.json`)
                                                            if (fileObjCtItem) {
                                                                  aquaTree = fileObjCtItem.fileContent as AquaTree
                                                            }
                                                      }

                                                      if (aquaTree == undefined) {
                                                            toast.info('View not available')
                                                      } else {
                                                            updateSelectedFile({
                                                                  aquaTree: aquaTree,
                                                                  fileObject: allFileObjects,
                                                                  linkedFileObjects: [],
                                                                  mode: '',
                                                                  owner: '',
                                                            })
                                                      }
                                                      break
                                                }
                                          }
                                    }
                              } else {
                                    toast.info('Link file not found , possibly a deep link ?')
                              }
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                  >
                        <span>View File</span>
                        <ChevronRight className="h-3 w-3" />
                  </Button>
            )
      } else {
            return <></>
      }
}