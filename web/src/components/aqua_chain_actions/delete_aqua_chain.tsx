import { LuDelete } from 'react-icons/lu'
import { useEffect, useState } from 'react'
import { RevionOperation } from '../../models/RevisionOperation'
import { toast } from 'sonner'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import apiClient from '@/api/axiosInstance'
import { ensureDomainUrlHasSSL, getGenesisHash } from '@/utils/functions'
import { useStore } from 'zustand'
import appStore from '@/store'
import { API_ENDPOINTS } from '@/utils/constants'

// Separate dialog component for use at parent level
export const DeleteAquaChainDialog = ({
      open,
      onOpenChange,
      onConfirm,
      isLoading
}: {
      open: boolean
      onOpenChange: (open: boolean) => void
      onConfirm: () => void
      isLoading?: boolean
}) => {
      return (
            <AlertDialog
                  open={open}
                  onOpenChange={onOpenChange}
            >
                  <AlertDialogContent
                        onOpenAutoFocus={(e) => {
                              // Prevent auto-focus if there's already a focused element in background
                              // This helps prevent the aria-hidden accessibility issue
                              e.preventDefault()
                        }}
                  >
                        <AlertDialogHeader>
                              <AlertDialogTitle>Delete file</AlertDialogTitle>
                              <AlertDialogDescription>
                                    Are you sure you want to delete this file? Any linked files will fail in verification
                              </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                              <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    autoFocus
                              >
                                    Cancel
                              </Button>
                              <AlertDialogAction
                                    onClick={onConfirm}
                                    disabled={isLoading}
                              >
                                    {isLoading ? 'Deleting...' : 'Delete'}
                              </AlertDialogAction>
                        </AlertDialogFooter>
                  </AlertDialogContent>
            </AlertDialog>
      )
}

const LoadLinkedFiles = ({ genesisHash, allRevisionHashes }: { genesisHash: string | null, allRevisionHashes: string[] }) => {

      const { backend_url, session } = useStore(appStore)

      const [linkedFiles, setLinkedFiles] = useState<string[]>([])
      const [isLoading, setIsLoading] = useState(false)

      const loadLinkedFiles = () => {
            // We hit the backend with the genesis hash, and query for files which include this in its link option.
            if (!genesisHash || !backend_url || !session) return
            setIsLoading(true)
            const url = ensureDomainUrlHasSSL(`${backend_url}${API_ENDPOINTS.LINKED_FILES}`)
            apiClient.get(url, {
                  params: {
                        genesis_hash: genesisHash,
                        allRevisionHashes: JSON.stringify(allRevisionHashes)
                  },
                  headers: {
                        nonce: session.nonce,
                  },
            })
                  .then(response => {
                        // data.fileNames = ["file1.json", "file2.png", "file3.pdf"]
                        setLinkedFiles(response.data.fileNames)
                  })
                  .catch(error => {
                        console.error('Error fetching linked files:', error)
                  })
                  .finally(() => {
                        setIsLoading(false)
                  })
      }

      useEffect(() => {
            loadLinkedFiles()
      }, [])

      if (isLoading) {
            return (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Loading linked files...</span>
                  </div>
            )
      }

      console.log("Linked files:", linkedFiles)

      if (linkedFiles.length === 0) {
            return (
                  <p className="text-sm text-muted-foreground py-2">
                        No files are linked to this file.
                  </p>
            )
      }

      return (
            <div className="space-y-2 py-2">
                  <p className="text-sm font-medium text-destructive">
                        The following files link to this file and will fail verification if deleted:
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {linkedFiles.map((fileName, index) => (
                              <li
                                    key={index}
                                    className="text-sm text-muted-foreground flex items-center gap-2 px-2 py-1 bg-muted/50 rounded"
                              >
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                                    {fileName}
                              </li>
                        ))}
                  </ul>
            </div>
      )
}

export const DeleteAquaChain = ({ apiFileInfo, backendUrl, nonce, children, index, onDeleteClick }: RevionOperation & { onDeleteClick?: () => void }) => {
      const [deleting, setDeleting] = useState(false)
      const [isLoading, setIsloading] = useState(false)
      const [dialogOpen, setDialogOpen] = useState(false)

      const deleteFileApi = async () => {
            if (isLoading) {
                  toast('File deletion in progress')
                  return
            }
            setIsloading(true)
            setDeleting(true)
            try {
                  const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!)
                  const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
                  const url = ensureDomainUrlHasSSL(`${backendUrl}/explorer_delete_file`)
                  const response = await apiClient.post(
                        url,
                        {
                              revisionHash: lastRevisionHash,
                        },
                        {
                              headers: {
                                    nonce: nonce,
                              },
                        }
                  )

                  if (response.status === 200) {
                        setIsloading(false)
                        setDialogOpen(false)
                        toast.success('File deleted successfully')
                        refetchAllUserFiles()
                  }
            } catch (e) {
                  toast.error('File deletion error')
                  setDialogOpen(false)
                  setIsloading(false) // Add this to ensure loading state is cleared on error
            }

            setDeleting(false)
      }

      const refetchAllUserFiles = () => {
            // triggerWorkflowReload(RELOAD_KEYS.user_stats)
            triggerWorkflowReload(RELOAD_KEYS.all_files, true)
            triggerWorkflowReload(RELOAD_KEYS.user_files, true)
      }

      // If used inside dropdown, use callback pattern
      if (onDeleteClick) {
            return (
                  <div
                        data-testid={'delete-in-dropdown-button-' + index}
                        onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              onDeleteClick()
                        }}
                  >
                        {children}
                  </div>
            )
      }

      // Regular usage with dialog
      return (
            <>
                  {children ? (
                        <div
                              data-testid={'delete-in-progress-aqua-tree-button-' + index}
                              onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setDialogOpen(true)
                              }}
                        >
                              {children}
                        </div>
                  ) : (
                        <button
                              data-testid={'delete-aqua-tree-button-' + index}
                              className={`w-full flex items-center justify-center space-x-1 bg-[#FBE3E2] text-pink-700 px-3 py-2 rounded transition-colors text-xs ${deleting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#FACBCB]'}`}
                              disabled={deleting}
                              onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    setDialogOpen(true)
                              }}
                        >
                              {deleting ? (
                                    <>
                                          <svg className="animate-spin h-3 w-3 mr-1 text-pink-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                          </svg>
                                          <span>Deleting...</span>
                                    </>
                              ) : (
                                    <>
                                          <LuDelete className="w-4 h-4" />
                                          <span>Delete</span>
                                    </>
                              )}
                        </button>
                  )}

                  <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <AlertDialogContent>
                              <AlertDialogHeader>
                                    <AlertDialogTitle>Delete file</AlertDialogTitle>
                                    <AlertDialogDescription>
                                          Are you sure you want to delete this file? Any linked files will fail in verification
                                    </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div>
                                    <LoadLinkedFiles allRevisionHashes={Object.keys(apiFileInfo.aquaTree?.revisions!)} genesisHash={getGenesisHash(apiFileInfo.aquaTree!)} />
                              </div>
                              <AlertDialogFooter>
                                    <Button
                                          variant="outline"
                                          onClick={(e) => {
                                                e.stopPropagation()
                                                e.preventDefault()
                                                setDialogOpen(false)
                                          }}
                                    >
                                          Cancel
                                    </Button>
                                    <AlertDialogAction onClick={(e) => {
                                          e.stopPropagation()
                                          e.preventDefault()
                                          deleteFileApi()
                                    }} disabled={isLoading}>
                                          {isLoading ? 'Deleting...' : 'Delete'}
                                    </AlertDialogAction>
                              </AlertDialogFooter>
                        </AlertDialogContent>
                  </AlertDialog>
            </>
      )
}