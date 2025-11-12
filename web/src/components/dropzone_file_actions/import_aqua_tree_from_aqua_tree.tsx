import { LuCheck, LuChevronRight, LuImport, LuMinus, LuX } from 'react-icons/lu'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useEffect, useState } from 'react'
import { ApiFileInfo } from '../../models/FileInfo'
import { formatCryptoAddress, reorderRevisionsInAquaTree } from '../../utils/functions'
import { analyzeAndMergeRevisions } from '../../utils/aqua_funcs'
import { RevisionsComparisonResult } from '../../models/revision_merge'
import { OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk'
import { BtnContent, ImportChainFromChainProps } from '../../types/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/utils/constants'
// import { toast } from "@/components/ui/use-toast"; 
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";

export const ImportAquaChainFromChain = ({ showButtonOnly, fileInfo, isVerificationSuccessful, contractData }: ImportChainFromChainProps) => {
      const [uploading, setUploading] = useState(false)
      const [hasFetchedanyExistingChain, setHasFetchedanyExistingChain] = useState(false)
      const [_uploaded, setUploaded] = useState(false)

      const [comparisonResult, setComparisonResult] = useState<RevisionsComparisonResult | null>(null)
      const [modalOpen, setModalOpen] = useState(false)

      const [lastIdenticalRevisionHash, setLastIdenticalRevisionHash] = useState<string | null>(null)
      const [lastLocalRevisionHash, setLastLocalRevisionHash] = useState<string | null>(null)
      const [_revisionsToImport, setRevisionsToImport] = useState<Revision[]>([])
      const [updateMessage, setUpdateMessage] = useState<string | null>(null)

      const [btnText, setBtnText] = useState<BtnContent>({
            text: 'Submit chain',
            color: 'blue',
      })

      const { backend_url, session } = useStore(appStore)
      const [existingChainFile, setExistingChainFile] = useState<ApiFileInfo | null>(null)


      const importAquaChain = async () => {
            // Early check to prevent recursion if already processing
            if (uploading) return

            if (existingChainFile) {
                  let orderedExistingChain = OrderRevisionInAquaTree(existingChainFile?.aquaTree!)
                  let orderedFileToImport = OrderRevisionInAquaTree(fileInfo?.aquaTree!)
                  const existingFileRevisions = Object.keys(orderedExistingChain.revisions ?? {})
                  const fileToImportRevisions = Object.keys(orderedFileToImport.revisions ?? {})

                  const mergeResult = analyzeAndMergeRevisions(existingFileRevisions, fileToImportRevisions)
                  const _revisionsToImport: Revision[] = []

                  if (mergeResult.existingRevisionsLength < mergeResult.upcomingRevisionsLength) {
                        setUpdateMessage('Importing chain is longer than existing chain, this will add new revisions to your local chain')
                        setBtnText({
                              text: 'Update Local Chain',
                              color: 'green',
                        })
                  }

                  if (mergeResult.existingRevisionsLength > mergeResult.upcomingRevisionsLength) {
                        setUpdateMessage('Existing chain is longer than importing chain, this will delete some revisions in your local chain')
                        setBtnText({
                              text: 'Rebase Local Chain',
                              color: 'yellow',
                        })
                  }

                  if (mergeResult.existingRevisionsLength === mergeResult.upcomingRevisionsLength && mergeResult.divergences.length > 0) {
                        setUpdateMessage('Chains are different, this will merge the chains, your local revisions will be deleted up to where the chains diverge')
                        setBtnText({
                              text: 'Merge Chains',
                              color: 'red',
                        })
                  }

                  if (mergeResult.divergences.length > 0) {
                        for (let i = 0; i < mergeResult.divergences.length; i++) {
                              const div = mergeResult.divergences[i]
                              if (div.upcomingRevisionHash) {
                                    _revisionsToImport.push(fileInfo?.aquaTree?.revisions[div.upcomingRevisionHash]!)
                              }
                        }
                  }

                  setComparisonResult(mergeResult)
                  setLastIdenticalRevisionHash(mergeResult.lastIdenticalRevisionHash)
                  let lastRevision = existingFileRevisions[existingFileRevisions.length - 1]
                  setLastLocalRevisionHash(lastRevision)
                  setRevisionsToImport(_revisionsToImport)
                  setModalOpen(true)
                  return
            }

            setUploading(true)

            try {
                  const url = `${backend_url}/transfer_chain`
                  const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!)
                  const revisions = reorderedRevisions.revisions
                  const revisionHashes = Object.keys(revisions)
                  const latestRevisionHash = revisionHashes[revisionHashes.length - 1]

                  const res = await axios.post(
                        url,
                        {
                              latestRevisionHash: latestRevisionHash,
                              userAddress: contractData.sender,
                        },
                        {
                              headers: {
                                    nonce: session?.nonce,
                              },
                        }
                  )

                  if (res.status === 200) {
                        toast.success('Aqua Chain imported successfully')

                        // Use setTimeout to ensure state is updated before navigation
                        setTimeout(() => {
                              window.location.replace('/app');
                              // navigate('/app',  { replace: true })
                        }, 500)
                  } else {
                        toast.error('Failed to import chain')
                  }

                  setUploading(false)
                  setUploaded(true)
                  return
            } catch (error) {
                  setUploading(false)
                  toast.error(`Failed to import chain: ${error}`)
            }
      }

      const handleMergeRevisions = async () => {

            // Early check to prevent recursion if already processing
            if (uploading) return
            if(!hasFetchedanyExistingChain) {
                  toast.error('Please wait as we compare these chains if they are different')
                  return
            }

            try {
                  const url = `${backend_url}/merge_chain`
                  const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!)
                  // const revisions = reorderedRevisions.revisions
                  const revisionHashes = Object.keys(reorderedRevisions.revisions)
                  const latestRevisionHash = revisionHashes[revisionHashes.length - 1]

                  const res = await axios.post(
                        url,
                        {
                              latestRevisionHash: latestRevisionHash,
                              lastLocalRevisionHash: lastLocalRevisionHash,
                              currentUserLatestRevisionHash: lastIdenticalRevisionHash,
                              userAddress: contractData.sender,
                              mergeStrategy: 'replace',
                        },
                        {
                              headers: {
                                    nonce: session?.nonce,
                              },
                        }
                  )

                  if (res.status === 200) {
                        toast.success('Aqua Chain imported successfully')

                        // Use setTimeout to ensure state is updated before navigation
                        setTimeout(() => {
                              // navigate('/loading?reload=true')
                              window.location.replace('/app');
                        }, 500)
                  } else {
                        toast.error('Failed to import chain')
                  }

                  setUploading(false)
                  setUploaded(true)
                  return
            } catch (error) {
                  setUploading(false)
                  toast.error(`Failed to import chain: ${error}`)
            }
      }

      const loadExistingChainFile = async () => {
            try {
                  // Get ordered revision hashes from genesis to latest
                  const orderedRevisionHashes = reorderRevisionsInAquaTree(fileInfo.aquaTree!)
                  setUploading(true)
                  const url = `${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`
                  const res = await axios.post(url, {
                        revisionHashes: orderedRevisionHashes
                  }, {
                        headers: {
                              'Content-Type': 'application/json',
                              nonce: session?.nonce,
                        },
                  })
                  if (res.status === 200) {
                        setExistingChainFile(res.data.data)
                        setHasFetchedanyExistingChain(true)
                  }
            } catch (error) {
                  console.error('Failed to load existing chain file:', error)
                  setHasFetchedanyExistingChain(true)
            } finally {
                  setUploading(false)
            }
      }


      const getButtonVariant = (color: string) => {
            switch (color) {
                  case 'green':
                        return 'default'
                  case 'yellow':
                        return 'secondary'
                  case 'red':
                        return 'destructive'
                  default:
                        return 'default'
            }
      }

      useEffect(() => {
            if(fileInfo){
                  loadExistingChainFile()
            }
      }, [fileInfo])

      // const getTimelineItemColor = (color: string) => {
      //     switch (color) {
      //         case 'green': return 'text-green-600';
      //         case 'red': return 'text-red-600';
      //         case 'yellow': return 'text-yellow-600';
      //         case 'blue': return 'text-blue-600';
      //         case 'info': return 'text-blue-600';
      //         default: return 'text-gray-600';
      //     }
      // };

      // const TimelineItem = ({ children, color = 'gray' }: { children: React.ReactNode, color?: string }) => (
      //     <div className="flex gap-4 pb-6 last:pb-0">
      //         <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${getTimelineItemColor(color)} bg-background`}>
      //             {children}
      //         </div>
      //         <div className="flex-1 space-y-1">
      //             <div className="text-sm font-medium">{children}</div>
      //         </div>
      //     </div>
      // );
      

      return (
            <>
                  {
                        showButtonOnly ? <Button
                              data-testid="import-aqua-chain-1-button"
                              variant="default"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              size="sm"
                              onClick={importAquaChain}
                              disabled={uploading}
                        >
                              {uploading ? 'Importing...' : 'Import'}
                        </Button> : (
                              <Alert className="mb-6">
                                    <LuImport className="h-4 w-4" />
                                    <AlertTitle>Import Aqua Chain</AlertTitle>
                                    <AlertDescription>
                                          <div className="mt-4 space-y-4">
                                                <p>Do you want to import this Aqua Chain?</p>
                                                <Button data-testid="import-aqua-chain-1-button" size="lg" disabled={uploading} onClick={importAquaChain} className="w-auto cursor-pointer">
                                                      <LuImport className="mr-2 h-4 w-4" />
                                                      {uploading ? 'Importing...' : 'Import'}
                                                </Button>
                                          </div>
                                    </AlertDescription>

                                    <div className="container mx-auto max-w-4xl px-4">


                                          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                                                <DialogContent className="max-w-2xl rounded-lg">
                                                      <DialogHeader>
                                                            <DialogTitle>Aqua Chain Import</DialogTitle>
                                                      </DialogHeader>

                                                      <div className="space-y-6">
                                                            {/* Timeline */}
                                                            <div className="space-y-4">
                                                                  {/* Verification Status */}
                                                                  <div className="flex gap-4">
                                                                        <div
                                                                              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${isVerificationSuccessful ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'
                                                                                    } bg-background`}
                                                                        >
                                                                              <LuCheck className="h-4 w-4" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                              <h4 className="text-sm font-medium">Verification status</h4>
                                                                              <p className="text-sm text-muted-foreground">Verification successful</p>
                                                                        </div>
                                                                  </div>

                                                                  {/* Chains Identical */}
                                                                  {comparisonResult?.identical && (
                                                                        <div className="flex gap-4">
                                                                              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-green-600 border-green-600 bg-background">
                                                                                    <LuCheck className="h-4 w-4" />
                                                                              </div>
                                                                              <div className="flex-1">
                                                                                    <h4 className="text-sm font-medium">Chains Identical</h4>
                                                                                    <p className="text-sm text-muted-foreground">Chains are identical</p>
                                                                              </div>
                                                                        </div>
                                                                  )}

                                                                  {/* Chain Length Comparison */}
                                                                  {(comparisonResult?.existingRevisionsLength ?? 0) > (comparisonResult?.upcomingRevisionsLength ?? 0) && (
                                                                        <div className="flex gap-4">
                                                                              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-green-600 border-green-600 bg-background">
                                                                                    <LuCheck className="h-4 w-4" />
                                                                              </div>
                                                                              <div className="flex-1">
                                                                                    <h4 className="text-sm font-medium">Chain Difference</h4>
                                                                                    <p className="text-sm text-muted-foreground">Existing Chain is Longer than Upcoming Chain</p>
                                                                              </div>
                                                                        </div>
                                                                  )}

                                                                  {/* Same Length */}
                                                                  {comparisonResult?.sameLength && (
                                                                        <div className="flex gap-4">
                                                                              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-green-600 border-green-600 bg-background">
                                                                                    <LuCheck className="h-4 w-4" />
                                                                              </div>
                                                                              <div className="flex-1">
                                                                                    <h4 className="text-sm font-medium">Chains Length</h4>
                                                                                    <p className="text-sm text-muted-foreground">Chains are of same Length</p>
                                                                              </div>
                                                                        </div>
                                                                  )}

                                                                  {/* Divergences - Existing is shorter or equal */}
                                                                  {(comparisonResult?.divergences?.length ?? 0) > 0 && (comparisonResult?.existingRevisionsLength ?? 0) <= (comparisonResult?.upcomingRevisionsLength ?? 0) && (
                                                                        <>
                                                                              <div className="flex gap-4">
                                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-gray-600 border-gray-600 bg-background">
                                                                                          <LuX className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                          <h4 className="text-sm font-medium">Chains are Different</h4>
                                                                                          <div className="mt-2 space-y-1">
                                                                                                {comparisonResult?.divergences.map((diff, i: number) => (
                                                                                                      <div key={`diff_${i}`} className="text-sm">
                                                                                                            {diff.existingRevisionHash ? (
                                                                                                                  <div className="flex items-center gap-2">
                                                                                                                        <span className="line-through text-red-600">
                                                                                                                              {formatCryptoAddress(diff.existingRevisionHash ?? '', 15, 4)}
                                                                                                                        </span>
                                                                                                                        <LuChevronRight className="h-3 w-3" />
                                                                                                                        <span>{formatCryptoAddress(diff.upcomingRevisionHash ?? '', 15, 4)}</span>
                                                                                                                  </div>
                                                                                                            ) : (
                                                                                                                  <span>{formatCryptoAddress(diff.upcomingRevisionHash ?? '', 20, 4)}</span>
                                                                                                            )}
                                                                                                      </div>
                                                                                                ))}
                                                                                          </div>
                                                                                    </div>
                                                                              </div>

                                                                              <div className="flex gap-4">
                                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-blue-600 border-blue-600 bg-background">
                                                                                          <LuCheck className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                          <h4 className="text-sm font-medium">Action</h4>
                                                                                          <p className="text-sm text-muted-foreground">{btnText.text}</p>
                                                                                          <Alert className="mt-2">
                                                                                                <AlertTitle>Action Not reversible!</AlertTitle>
                                                                                                <AlertDescription>{updateMessage}</AlertDescription>
                                                                                          </Alert>
                                                                                          <div className="mt-3">
                                                                                                <Button
                                                                                                      data-testid="action-32-button"
                                                                                                      size="sm"
                                                                                                      variant={getButtonVariant(btnText.color)}
                                                                                                      onClick={handleMergeRevisions}
                                                                                                      disabled={uploading}
                                                                                                >
                                                                                                      {uploading ? 'Processing...' : btnText.text}
                                                                                                </Button>
                                                                                          </div>
                                                                                    </div>
                                                                              </div>
                                                                        </>
                                                                  )}

                                                                  {/* Divergences - Existing is longer */}
                                                                  {(comparisonResult?.divergences?.length ?? 0) > 0 && (comparisonResult?.existingRevisionsLength ?? 0) > (comparisonResult?.upcomingRevisionsLength ?? 0) && (
                                                                        <>
                                                                              <div className="flex gap-4">
                                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-gray-600 border-gray-600 bg-background">
                                                                                          <LuX className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                          <h4 className="text-sm font-medium">Chains are Different</h4>
                                                                                          <div className="mt-2 space-y-1">
                                                                                                {comparisonResult?.divergences.map((diff, i: number) => (
                                                                                                      <div key={`diff_${i}`} className="text-sm">
                                                                                                            {diff.existingRevisionHash ? (
                                                                                                                  <div className="flex items-center gap-2">
                                                                                                                        <span className="line-through text-red-600">
                                                                                                                              {formatCryptoAddress(diff.existingRevisionHash ?? '', 15, 4)}
                                                                                                                        </span>
                                                                                                                        <LuChevronRight className="h-3 w-3" />
                                                                                                                        <span>{formatCryptoAddress(diff.upcomingRevisionHash ?? '', 15, 4, 'Revision will be deleted')}</span>
                                                                                                                  </div>
                                                                                                            ) : (
                                                                                                                  <span>{formatCryptoAddress(diff.upcomingRevisionHash ?? '', 20, 4)}</span>
                                                                                                            )}
                                                                                                      </div>
                                                                                                ))}
                                                                                          </div>
                                                                                    </div>
                                                                              </div>

                                                                              <div className="flex gap-4">
                                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-blue-600 border-blue-600 bg-background">
                                                                                          <LuCheck className="h-4 w-4" />
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                          <h4 className="text-sm font-medium">Action</h4>
                                                                                          <p className="text-sm text-muted-foreground">{btnText.text}</p>
                                                                                          <Alert className="mt-2">
                                                                                                <AlertTitle>Action Not reversible!</AlertTitle>
                                                                                                <AlertDescription>{updateMessage}</AlertDescription>
                                                                                          </Alert>
                                                                                          <div className="mt-3">
                                                                                                <Button
                                                                                                      data-testid="action-67-button"
                                                                                                      size="sm"
                                                                                                      variant={getButtonVariant(btnText.color)}
                                                                                                      onClick={handleMergeRevisions}
                                                                                                      disabled={uploading}
                                                                                                >
                                                                                                      {uploading ? 'Processing...' : btnText.text}
                                                                                                </Button>
                                                                                          </div>
                                                                                    </div>
                                                                              </div>
                                                                        </>
                                                                  )}

                                                                  {/* No Action Needed */}
                                                                  {comparisonResult?.identical && comparisonResult?.sameLength && comparisonResult?.divergences.length === 0 && (
                                                                        <div className="flex gap-4">
                                                                              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-blue-600 border-blue-600 bg-background">
                                                                                    <LuMinus className="h-4 w-4" />
                                                                              </div>
                                                                              <div className="flex-1">
                                                                                    <h4 className="text-sm font-medium">Action</h4>
                                                                                    <p className="text-sm text-muted-foreground">No Action</p>
                                                                              </div>
                                                                        </div>
                                                                  )}
                                                            </div>
                                                      </div>

                                                      <DialogFooter>
                                                            <Button data-testid="action-cancel-button" variant="outline" onClick={() => setModalOpen(false)}>
                                                                  Cancel
                                                            </Button>
                                                      </DialogFooter>
                                                </DialogContent>
                                          </Dialog>
                                    </div>
                              </Alert>
                        )
                  }

            </>
      )
}
