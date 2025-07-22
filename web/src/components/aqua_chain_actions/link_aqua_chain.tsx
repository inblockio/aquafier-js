import { LuLink2 } from 'react-icons/lu'
import { useState } from 'react'
import {
    areArraysEqual,
    fetchFiles,
    getAquaTreeFileObject,
    getFileName,
    isWorkFlowData,
} from '../../utils/functions'
import { useStore } from 'zustand'
import appStore from '../../store'
import axios from 'axios'
import { ApiFileInfo } from '../../models/FileInfo'
import Aquafier, { AquaTreeWrapper } from 'aqua-js-sdk'
import { IShareButton } from '../../types/types'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/use-toast'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

export const LinkButton = ({ item, nonce, index }: IShareButton) => {
    const { backend_url, setFiles, files, session, systemFileInfo } =
        useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [linking, setLinking] = useState(false)
    const [linkItem, setLinkItem] = useState<ApiFileInfo | null>(null)

    const cancelClick = () => {
        setLinkItem(null)
        setIsOpen(false)
    }

    const handleLink = async () => {
        if (linkItem == null) {
            toast({
                description: `Please select an AquaTree to link`,
                variant: 'destructive',
            })
            return
        }
        try {
            const aquafier = new Aquafier()
            setLinking(true)
            const aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: item.aquaTree!,
                revision: '',
                fileObject: item.fileObject[0],
            }
            const linkAquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: linkItem!.aquaTree!,
                revision: '',
                fileObject: linkItem!.fileObject[0],
            }
            const result = await aquafier.linkAquaTree(
                aquaTreeWrapper,
                linkAquaTreeWrapper
            )

            if (result.isErr()) {
                toast({
                    description: `An error occurred when linking`,
                    variant: 'destructive',
                })
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

            toast({
                description: `Linking successful`,
                variant: 'default',
            })
            setLinkItem(null)
            setIsOpen(false)
        } catch (error) {
            toast({
                description: `An error occurred`,
                variant: 'destructive',
            })
        }
        setLinking(false)
    }

    const refetchAllUserFiles = async () => {
        // refetch all the files to ensure the front end state is the same as the backend
        try {
            const files = await fetchFiles(
                session!.address!,
                `${backend_url}/explorer_files`,
                session!.nonce
            )
            setFiles(files)
        } catch (e) {
            toast({
                description: 'Error updating files',
                variant: 'destructive',
            })
            document.location.reload()
        }
    }

    return (
        <>
            {/* Link Button */}
            <button
                data-testid={'link-action-button-' + index}
                onClick={() => setIsOpen(true)}
                className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded hover:bg-yellow-200 transition-colors text-xs w-full justify-center"
            >
                <LuLink2 className="w-4 h-4" />
                <span>Link</span>
            </button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            {`Link ${item.fileObject[0].fileName} To another file (Aquatree)`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {files?.length <= 1 ? (
                            <Alert className="border-orange-200 bg-orange-50">
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                                <AlertTitle className="text-orange-800">
                                    Multiple files needed
                                </AlertTitle>
                                <AlertDescription className="text-orange-700">
                                    For linking to work you need multiple files,
                                    currently you only have {files?.length}.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-4 text-left">
                                <p className="text-sm text-gray-600">
                                    {`You are about to link ${item.fileObject[0].fileName}. Once a file is linked, don't delete it otherwise it will be broken if one tries to use the Aqua tree.`}
                                </p>

                                <p className="text-sm font-medium">
                                    Select the file you want to link to.
                                </p>

                                {/* Divider */}
                                <div className="w-full h-px bg-gray-200 my-3" />

                                {/* File List */}
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {files?.map(
                                        (
                                            itemLoop: ApiFileInfo,
                                            index: number
                                        ) => {
                                            const keys = Object.keys(
                                                itemLoop.aquaTree!.revisions!
                                            )
                                            const keysPar = Object.keys(
                                                item.aquaTree!.revisions!
                                            )
                                            const res = areArraysEqual(
                                                keys,
                                                keysPar
                                            )
                                            const { isWorkFlow, workFlow } =
                                                isWorkFlowData(
                                                    itemLoop.aquaTree!,
                                                    systemFileInfo.map(e =>
                                                        getFileName(e.aquaTree!)
                                                    )
                                                )

                                            if (res) {
                                                return <div key={index}></div>
                                            }

                                            if (
                                                isWorkFlow &&
                                                workFlow == 'aqua_sign'
                                            ) {
                                                const fileName = getFileName(
                                                    itemLoop.aquaTree!
                                                )
                                                return (
                                                    <div
                                                        key={index}
                                                        className="text-sm text-gray-500"
                                                    >
                                                        {index + 1}.{' '}
                                                        {`${fileName} - This is a workflow file (${workFlow}). You can't link to it.`}
                                                    </div>
                                                )
                                            }

                                            const fileObject =
                                                getAquaTreeFileObject(itemLoop)

                                            if (fileObject) {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                                                    >
                                                        <span className="text-sm text-gray-500 min-w-[20px]">
                                                            {index + 1}.
                                                        </span>
                                                        <div className="flex items-center space-x-2 flex-1">
                                                            <Checkbox
                                                                id={`file-${index}`}
                                                                checked={
                                                                    linkItem ==
                                                                    null
                                                                        ? false
                                                                        : Object.keys(
                                                                              linkItem
                                                                                  ?.aquaTree
                                                                                  ?.revisions!
                                                                          )[0] ===
                                                                          Object.keys(
                                                                              itemLoop
                                                                                  .aquaTree
                                                                                  ?.revisions!
                                                                          )[0]
                                                                }
                                                                onCheckedChange={checked => {
                                                                    if (
                                                                        checked ===
                                                                        true
                                                                    ) {
                                                                        setLinkItem(
                                                                            itemLoop
                                                                        )
                                                                    } else {
                                                                        setLinkItem(
                                                                            null
                                                                        )
                                                                    }
                                                                }}
                                                            />
                                                            <Label
                                                                htmlFor={`file-${index}`}
                                                                className="text-sm cursor-pointer flex-1"
                                                            >
                                                                {
                                                                    itemLoop
                                                                        .fileObject[0]
                                                                        .fileName
                                                                }
                                                                {isWorkFlow ? (
                                                                    <span className="text-orange-600 text-xs ml-1">
                                                                        - This
                                                                        is a
                                                                        workflow
                                                                        file (
                                                                        {
                                                                            workFlow
                                                                        }
                                                                        ).
                                                                    </span>
                                                                ) : (
                                                                    ''
                                                                )}
                                                            </Label>
                                                        </div>
                                                    </div>
                                                )
                                            } else {
                                                return (
                                                    <div
                                                        key={index}
                                                        className="text-sm text-red-500"
                                                    >
                                                        Error loading file
                                                    </div>
                                                )
                                            }
                                        }
                                    )}
                                </div>

                                {/* Loading State */}
                                {linking && (
                                    <div className="flex justify-center items-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                        <span className="ml-2 text-sm text-gray-600">
                                            Linking files...
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={cancelClick}
                            data-testid="link-cancel-action-button"
                        >
                            Cancel
                        </Button>

                        {files?.length > 1 && (
                            <Button
                                onClick={handleLink}
                                disabled={linking || linkItem === null}
                                data-testid="link-modal-action-button-dialog"
                            >
                                {linking ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Linking...
                                    </>
                                ) : (
                                    'Link'
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
