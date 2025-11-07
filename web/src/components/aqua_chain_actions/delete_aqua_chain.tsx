import {LuDelete} from 'react-icons/lu'
import {useState} from 'react'
import {RevionOperation} from '../../models/RevisionOperation'
import {toast} from 'sonner'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'
import { ConfirmDeleteDialog } from '@/pages/user_settings/settings_page'
import axios from 'axios'

export const DeleteAquaChain = ({ apiFileInfo, backendUrl, nonce, children, index }: RevionOperation) => {
      const [deleting, setDeleting] = useState(false)
      const [isLoading, setIsloading] = useState(false)

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
                  const url = `${backendUrl}/explorer_delete_file`
                  const response = await axios.post(
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
                        toast.success('File deleted successfully')
                        refetchAllUserFiles()
                  }
            } catch (e) {
                  toast.error('File deletion error')
                  refetchAllUserFiles()
                  setIsloading(false) // Add this to ensure loading state is cleared on error
            }

            setDeleting(false)
      }

      const refetchAllUserFiles = () => {
            // triggerWorkflowReload(RELOAD_KEYS.user_stats)
            triggerWorkflowReload(RELOAD_KEYS.all_files, true)
            triggerWorkflowReload(RELOAD_KEYS.aqua_files, true)
      }


      return (
            <ConfirmDeleteDialog 
            deleteFunc={deleteFileApi} 
            title="Delete file" 
            description="Are you sure you want to delete this file? Any linked files will fail in verification"
            loading={isLoading}
            >
                  {children ? (
                        <div
                              data-testid={'delete-in-progress-aqua-tree-button-' + index}
                        >
                              {children}
                        </div>
                  ) : (
                        <button
                              data-testid={'delete-aqua-tree-button-' + index}
                              className={`w-full flex items-center justify-center space-x-1 bg-[#FBE3E2] text-pink-700 px-3 py-2 rounded transition-colors text-xs ${deleting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#FACBCB]'}`}
                              disabled={deleting}
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
            </ConfirmDeleteDialog>
      )
}
