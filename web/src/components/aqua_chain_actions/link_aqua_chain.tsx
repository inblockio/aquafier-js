import {LuLink2} from 'react-icons/lu'
import {useEffect, useState} from 'react'
import {
    areArraysEqual,
    capitalizeWords,
    fetchFiles,
    formatCryptoAddress,
    getAquaTreeFileObject,
    getFileName,
    getGenesisHash,
    isWorkFlowData
} from '../../utils/functions'
import {useStore} from 'zustand'
import appStore from '../../store'
import axios from 'axios'
import {ApiFileInfo} from '../../models/FileInfo'
import Aquafier, {AquaTreeWrapper, FileObject} from 'aqua-js-sdk'
import {IShareButton} from '../../types/types'
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog'

import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {AlertCircle, FileText, Link as LinkIcon, Loader2} from 'lucide-react'
import {Checkbox} from '@/components/ui/checkbox'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'

export const LinkButton = ({ item, nonce, index }: IShareButton) => {
      const { backend_url, setFiles, files, session, systemFileInfo } = useStore(appStore)
      const [isOpen, setIsOpen] = useState(false)
      const [linking, setLinking] = useState(false)
      const [primaryFileObject, setPrimaryFileObject] = useState<FileObject | null | "loading">("loading")
      const [linkItem, setLinkItem] = useState<ApiFileInfo | null>(null)


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
            setLinkItem(null)
            setIsOpen(false)
      }

      const handleLink = async () => {
            if (linkItem == null) {
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
                  const linkAquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: linkItem!.aquaTree!,
                        revision: '',
                        fileObject: primaryFileObject,
                  }
                  const result = await aquafier.linkAquaTree(aquaTreeWrapper, linkAquaTreeWrapper)

                  if (result.isErr()) {
                        toast.error(`An error occurred when linking`)
                        return
                  }

                  const newAquaTree = result.data.aquaTree!
                  const revisionHashes = Object.keys(newAquaTree.revisions)
                  const lastHash = revisionHashes[revisionHashes.length - 1]
                  const lastRevision = result.data.aquaTree?.revisions[lastHash]
                  // send to server
                  const url = `${backend_url}/tree`

                  const response = await axios.post(
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

                  if (response.status === 200 || response.status === 201) {
                        await refetchAllUserFiles()
                  }

                  toast.success(`Linking successful`)
                  setLinkItem(null)
                  setIsOpen(false)
            } catch (error) {
                  toast.error(`An error occurred`)
            }
            setLinking(false)
      }

      const refetchAllUserFiles = async () => {
            // refetch all the files to ensure the front end state is the same as the backend
            try {
                  const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce)
                  setFiles({  fileData: files, status: 'loaded'  })
            } catch (e) {
                  toast.error('Error updating files')
                  document.location.reload()
            }
      }


      const showClaimExtraInfo = (workflowInfo: { isWorkFlow: boolean; workFlow: string }, file: ApiFileInfo) => {
            if (workflowInfo?.workFlow == "identity_claim") {
                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let creatorWallet = genRevision[`forms_wallet_address`]

                  if (creatorWallet) {
                        return <div className="flex flex-nowrap text-xs text-gray-500 mt-1">
                              <p className="text-xs font-medium">Wallet:&nbsp;</p>
                              <p className="text-xs font-mono">{formatCryptoAddress(creatorWallet)}</p>
                        </div>
                  }
            }

            if (workflowInfo?.workFlow == "identity_attestation") {
                  let genesisHash = getGenesisHash(file.aquaTree!)
                  if (!genesisHash) {
                        return <div />
                  }
                  let genRevision = file.aquaTree?.revisions[genesisHash]
                  if (!genRevision) {
                        return <div />
                  }

                  let creatorWallet = genRevision[`forms_wallet_address`]
                  let claimWallet = genRevision[`forms_claim_wallet_address`]

                  if (creatorWallet) {
                        return (
                              <div className="mt-1 space-y-1">
                                    <div className="flex flex-nowrap text-xs text-gray-500">
                                          <p className="text-xs font-medium">Claim Owner:&nbsp;</p>
                                          <p className="text-xs font-mono">{formatCryptoAddress(claimWallet)}</p>
                                    </div>
                                    <div className="flex flex-nowrap text-xs text-gray-500">
                                          <p className="text-xs font-medium">Attestor Wallet:&nbsp;</p>
                                          <p className="text-xs font-mono">{formatCryptoAddress(creatorWallet)}</p>
                                    </div>
                              </div>
                        )
                  }
            }
            return <div />
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
                        <DialogContent className="[&>button]:hidden sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
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
                                                      <div className="border border-gray-200 rounded-lg overflow-hidden flex-1">
                                                            <div className="max-h-96 min-h-80 overflow-y-auto">
                                                                  
                                                                  {files?.fileData.map((itemLoop: ApiFileInfo, fileIndex: number) => {
                                                                        const keys = Object.keys(itemLoop.aquaTree!.revisions!)
                                                                        const keysPar = Object.keys(item.aquaTree!.revisions!)
                                                                        const res = areArraysEqual(keys, keysPar)
                                                                        const { isWorkFlow, workFlow } = isWorkFlowData(
                                                                              itemLoop.aquaTree!,
                                                                              systemFileInfo.map(e => getFileName(e.aquaTree!))
                                                                        )

                                                                        if (res) {
                                                                              return <div key={fileIndex}></div>
                                                                        }

                                                                        if (isWorkFlow && workFlow == 'aqua_sign') {
                                                                              const fileName = getFileName(itemLoop.aquaTree!)
                                                                              return (
                                                                                    <div key={fileIndex} className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                                                                                          <div className="flex items-center space-x-3">
                                                                                                <div className="w-5 h-5 bg-gray-300 rounded flex items-center justify-center">
                                                                                                      <FileText className="w-3 h-3 text-gray-500" />
                                                                                                </div>
                                                                                                <div className="flex-1">
                                                                                                      <p className="text-sm text-gray-500">
                                                                                                            {fileName} - This is a workflow file ({workFlow}). You can't link to it.
                                                                                                      </p>
                                                                                                </div>
                                                                                          </div>
                                                                                    </div>
                                                                              )
                                                                        }

                                                                        const fileObject = getAquaTreeFileObject(itemLoop)

                                                                        if (fileObject) {
                                                                              const isSelected = linkItem != null &&
                                                                                    Object.keys(linkItem?.aquaTree?.revisions!)[0] === Object.keys(itemLoop.aquaTree?.revisions!)[0]

                                                                              return (
                                                                                    <div
                                                                                          key={fileIndex}
                                                                                          className={`px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-200' : ''
                                                                                                }`}
                                                                                          onClick={() => {
                                                                                                if (isSelected) {
                                                                                                      setLinkItem(null)
                                                                                                } else {
                                                                                                      setLinkItem(itemLoop)
                                                                                                }
                                                                                          }}
                                                                                    >
                                                                                          <div className="flex items-start space-x-3">
                                                                                                <div className="pt-0.5">
                                                                                                      <Checkbox
                                                                                                            id={`file-${fileIndex}`}
                                                                                                            checked={isSelected}
                                                                                                            onCheckedChange={(checked) => {
                                                                                                                  if (checked === true) {
                                                                                                                        setLinkItem(itemLoop)
                                                                                                                  } else {
                                                                                                                        setLinkItem(null)
                                                                                                                  }
                                                                                                            }}
                                                                                                      />
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                      <div className="flex items-center space-x-2 mb-2">
                                                                                                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                                                                            <span className="font-medium text-sm text-gray-900 truncate">
                                                                                                                  {/* {(primaryFileObject && primaryFileObject !== "loading" ? primaryFileObject.fileName : "")} */}
                                                                                                                  {fileObject.fileName}
                                                                                                            </span>
                                                                                                      </div>

                                                                                                      {isWorkFlow && workFlow != 'aqua_sign' && (
                                                                                                            <div className="space-y-1">
                                                                                                                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                                                                                        Workflow: {capitalizeWords(workFlow.replace(/_/g, ' '))}
                                                                                                                  </div>
                                                                                                                  {showClaimExtraInfo({ isWorkFlow, workFlow }, itemLoop)}
                                                                                                            </div>
                                                                                                      )}
                                                                                                </div>
                                                                                          </div>
                                                                                    </div>
                                                                              )
                                                                        } else {
                                                                              return (
                                                                                    <div key={fileIndex} className="px-4 py-3 border-b border-gray-100 bg-red-50">
                                                                                          <div className="flex items-center space-x-3">
                                                                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                                                                                <span className="text-sm text-red-600">
                                                                                                      Error loading file
                                                                                                </span>
                                                                                          </div>
                                                                                    </div>
                                                                              )
                                                                        }
                                                                  })}
                                                            </div>
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
                                                      disabled={linking || linkItem === null}
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
                                                                  Link Files
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