import { LuDelete, LuTrash } from "react-icons/lu"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui//dialog"
import { fetchFiles, getFileName, getGenesisHash, isWorkFlowData, getAquaTreeFileName } from "../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../store"
import axios from "axios"
import { ApiFileInfo } from "../../models/FileInfo"
import { useState } from "react"
import { RevionOperation } from "../../models/RevisionOperation"
import { toast } from "sonner"

export const DeleteAquaChain = ({ apiFileInfo, backendUrl, nonce, children, index }: RevionOperation) => {
    const { files, setFiles, session, backend_url, systemFileInfo } = useStore(appStore)
    const [deleting, setDeleting] = useState(false)
    const [open, setOpen] = useState(false)
    const [isLoading, setIsloading] = useState(false)
    const [aquaTreesAffected, setAquaTreesAffected] = useState<ApiFileInfo[]>([])

    const deleteFileApi = async () => {
        if (isLoading) {
            toast("File deletion in progress")
            return
        }
        setIsloading(true)
        setDeleting(true)
        try {
            const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!);
            const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
            const url = `${backendUrl}/explorer_delete_file`
            const response = await axios.post(url, {
                "revisionHash": lastRevisionHash
            }, {
                headers: {
                    'nonce': nonce
                }
            });

            if (response.status === 200) {
                // Close the dialog explicitly
                setOpen(false)
                setIsloading(false)
                toast("File deleted successfully")
                await refetchAllUserFiles()
            }
        } catch (e) {
            //  console.log(`Error ${e}`)
            toast.error("File deletion error")
            setIsloading(false) // Add this to ensure loading state is cleared on error
        }

        setDeleting(false)
    }

    const refetchAllUserFiles = async () => {
        // refetch all the files to ensure the front end state is the same as the backend 
        try {
            const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce);
            setFiles(files);
        } catch (e) {
            //  console.log(`Error ${e}`)
            toast.error("Error updating files")
            document.location.reload()
        }
    }

    const deleteFileAction = async () => {
        let allFilesAffected: ApiFileInfo[] = []
        let genesisOfFileBeingDeleted = getGenesisHash(apiFileInfo.aquaTree!)
        let fileNameBeingDeleted = getFileName(apiFileInfo.aquaTree!)

        //check if the file is linked to any aqua chain by using the file index of an aqua tree
        for (let anAquaTree of files) {
            // skip the current file being deleted
            let genesisHash = getGenesisHash(anAquaTree.aquaTree!)
            if (genesisHash == genesisOfFileBeingDeleted) {
                console.log(`skipping ${fileNameBeingDeleted} the file is being deleted`)
            } else {
                let { isWorkFlow } = isWorkFlowData(anAquaTree.aquaTree!, systemFileInfo.map((e) => {
                    try {
                        return getAquaTreeFileName(e.aquaTree!!)
                    } catch (e) {
                        console.log("Error")
                        return ""
                    }
                }));

                if (!isWorkFlow) {
                    let indexValues = Object.values(anAquaTree.aquaTree!.file_index)
                    for (let fileName of indexValues) {
                        if (fileNameBeingDeleted == fileName) {
                            allFilesAffected.push(anAquaTree)
                        }
                    }
                }
            }
        }

        if (allFilesAffected.length == 0) {
            await deleteFileApi()
        } else {
            setAquaTreesAffected(allFilesAffected)
            setOpen(true)
        }
    }

    return (
        <>
            {
                children ? (
                    <div data-testid={"delete-in-progress-aqua-tree-button-"+index} onClick={() => {
                        if (!deleting) {
                            deleteFileAction();
                        } else {
                            toast("Signing is already in progress")
                        }
                    }}>
                        {children}
                    </div>
                ) : (
                    <button
                        data-testid={"delete-aqua-tree-button-"+index}
                        onClick={() => {
                            if (!deleting) {
                                deleteFileAction();
                            } else {
                                toast("Signing is already in progress")
                            }
                        }}
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
                                <LuDelete className="w-3 h-3" />
                                <span>Delete</span>
                            </>
                        )}
                    </button>
                )
            }

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px] ">
                    <DialogHeader>
                        <DialogTitle>This action will corrupt some file(s)</DialogTitle>
                        <DialogDescription>
                            The following aqua trees will become corrupt, as they reference the file you are about to delete
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <ol className="ml-5 mt-5 list-decimal space-y-2">
                            {aquaTreesAffected.map((apiFileInfoItem, index) => (
                                <li key={index} className="text-sm">
                                    {getFileName(apiFileInfoItem.aquaTree!) ?? "--error--"}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <DialogFooter className="flex flex-row justify-end space-x-2">
                        <Button
                            data-testid="cancel-delete-file-action-button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            data-testid="proceed-delete-file-action-button"
                            onClick={() => deleteFileApi()}
                            size="sm"
                            variant="destructive"
                            className="flex items-center space-x-1"
                        >
                            <span>Proceed to delete</span>
                            <LuTrash className="w-4 h-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}