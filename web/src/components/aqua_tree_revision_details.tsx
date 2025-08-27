import { useState, useEffect, useCallback, useMemo } from 'react'
import { LuCheck, LuExternalLink, LuTrash, LuX } from 'react-icons/lu'
import {
      displayTime,
      formatCryptoAddress,
      fetchLinkedFileName,
      getFileNameWithDeepLinking,
      fetchFiles,
      getAquaTreeFileObject,
      isDeepLinkRevision,
      isAquaTree,
      getGenesisHash,
      ensureDomainUrlHasSSL,
} from '../utils/functions'
import { AquaTree, FileObject, LogTypeEmojis, Revision } from 'aqua-js-sdk'
import { ClipLoader } from 'react-spinners'
import { ERROR_TEXT, WITNESS_NETWORK_MAP, ERROR_UKNOWN } from '../utils/constants'
import { AquaTreeDetailsData, RevisionDetailsSummaryData } from '../models/AquaTreeDetails'

import { ItemDetail } from './item_details'
import appStore from '../store'
import { useStore } from 'zustand'
import axios from 'axios'
import { toast } from 'sonner'
import { ApiFileInfo } from '../models/FileInfo'
import React from 'react'

// Import /components/ UI components
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// Custom Timeline components using Tailwind
const TimelineRoot = ({ children, className, size = 'md', variant = 'default' }: { children: React.ReactNode; className?: string; size?: 'sm' | 'md' | 'lg'; variant?: 'default' | 'subtle' }) => {
      const sizeClasses = {
            sm: 'space-y-2 pl-4 before:left-1.5',
            md: 'space-y-3 pl-5 before:left-2',
            lg: 'space-y-4 pl-6 before:left-2.5',
      }

      const variantClasses = {
            default: 'before:bg-gray-300',
            subtle: 'before:bg-gray-200',
      }

      return <div className={cn('relative before:absolute before:top-2 before:h-[calc(100%-16px)] before:w-0.5', sizeClasses[size], variantClasses[variant], className)}>{children}</div>
}

const TimelineItem = ({ children }: { children: React.ReactNode }) => {
      return <div className="relative mb-4">{children}</div>
}

const TimelineConnector = ({ children, bg }: { children: React.ReactNode; bg: string; color: string }) => {
      const bgColorMap: Record<string, string> = {
            'gray.400': 'bg-gray-400',
            green: 'bg-green-500',
            red: 'bg-red-500',
            yellow: 'bg-yellow-500',
      }

      return <div className={cn('absolute left-[-8px] top-0 flex h-4 w-4 items-center justify-center rounded-full', bgColorMap[bg] || 'bg-blue-500')}>{children}</div>
}

const TimelineContent = ({ children, gap }: { children: React.ReactNode; gap?: string }) => {
      const gapMap: Record<string, string> = {
            '2': 'space-y-2',
            '4': 'space-y-4',
      }

      return <div className={cn('ml-6', gapMap[gap || '2'])}>{children}</div>
}

const TimelineTitle = ({ children, onClick, cursor }: { children: React.ReactNode; onClick?: () => void; cursor?: string }) => {
      return (
            <div className={cn('font-medium text-gray-900 dark:text-gray-100', cursor === 'pointer' && 'cursor-pointer')} onClick={onClick}>
                  {children}
            </div>
      )
}

const TimelineDescription = ({ children }: { children: React.ReactNode }) => {
      return <div className="text-sm text-gray-500 dark:text-gray-400">{children}</div>
}

// Custom For component replacement
export const For = <T extends any>({ each, children }: { each: T[]; children: (item: T, index: number) => React.ReactNode }) => {
      return <>{each.map((item, index) => children(item, index))}</>
}

// Custom WalletEnsView component
const WalletEnsView = ({ walletAddress }: { walletAddress: string }) => {
      return (
            <div className="flex items-center space-x-2 font-mono text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Wallet:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCryptoAddress(walletAddress, 4, 6)}</span>
            </div>
      )
}

const viewLinkedFile = (
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
                        variant="outline"
                        size="sm"
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
                                                            console.log(`show  ${linkedFileName}  filw object ${JSON.stringify(fileObject, null, 4)}`)
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
                                    toast.info('Link file not found, possibly a deep link?')
                              }
                        }}
                  >
                        View File
                  </Button>
            )
      } else {
            return <></>
      }
}

const revisionDataHeader = (aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): React.JSX.Element => {
      const revision = aquaTree.revisions[revisionHash]

      if (revision.previous_verification_hash.length == 0) {
            return <span className="font-medium">Genesis Revision</span>
      }

      if (revision.revision_type == 'link') {
            const isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
            if (isDeepLink == null) {
                  return <span>{ERROR_TEXT}</span>
            }
            if (isDeepLink) {
                  // before returning deep link we traverse the current aqua tree
                  const aquaTreeFiles = fileObject.filter(file => isAquaTree(file.fileContent))
                  console.log(`👁️‍🗨️ aquaTreeFiles ${aquaTreeFiles.length} --  `)
                  if (aquaTreeFiles.length > 0) {
                        const aquaTreePick = aquaTreeFiles.find(e => {
                              const tree: AquaTree = e.fileContent as AquaTree
                              const allHashes = Object.keys(tree.revisions)

                              console.log(`👁️‍🗨️ aquaTreeFiles ${allHashes.toString()} == ${revisionHash} `)
                              return allHashes.includes(revision.link_verification_hashes![0]!)
                        })

                        console.log(`👁️‍🗨️ aquaTreePick ${JSON.stringify(aquaTreePick, null, 4)} `)
                        if (aquaTreePick) {
                              const tree: AquaTree = aquaTreePick.fileContent as AquaTree
                              const genesisHash = getGenesisHash(tree)

                              console.log(`👁️‍🗨️  genesisHash ${genesisHash}`)
                              if (genesisHash) {
                                    const fileName = tree.file_index[genesisHash]
                                    console.log(`👁️‍🗨️ fileName ${fileName}`)

                                    if (fileName) {
                                          return <span className="text-md">Linked to {fileName}</span>
                                    }
                              }
                        }
                  }

                  return (
                        <span className="text-sm">
                              Deep Link previous {revision.previous_verification_hash} revisionHash {revisionHash}
                        </span>
                  )
            } else {
                  return <span className="text-md">linked to {fetchLinkedFileName(aquaTree, revision)}</span>
            }
      }

      return <span className="text-sm">{revision.revision_type}</span>
}

export const RevisionDisplay = ({ fileInfo, revision, revisionHash, isVerificationComplete, verificationResults, isDeletable, deleteRevision, index }: AquaTreeDetailsData) => {
      const { session, backend_url, files, setFiles, setSelectedFileInfo } = useStore(appStore)
      const [showRevisionDetails, setShowRevisionDetails] = useState(false)
      const [isRevisionVerificationSuccessful, setIsRevisionVerificationSuccessful] = useState<boolean | null>(null)
      const [isDeleting, setIsDeleting] = useState(false)

      const loaderSize = '40px'

      // Memoize background color calculation
      const returnBgColor = useMemo((): string => {
            if (!isVerificationComplete) {
                  return 'gray.400'
            }
            const revisionVerificationResult = verificationResults.find(item => item.hash === revisionHash)
            if (revisionVerificationResult === undefined) {
                  return 'yellow'
            }
            return revisionVerificationResult.isSuccessful ? 'green' : 'red'
      }, [isVerificationComplete, verificationResults, revisionHash])

      // Run verification check when necessary
      useEffect(() => {
            const checkVerification = () => isVerificationSuccessful()
            checkVerification()
      }, [isVerificationComplete, verificationResults])

      // Memoize verification status calculation and update state only when needed
      const isVerificationSuccessful = useCallback((): boolean | null => {
            const currentRevisionResult = verificationResults.find(item => item.hash === revisionHash)

            let verificationStatus: boolean | null = null

            if (!isVerificationComplete) {
                  verificationStatus = null
            } else if (currentRevisionResult === undefined) {
                  verificationStatus = null
            } else {
                  verificationStatus = currentRevisionResult.isSuccessful ? true : false
            }

            // Only update state if it's different to avoid unnecessary re-renders
            if (verificationStatus !== isRevisionVerificationSuccessful) {
                  setIsRevisionVerificationSuccessful(verificationStatus)
            }

            return verificationStatus
      }, [verificationResults, revisionHash, isVerificationComplete, isRevisionVerificationSuccessful])

      // Memoize status text to prevent recalculation
      const verificationStatusText = useMemo((): string => {
            if (isRevisionVerificationSuccessful === null) {
                  return 'loading'
            }
            return isRevisionVerificationSuccessful ? 'Valid' : 'Invalid'
      }, [isRevisionVerificationSuccessful])

      // Memoize alert component to prevent recreation
      const displayAlert = useMemo((): React.JSX.Element => {
            let alertVariant = 'bg-blue-50 border-blue-200 text-blue-700'
            let title = 'This revision is being verified'

            if (isRevisionVerificationSuccessful !== null) {
                  if (isRevisionVerificationSuccessful) {
                        alertVariant = 'bg-green-50 border-green-200 text-green-700'
                        title = 'This revision is valid'
                  } else {
                        alertVariant = 'bg-red-50 border-red-200 text-red-700'
                        title = 'This revision is invalid'
                  }
            }

            return (
                  <Alert className={alertVariant}>
                        <AlertTitle>{title}</AlertTitle>
                  </Alert>
            )
      }, [isRevisionVerificationSuccessful])

      // Memoize verification icon to prevent recreation
      const verificationStatusIcon = useMemo((): React.JSX.Element => {
            if (isRevisionVerificationSuccessful === null) {
                  return (
                        <div className="flex items-center justify-center w-full h-full">
                              <ClipLoader color={'blue'} loading={true} size={loaderSize} aria-label="Loading Spinner" data-testid="loader" />
                        </div>
                  )
            }

            return isRevisionVerificationSuccessful ? (
                  <div className="text-white">
                        <LuCheck className="h-3 w-3" />
                  </div>
            ) : (
                  <div className="text-white">
                        <LuX className="h-3 w-3" />
                  </div>
            )
      }, [isRevisionVerificationSuccessful, loaderSize])

      // Memoize delete handler to prevent recreation on each render
      const handleDelete = useCallback(async () => {
            if (isDeleting) return // Prevent multiple clicks

            console.log('Deleting revision: ', revisionHash, index)
            setIsDeleting(true)

            try {
                 
 const url = ensureDomainUrlHasSSL(`${backend_url}/tree/revisions/${revisionHash}`)
                  const response = await axios.delete(url, {
                        headers: {
                              metamask_address: session?.address,
                              nonce: session?.nonce,
                        },
                  })

                  if (response.status === 200) {
                        toast.success('Revision deleted', {
                              description: 'The revision has been deleted',
                              duration: 3000,
                        })

                        // Reload files for the current user
                        if (index === 0) {
                              window.location.reload()
                        } else {
                              const urlPath = `${backend_url}/explorer_files`
                               const url2 = ensureDomainUrlHasSSL(urlPath)
                              const files = await fetchFiles(`${session?.address}`, url2, `${session?.nonce}`)
                              setFiles({
                                    fileData: files,
                                    status: 'loaded',
                              })

                              // we need to update the side drawer for reverification to start
                              const selectedFileData = files.find(e => {
                                    Object.keys(e.aquaTree!.revisions!)[0] == Object.keys(selectedFileData!.aquaTree!.revisions)[0]
                              })
                              if (selectedFileData) {
                                    setSelectedFileInfo(selectedFileData)
                              }

                              // Remove the revision from the list of revisions
                              deleteRevision(revisionHash)
                        }
                  } else {
                        toast.error('Revision not deleted', {
                              description: 'The revision has not been deleted',
                              duration: 3000,
                              // placement: "bottom-end"
                        })
                  }
            } catch (error) {
                  toast.error('Revision not deleted', {
                        description: 'The revision has not been deleted',
                        duration: 3000,
                        // placement: "bottom-end"
                  })
            } finally {
                  setIsDeleting(false)
            }
      }, [backend_url, revisionHash, session?.address, session?.nonce, index, deleteRevision, isDeleting, setFiles])

      const displayDeleteButton = (): React.JSX.Element => {
            if (isDeletable) {
                  return (
                        <Button variant="destructive" size="icon" className="h-6 w-6 rounded-full" onClick={handleDelete} disabled={isDeleting}>
                              <LuTrash className="h-3 w-3" />
                        </Button>
                  )
            }
            return <></>
      }

      // Keep the original function
      const revisionTypeEmoji = LogTypeEmojis[revision.revision_type]

      return (
            <div>
                  <TimelineItem>
                        <TimelineConnector bg={returnBgColor} color={'white'}>
                              {verificationStatusIcon}
                        </TimelineConnector>
                        <TimelineContent gap="4">
                              <TimelineTitle onClick={() => setShowRevisionDetails(prev => !prev)} cursor={'pointer'}>
                                    <div className="flex justify-between items-center flex-nowrap">
                                          <div className="flex items-center space-x-2">
                                                <span className="capitalize w-[200px]">{`${revisionTypeEmoji ? revisionTypeEmoji : ''} ${revision?.revision_type} Revision`}</span>
                                                <span className="text-gray-500 font-mono break-all">{revisionHash}</span>
                                          </div>
                                          <div>{displayDeleteButton()}</div>
                                    </div>
                              </TimelineTitle>
                              <Collapsible open={showRevisionDetails}>
                                    <CollapsibleContent>
                                          <div className="border rounded-md shadow-sm">
                                                <div className="p-4 text-sm leading-relaxed">
                                                      <TimelineRoot size="lg" variant="subtle" className="max-w-md">
                                                            {revision.revision_type == 'file' || revision.revision_type == 'form' || revision.revision_type == 'link' ? (
                                                                  
                                                                        <TimelineItem>
                                                                              <TimelineConnector bg={returnBgColor} color={'white'}>
                                                                                    {verificationStatusIcon}
                                                                              </TimelineConnector>

                                                                              <TimelineContent gap="2">
                                                                                    <TimelineTitle>{revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo.fileObject)}</TimelineTitle>
                                                                                    <TimelineDescription>
                                                                                          {displayTime(revision.local_timestamp)}
                                                                                          &nbsp;(UTC)
                                                                                    </TimelineDescription>
                                                                                    {revision.revision_type === 'file' ? (
                                                                                          <ItemDetail
                                                                                                label="File Hash:"
                                                                                                displayValue={formatCryptoAddress(revision.file_hash!, 10, 15)}
                                                                                                value={revision.file_hash!}
                                                                                                showCopyIcon={true}
                                                                                          />
                                                                                    ) : null}
                                                                                    {viewLinkedFile(fileInfo!, revisionHash, revision, files.fileData, setSelectedFileInfo, false)}
                                                                              </TimelineContent>
                                                                        </TimelineItem>
                                                                
                                                            ) : null}

                                                            {revision.revision_type == 'signature' ? (
                                                                  <TimelineItem>
                                                                        <TimelineConnector bg={returnBgColor} color={'white'}>
                                                                              {verificationStatusIcon}
                                                                        </TimelineConnector>
                                                                        <TimelineContent gap="2">
                                                                              <TimelineTitle>
                                                                                    <span>Revision signature is {verificationStatusText}</span>
                                                                              </TimelineTitle>
                                                                              <ItemDetail
                                                                                    label="Signature:"
                                                                                    displayValue={formatCryptoAddress(revision.signature, 4, 6)}
                                                                                    value={revision.signature}
                                                                                    showCopyIcon={true}
                                                                              />
                                                                              <ItemDetail
                                                                                    label="Signature Type:"
                                                                                    displayValue={revision.signature_type!}
                                                                                    value={revision.signature_type!}
                                                                                    showCopyIcon={true}
                                                                              />
                                                                              <WalletEnsView walletAddress={revision.signature_wallet_address!} />
                                                                              <ItemDetail
                                                                                    label="Public Key:"
                                                                                    displayValue={formatCryptoAddress(revision.signature_public_key, 4, 6)}
                                                                                    value={revision.signature_public_key!}
                                                                                    showCopyIcon={true}
                                                                              />
                                                                        </TimelineContent>
                                                                  </TimelineItem>
                                                            ) : null}

                                                            {revision.revision_type == 'witness' ? (
                                                                  <TimelineItem>
                                                                        <TimelineConnector bg={returnBgColor} color={'white'}>
                                                                              {verificationStatusIcon}
                                                                        </TimelineConnector>
                                                                        <TimelineContent gap="2">
                                                                              <TimelineTitle>
                                                                                    <span>
                                                                                          Revision witness is &nbsp;
                                                                                          {verificationStatusText}
                                                                                    </span>
                                                                              </TimelineTitle>

                                                                              {revision.witness_sender_account_address ? (
                                                                                    <ItemDetail
                                                                                          label="Network:"
                                                                                          displayValue={formatCryptoAddress(revision.witness_network, 4, 6)}
                                                                                          value={revision.witness_network!}
                                                                                          showCopyIcon={false}
                                                                                    />
                                                                              ) : null}
                                                                              {revision.witness_sender_account_address ? (
                                                                                    <ItemDetail
                                                                                          label="Witness Account:"
                                                                                          displayValue={formatCryptoAddress(revision.witness_sender_account_address, 4, 6)}
                                                                                          value={revision.witness_sender_account_address!}
                                                                                          showCopyIcon={true}
                                                                                    />
                                                                              ) : null}
                                                                              {revision.witness_transaction_hash ? (
                                                                                    <div className="flex items-center space-x-2">
                                                                                          <ItemDetail
                                                                                                label="Transaction Hash:"
                                                                                                displayValue={formatCryptoAddress(
                                                                                                      revision.witness_transaction_hash!.startsWith('0x')
                                                                                                            ? revision.witness_transaction_hash
                                                                                                            : `0x${revision.witness_transaction_hash}`,
                                                                                                      4,
                                                                                                      6
                                                                                                )}
                                                                                                value={`0x${revision.witness_transaction_hash}`}
                                                                                                showCopyIcon={true}
                                                                                          />
                                                                                          <a
                                                                                                className="outline-none"
                                                                                                href={`${WITNESS_NETWORK_MAP[revision.witness_network!]}/${revision.witness_transaction_hash}`}
                                                                                                target="_blank"
                                                                                          >
                                                                                                <div className="text-blue-500">
                                                                                                      <LuExternalLink className="h-5 w-5" />
                                                                                                </div>
                                                                                          </a>
                                                                                    </div>
                                                                              ) : null}

                                                                              <ItemDetail
                                                                                    label="Contract address:"
                                                                                    displayValue={formatCryptoAddress(revision.witness_smart_contract_address, 4, 6)}
                                                                                    value={revision.witness_smart_contract_address!}
                                                                                    showCopyIcon={true}
                                                                              />
                                                                        </TimelineContent>
                                                                  </TimelineItem>
                                                            ) : null}
                                                      </TimelineRoot>
                                                </div>
                                                <div className="p-4 border-t">{displayAlert}</div>
                                          </div>
                                    </CollapsibleContent>
                              </Collapsible>
                        </TimelineContent>
                  </TimelineItem>
            </div>
      )
}

export const RevisionDetailsSummary = ({ fileInfo, isWorkFlow }: RevisionDetailsSummaryData) => {
      const { files, setSelectedFileInfo } = useStore(appStore)
      const revisionHashes = Object.keys(fileInfo!.aquaTree!.revisions)

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

      return (
            <div className="flex flex-col items-start w-full space-y-4">
                  <p className="text-base">Revisions count: {revisionHashes.length}</p>

                  <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-lg p-4 md:p-6">
                        <h3 className="mb-2 font-semibold text-lg">Signatures ({revisionsWithSignatures.length})</h3>
                        {revisionsWithSignatures.map((revision, index) => (
                              <div key={`hash_${index}`} className="flex items-start pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                                    <Button variant="outline" size="icon" className="h-6 w-6 mr-2 flex-shrink-0">
                                          {index + 1}
                                    </Button>

                                    <div>
                                          <ItemDetail label="Signature Hash:" displayValue={formatCryptoAddress(revision.signature, 4, 6)} value={revision.signature ?? ''} showCopyIcon={true} />
                                          <WalletEnsView walletAddress={revision.signature_wallet_address!} />
                                          <ItemDetail label="Timestamp (UTC) : " displayValue={displayTime(revision.local_timestamp)} value={revision.local_timestamp ?? ''} showCopyIcon={false} />
                                    </div>
                              </div>
                        ))}
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-lg p-4 md:p-6">
                        <h3 className="mb-2 font-semibold text-lg">Witnesses ({revisionsWithWitness.length})</h3>
                        {revisionsWithWitness.map((revision, index) => (
                              <div key={`witness_${index}`} className="flex items-start pb-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                                    <Button variant="outline" size="icon" className="h-6 w-6 mr-2 flex-shrink-0">
                                          {index + 1}
                                    </Button>
                                    <div>
                                          <ItemDetail
                                                label="Network:"
                                                displayValue={formatCryptoAddress(revision.witness_network ?? '', 4, 6)}
                                                value={revision.witness_network ?? ' '}
                                                showCopyIcon={false}
                                          />
                                          <div className="my-2"></div>
                                          <ItemDetail
                                                label="Timestamp (UTC) : "
                                                displayValue={displayTime(revision.witness_timestamp?.toString() ?? '')}
                                                value={revision.witness_timestamp?.toString() ?? ''}
                                                showCopyIcon={false}
                                          />
                                          <div className="my-2"></div>

                                          <div className="flex items-center space-x-2">
                                                <ItemDetail
                                                      label="Transaction Hash:"
                                                      displayValue={formatCryptoAddress(
                                                            revision.witness_transaction_hash?.startsWith('0x')
                                                                  ? (revision.witness_transaction_hash ?? '')
                                                                  : `0x${revision.witness_transaction_hash ?? ''}`,
                                                            4,
                                                            6
                                                      )}
                                                      value={`0x${revision.witness_transaction_hash ?? ''}`}
                                                      showCopyIcon={true}
                                                />
                                                <a className="outline-none" href={`${WITNESS_NETWORK_MAP[revision.witness_network ?? '']}/${revision.witness_transaction_hash}`} target="_blank">
                                                      <div className="text-blue-500">
                                                            <LuExternalLink className="h-4 w-4" />
                                                      </div>
                                                </a>
                                          </div>
                                    </div>
                              </div>
                        ))}
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-lg p-4 md:p-6">
                        <h3 className="mb-2 font-semibold text-lg">Links ({revisionHashesWithLinks.length})</h3>
                        {revisionHashesWithLinks.map((revisionHash, index) => {
                              const revision = fileInfo!.aquaTree?.revisions[revisionHash]
                              return (
                                    <div key={`link_${index}`} className="flex items-start pb-2 mb-4 border-b border-gray-200 dark:border-gray-700 w-full">
                                          <Button variant="outline" size="icon" className="h-6 w-6 mr-2 flex-shrink-0">
                                                {index + 1}
                                          </Button>
                                          <div className="flex-1 flex flex-col">
                                                {revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo!.fileObject)}
                                                <div className="my-2"></div>
                                                {viewLinkedFile(fileInfo!, revisionHash, revision!, files.fileData, setSelectedFileInfo, isWorkFlow)}
                                          </div>
                                    </div>
                              )
                        })}
                  </div>
            </div>
      )
}

// export const ChainDetails = ({ fileInfo }: AquaTreeDetails) => {

//     // const [aquaTree, setAquaTreeData] = useState<AquaTree | null>()

//     const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])

//     const isVerificationComplete = (): boolean => verificationResults.length < Object.keys(fileInfo.aquaTree!.revisions!).length

//     useEffect(() => {
//         const verifyAquaTreeRevisions = async () => {

//             // verify revision
//             let aquafier = new Aquafier();
//             let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);
//             for (let revisionHash of revisionHashes) {
//                 let revision = fileInfo.aquaTree!.revisions![revisionHash];
//                 let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, [...fileInfo.fileObject, ...fileInfo.linkedFileObjects])

//                 // Create a new Map reference for the state update
//                 setVerificationResults(prevResults => {
//                     const newResults = [...prevResults];
//                     let existingItem = prevResults.find(item => item.hash === revisionHash)
//                     if (!existingItem) {
//                         if (verificationResult.isOk()) {
//                             newResults.push({ hash: revisionHash, isSuccessful: true });
//                         } else {
//                             newResults.push({ hash: revisionHash, isSuccessful: false });
//                         }
//                     }
//                     return newResults;
//                 });

//             }
//         }

//         verifyAquaTreeRevisions()
//     }, [fileInfo])

//     return (
//         <>
//             {
//                 fileInfo.aquaTree ? (
//                     <TimelineRoot size="lg" variant="subtle" maxW="xl">
//                         <For
//                             each={Object.keys(fileInfo.aquaTree.revisions)}
//                         >
//                             {(revisionHash, index) => (
//                                 <RevisionDisplay key={`revision_${index}`}
//                                     fileInfo={fileInfo}
//                                     revision={fileInfo.aquaTree!.revisions[revisionHash]}
//                                     revisionHash={revisionHash}
//                                     isVerificationComplete={isVerificationComplete()}
//                                     verificationResults={verificationResults}
//                                     isDeletable={index === Object.keys(fileInfo.aquaTree!.revisions!).length - 1}
//                                 />

//                             )}
//                         </For>
//                     </TimelineRoot>
//                 ) : null
//             }
//         </>
//     )
// }

// export const ChainDetailsView = ({ fileInfo, isVerificationComplete, verificationResults }: AquaTreeDetailsViewData) => {

//     return (
//         <>
//             {
//                 fileInfo.aquaTree ? (
//                     <TimelineRoot size="lg" variant="subtle" maxW="xl">
//                         <For
//                             each={Object.keys(fileInfo.aquaTree.revisions)}
//                         >
//                             {(revisionHash, index) => (
//                                 <RevisionDisplay key={`revision_${index}`}
//                                     fileInfo={fileInfo}
//                                     revision={fileInfo!.aquaTree!.revisions[revisionHash]}
//                                     revisionHash={revisionHash}
//                                     isVerificationComplete={isVerificationComplete}
//                                     verificationResults={verificationResults}
//                                     isDeletable={index === Object.keys(fileInfo.aquaTree!.revisions!).length - 1}
//                                 />

//                             )}
//                         </For>
//                     </TimelineRoot>
//                 ) : null
//             }
//         </>
//     )
// }
