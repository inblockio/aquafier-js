import {CustomAlert} from '@/components/ui/alert-custom'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {AquaTreeDetailsData} from '@/models/AquaTreeDetails'
import appStore from '@/store'
import {displayTime, ensureDomainUrlHasSSL, fetchFiles, formatCryptoAddress} from '@/utils/functions'
import {LogTypeEmojis} from 'aqua-js-sdk/web'
import axios from 'axios'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {LuCheck, LuTrash, LuX} from 'react-icons/lu'
import {ClipLoader} from 'react-spinners'
import {useStore} from 'zustand'
import {revisionDataHeader, viewLinkedFile} from './files_revision_details'
import {ItemDetail} from './item_details'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {Card, CardContent, CardFooter} from '@/components/ui/card'

import {ExternalLink} from 'lucide-react'
import {WITNESS_NETWORK_MAP} from '@/utils/constants'
import {WalletEnsView} from '@/components/ui/wallet_ens'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'

export const RevisionDisplay = ({ fileInfo, revision, revisionHash, isVerificationComplete, verificationResults, isDeletable, deleteRevision, index }: AquaTreeDetailsData) => {
      const { session, backend_url, files, setFiles, setSelectedFileInfo, selectedFileInfo } = useStore(appStore)
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
            let status: 'info' | 'warning' | 'success' | 'error' | 'neutral' = 'info'
            let title = 'This revision is being verified'

            if (isRevisionVerificationSuccessful !== null) {
                  if (isRevisionVerificationSuccessful) {
                        status = 'success'
                        title = 'This revision is valid'
                  } else {
                        status = 'error'
                        title = 'This revision is invalid'
                  }
            }

            return <CustomAlert type={status} title={title} description="" />
      }, [isRevisionVerificationSuccessful])

      // Memoize verification icon to prevent recreation
      const verificationStatusIcon = useMemo((): React.JSX.Element => {
            if (isRevisionVerificationSuccessful === null) {
                  return <ClipLoader color={'blue'} loading={true} size={loaderSize} aria-label="Loading Spinner" data-testid="loader" />
                  // return <ReactLoading type={'spin'} color={'blue'} height={loaderSize} width={loaderSize} />;
            }

            return isRevisionVerificationSuccessful ? (
                  <div>
                        <LuCheck />
                  </div>
            ) : (
                  <div>
                        <LuX />
                  </div>
            )
      }, [isRevisionVerificationSuccessful, loaderSize])

      // Memoize delete handler to prevent recreation on each render
      const handleDelete = useCallback(async () => {
            if (isDeleting) return // Prevent multiple clicks

            setIsDeleting(true)

            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/tree/revisions/${revisionHash}`)

                    await axios.delete(url, {
                        headers: {
                              metamask_address: session?.address,
                              nonce: session?.nonce,
                        },
                  })

                 
                        toast.success('Revision deleted')

                        // Reload files for the current user
                        if (index === 0) {
                              window.location.reload()
                        } else {
                              
                              const filesApi = await fetchFiles(session!.address, ensureDomainUrlHasSSL(`${backend_url}/explorer_files`), session!.nonce)
                              setFiles({ fileData: filesApi.files, pagination : filesApi.pagination, status: 'loaded' })


                              // we need to update the side drawer for reverification to start
                              const selectedFileDataResponse = filesApi.files.find(e => {
                                    Object.keys(e.aquaTree!.revisions!)[0] == Object.keys(selectedFileInfo!.aquaTree!.revisions)[0]
                              })
                              if (selectedFileDataResponse) {
                                    setSelectedFileInfo(selectedFileDataResponse)
                              }

                              // Remove the revision from the list of revisions
                              deleteRevision(revisionHash)
                        }

                         await triggerWorkflowReload(RELOAD_KEYS.aqua_files, true);
                                    await triggerWorkflowReload(RELOAD_KEYS.all_files, true);
                 
            } catch (error) {
                  console.error('Error deleting revision:', error)
                  toast.error('Revision not deleted ')
            } finally {
                  setIsDeleting(false)
            }
      }, [backend_url, revisionHash, session?.address, session?.nonce, index, deleteRevision, isDeleting, setFiles])

      const displayDeleteButton = (): React.JSX.Element => {
            if (isDeletable) {
                  return (
                        <Button className="rounded-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600" size="sm" variant="outline" onClick={handleDelete} disabled={isDeleting}>
                              <LuTrash />
                        </Button>
                  )
            }
            return <></>
      }

      // Keep the original function
      const revisionTypeEmoji = LogTypeEmojis[revision.revision_type]

      return (
            <div>
                  <div className="relative">
                        {/* Timeline Item */}
                        <div className="flex">
                              {/* Timeline Connector */}
                              <div className="flex flex-col items-center mt-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs " style={{ backgroundColor: returnBgColor }}>
                                          {verificationStatusIcon}
                                    </div>
                                    <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2"></div>
                              </div>

                              {/* Timeline Content */}
                              <div className="flex-1 ml-4 pb-8">
                                    <Collapsible open={showRevisionDetails} onOpenChange={setShowRevisionDetails}>
                                          <CollapsibleTrigger asChild>
                                                <div className="cursor-pointer">
                                                      <div className="flex items-center justify-between flex-nowrap">
                                                            <div className="flex items-center gap-2 ">
                                                                  <span className="capitalize w-48 truncate">
                                                                        {`${revisionTypeEmoji ? revisionTypeEmoji : ''} ${revision?.revision_type} Revision`}
                                                                  </span>
                                                                  <span className="text-gray-500 dark:text-gray-400 font-mono text-sm break-all">{revisionHash}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">{displayDeleteButton()}</div>
                                                      </div>
                                                </div>
                                          </CollapsibleTrigger>

                                          <CollapsibleContent>
                                                <Card className="mt-4">
                                                      <CardContent className="p-4 text-sm leading-relaxed">
                                                            <div className="space-y-6 max-w-md">
                                                                  {/* File/Form/Link Revision */}
                                                                  {(revision.revision_type === 'file' || revision.revision_type === 'form' || revision.revision_type === 'link') && (
                                                                        <div className="flex">
                                                                              <div className="flex flex-col items-center">
                                                                                    <div
                                                                                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                                                                          style={{
                                                                                                backgroundColor: returnBgColor,
                                                                                          }}
                                                                                    >
                                                                                          {verificationStatusIcon}
                                                                                    </div>
                                                                              </div>
                                                                              <div className="flex-1 ml-4 space-y-2">
                                                                                    <h4 className="font-semibold">{revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo.fileObject)}</h4>
                                                                                    <p className="text-gray-600 dark:text-gray-400">
                                                                                          {displayTime(revision.local_timestamp)}
                                                                                          &nbsp;(UTC)
                                                                                    </p>
                                                                                    {revision.revision_type === 'file' && (
                                                                                          <ItemDetail
                                                                                                label="File Hash:"
                                                                                                displayValue={formatCryptoAddress(revision.file_hash!, 10, 15)}
                                                                                                value={revision.file_hash!}
                                                                                                showCopyIcon={true}
                                                                                          />
                                                                                    )}
                                                                                    {viewLinkedFile(fileInfo!, revisionHash, revision, files.fileData, setSelectedFileInfo, false)}
                                                                              </div>
                                                                        </div>
                                                                  )}

                                                                  {/* Signature Revision */}
                                                                  {revision.revision_type === 'signature' && (
                                                                        <div className="flex">
                                                                              <div className="flex flex-col items-center">
                                                                                    <div
                                                                                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                                                                          style={{
                                                                                                backgroundColor: returnBgColor,
                                                                                          }}
                                                                                    >
                                                                                          {verificationStatusIcon}
                                                                                    </div>
                                                                              </div>
                                                                              <div className="flex-1 ml-4 space-y-2">
                                                                                    <h4 className="font-semibold">
                                                                                          <span>
                                                                                                Revision signature is
                                                                                                {verificationStatusText}
                                                                                          </span>
                                                                                    </h4>
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
                                                                              </div>
                                                                        </div>
                                                                  )}

                                                                  {/* Witness Revision */}
                                                                  {revision.revision_type === 'witness' && (
                                                                        <div className="flex">
                                                                              <div className="flex flex-col items-center">
                                                                                    <div
                                                                                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                                                                                          style={{
                                                                                                backgroundColor: returnBgColor,
                                                                                          }}
                                                                                    >
                                                                                          {verificationStatusIcon}
                                                                                    </div>
                                                                              </div>
                                                                              <div className="flex-1 ml-4 space-y-2">
                                                                                    <h4 className="font-semibold">
                                                                                          <span>
                                                                                                Revision witness is &nbsp;
                                                                                                {verificationStatusText}
                                                                                          </span>
                                                                                    </h4>

                                                                                    {revision.witness_sender_account_address && (
                                                                                          <ItemDetail
                                                                                                label="Network:"
                                                                                                displayValue={formatCryptoAddress(revision.witness_network, 4, 6)}
                                                                                                value={revision.witness_network!}
                                                                                                showCopyIcon={false}
                                                                                          />
                                                                                    )}

                                                                                    {revision.witness_sender_account_address && (
                                                                                          <ItemDetail
                                                                                                label="Witness Account:"
                                                                                                displayValue={formatCryptoAddress(revision.witness_sender_account_address, 4, 6)}
                                                                                                value={revision.witness_sender_account_address!}
                                                                                                showCopyIcon={true}
                                                                                          />
                                                                                    )}

                                                                                    {revision.witness_transaction_hash && (
                                                                                          <div className="flex items-center gap-2">
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
                                                                                                      href={`${WITNESS_NETWORK_MAP[revision.witness_network!]}/${revision.witness_transaction_hash}`}
                                                                                                      target="_blank"
                                                                                                      rel="noopener noreferrer"
                                                                                                      className="inline-flex items-center justify-center text-blue-500 hover:text-blue-600 transition-colors"
                                                                                                >
                                                                                                      <ExternalLink size={20} />
                                                                                                </a>
                                                                                          </div>
                                                                                    )}

                                                                                    <ItemDetail
                                                                                          label="Contract address:"
                                                                                          displayValue={formatCryptoAddress(revision.witness_smart_contract_address, 4, 6)}
                                                                                          value={revision.witness_smart_contract_address!}
                                                                                          showCopyIcon={true}
                                                                                    />
                                                                              </div>
                                                                        </div>
                                                                  )}
                                                            </div>
                                                      </CardContent>
                                                      <CardFooter className="p-4 pt-0">{displayAlert}</CardFooter>
                                                </Card>
                                          </CollapsibleContent>
                                    </Collapsible>
                              </div>
                        </div>
                  </div>
            </div>
      )
}
