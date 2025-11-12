import { LuLink2 } from 'react-icons/lu'
import { useEffect, useState } from 'react'
import {
      fetchFiles,
      getAquaTreeFileObject,
      getGenesisHash,
} from '../../utils/functions'
import { useStore } from 'zustand'
import appStore from '../../store'
import axios from 'axios'
import { ApiFileInfo } from '../../models/FileInfo'
import Aquafier, { AquaTreeWrapper, FileObject } from 'aqua-js-sdk'
import { IShareButton } from '../../types/types'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Link as LinkIcon, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import FilesList from '@/pages/files/files_list'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'

export const LinkButton = ({ item, nonce, index }: IShareButton) => {
      const { backend_url, setFiles, files, session } = useStore(appStore)
      const [isOpen, setIsOpen] = useState(false)
      const [linking, setLinking] = useState(false)
      const [primaryFileObject, setPrimaryFileObject] = useState<FileObject | null | "loading">("loading")
      const [linkItems, setLinkItems] = useState<Array<ApiFileInfo>>([])


      useEffect(() => {


            const fetchPrimaryFileObject = async () => {
                  const fileObject = getAquaTreeFileObject(item)
                  if (fileObject) {
                        setPrimaryFileObject(fileObject)
                  } else {
                        setPrimaryFileObject(null)
                  }
            }

            fetchPrimaryFileObject()
      }, [item])

      const cancelClick = () => {
            setLinkItems([])
            setIsOpen(false)
      }

      const handleLink = async () => {
            if (linkItems == null || linkItems.length == 0) {
                  toast.error(`Please select an AquaTree to link`)
                  return
            }
            if (primaryFileObject === "loading") {
                  toast.error("File is still loading, please wait a moment and try again")
                  return
            } else if (primaryFileObject === null) {
                  toast.error("Error loading file, please refresh the page and try again")
                  return
            }
            try {
                  const aquafier = new Aquafier()
                  setLinking(true)

                  const aquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: item.aquaTree!,
                        revision: '',
                        fileObject: primaryFileObject,
                  }

                  for (let i = 0; i < linkItems.length; i++) {
                        let currentItem = linkItems[i]
                        const linkAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: currentItem.aquaTree!,
                              revision: '',
                              fileObject: primaryFileObject,
                        }
                        const result = await aquafier.linkAquaTree(aquaTreeWrapper, linkAquaTreeWrapper)

                        if (result.isErr()) {
                              toast.error(`An error occurred when linking`)
                              return
                        }

                        // reassign to ensure we keep linking to the latest version
                        aquaTreeWrapper.aquaTree = result.data.aquaTree!!

                        const newAquaTree = result.data.aquaTree!
                        const revisionHashes = Object.keys(newAquaTree.revisions)
                        const lastHash = revisionHashes[revisionHashes.length - 1]
                        const lastRevision = result.data.aquaTree?.revisions[lastHash]
                        // send to server
                        const url = `${backend_url}/tree`

                        await axios.post(
                              url,
                              {
                                    revision: lastRevision,
                                    revisionHash: lastHash,
                                    orginAddress: session?.address,
                              },
                              {
                                    headers: {
                                          nonce: nonce,
                                    },
                              }
                        )


                  }
                  await refetchAllUserFiles()

                  toast.success(`Linking successful`)
                  setLinkItems([])
                  setIsOpen(false)
            } catch (error) {
                  toast.error(`An error occurred`)
            }
            setLinking(false)

            // Trigger actions
            await triggerWorkflowReload(RELOAD_KEYS.aqua_files, true)
            await triggerWorkflowReload(RELOAD_KEYS.all_files, true)
      }

      const refetchAllUserFiles = async () => {
            // refetch all the files to ensure the front end state is the same as the backend
            try {
                  const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                  setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

            } catch (e) {
                  toast.error('Error updating files')
                  document.location.reload()
            }
      }


      return (
            <>
                  {/* Link Button */}
                  <button
                        data-testid={'link-action-button-' + index}
                        onClick={() => {
                              if (primaryFileObject !== null && primaryFileObject !== "loading") {
                                    setIsOpen(true)
                              } else if (primaryFileObject === "loading") {
                                    toast.error("File is still loading, please wait a moment and try again")
                              } else {
                                    toast.error("Error loading file, please refresh the page and try again")
                              }
                        }}
                        className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded hover:bg-yellow-200 transition-colors text-xs w-full justify-center"
                  >
                        <LuLink2 className="w-4 h-4" />
                        <span>Link</span>
                  </button>

                  <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogContent className="[&>button]:hidden sm:!max-w-[85vw] sm:!w-[85vw] sm:h-[85vh] sm:max-h-[85vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
                              <DialogHeader className="px-6 py-4 border-b border-gray-200">
                                    <DialogTitle>
                                          <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-yellow-100 rounded-lg">
                                                      <LinkIcon className="w-5 h-5 text-yellow-600" />
                                                </div>
                                                <div>
                                                      <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
                                                            Link AquaTree
                                                      </h4>
                                                      <p className="text-sm text-gray-500 mt-1">
                                                            Connect {(primaryFileObject && primaryFileObject !== "loading" ? primaryFileObject.fileName : "")} to another file
                                                      </p>
                                                </div>
                                          </div>
                                    </DialogTitle>
                              </DialogHeader>

                              <div className="flex-1 px-6 py-4 space-y-6 overflow-auto">
                                    {files?.fileData.length <= 1 ? (
                                          <Alert className="border-orange-200 bg-orange-50">
                                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                                <AlertTitle className="text-orange-800">Multiple files needed</AlertTitle>
                                                <AlertDescription className="text-orange-700">
                                                      For linking to work you need multiple files, currently you only have {files?.fileData.length}.
                                                </AlertDescription>
                                          </Alert>
                                    ) : (
                                          <div className="space-y-6 flex flex-col flex-1">
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                      <div className="flex items-start space-x-3">
                                                            <div className="p-1 bg-blue-100 rounded">
                                                                  <AlertCircle className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <div className="flex-1">
                                                                  <h5 className="font-medium text-blue-900 text-sm">Important Note</h5>
                                                                  <p className="text-sm text-blue-700 mt-1">
                                                                        Once a file is linked, don't delete it otherwise it will be broken if one tries to use the Aqua tree.
                                                                  </p>
                                                            </div>
                                                      </div>
                                                </div>

                                                <div className="flex flex-col flex-1">
                                                      <h5 className="text-sm font-semibold text-gray-900 mb-4">
                                                            Select the file you want to link to:
                                                      </h5>

                                                      {/* File List */}
                                                      <div className="overflow-hidden flex-1 px-2">

                                                            <FilesList
                                                                  showFileActions={false}
                                                                  selectedFiles={linkItems} activeFile={item}
                                                                  showCheckbox={true}
                                                                  showHeader={true}
                                                                  onFileDeSelected={(file) => {
                                                                        let newData = linkItems.filter((f: ApiFileInfo) => getGenesisHash(f.aquaTree!) !== getGenesisHash(file.aquaTree!));
                                                                        setLinkItems(newData)
                                                                  }} onFileSelected={(file) => {
                                                                        setLinkItems([...linkItems, file])
                                                                  }}
                                                            />
                                                      </div>
                                                </div>

                                                {/* Loading State */}
                                                {linking && (
                                                      <div className="flex justify-center items-center py-8">
                                                            <div className="flex flex-col items-center space-y-3">
                                                                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                                  <span className="text-sm text-gray-600 font-medium">Linking files...</span>
                                                            </div>
                                                      </div>
                                                )}
                                          </div>
                                    )}
                              </div>

                              <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                                    <div className="flex justify-between w-full">
                                          <Button
                                                variant="outline"
                                                onClick={cancelClick}
                                                data-testid="link-cancel-action-button"
                                                disabled={linking}
                                          >
                                                Cancel
                                          </Button>

                                          {files?.fileData.length > 1 && (
                                                <Button
                                                      onClick={handleLink}
                                                      disabled={linking || linkItems === null || linkItems.length == 0}
                                                      data-testid="link-modal-action-button-dialog"
                                                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                                >
                                                      {linking ? (
                                                            <>
                                                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                                  Linking...
                                                            </>
                                                      ) : (
                                                            <>
                                                                  <LinkIcon className="h-4 w-4 mr-2" />
                                                                  Link Files {linkItems && linkItems.length > 0 ? `(${linkItems.length} new revisions)` : null}
                                                            </>
                                                      )}
                                                </Button>
                                          )}
                                    </div>
                              </DialogFooter>
                        </DialogContent>
                  </Dialog>
            </>
      )
}