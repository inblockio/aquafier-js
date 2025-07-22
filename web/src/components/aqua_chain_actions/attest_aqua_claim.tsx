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
import { Album } from "lucide-react"
import { Revision } from "aqua-js-sdk"

export const AttestAquaClaim = ({ file, index, children }: { file: ApiFileInfo, index: number, children?: React.ReactNode }) => {
    const { files, setFiles, session, backend_url, systemFileInfo } = useStore(appStore)
    const [isAttesting, setIsAttesting] = useState(false)
    const [open, setOpen] = useState(false)
    const [isLoading, setIsloading] = useState(false)
    const [aquaTreesAffected, setAquaTreesAffected] = useState<ApiFileInfo[]>([])


    const allHashes = Object.keys(file.aquaTree!.revisions!);
    let secondRevision: Revision | null = null;
    if (allHashes.length >= 2) {
        secondRevision = file.aquaTree!.revisions![allHashes[2]];
    }

    // const lastRevisionHash = allHashes[allHashes.length - 1]

    // const deleteFileApi = async () => {
    //     if (isLoading) {
    //         toast("File deletion in progress")
    //         return
    //     }
    //     setIsloading(true)
    //     setIsAttesting(true)
    //     try {
    //         const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!);
    //         const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
    //         const url = `${backendUrl}/explorer_delete_file`
    //         const response = await axios.post(url, {
    //             "revisionHash": lastRevisionHash
    //         }, {
    //             headers: {
    //                 'nonce': nonce
    //             }
    //         });

    //         if (response.status === 200) {
    //             // Close the dialog explicitly
    //             setOpen(false)
    //             setIsloading(false)
    //             toast("File deleted successfully")
    //             await refetchAllUserFiles()
    //         }
    //     } catch (e) {
    //         //  console.log(`Error ${e}`)
    //         toast.error("File deletion error")
    //         setIsloading(false) // Add this to ensure loading state is cleared on error
    //     }

    //     setIsAttesting(false)
    // }

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

    const attestAquaClaimAction = async () => {
        // check if already attested
        for (let anAquaTree of files) {
            let isWorkFlow = isWorkFlowData(anAquaTree.aquaTree!, systemFileInfo.map((e) => {
                try {
                    return getAquaTreeFileName(e.aquaTree!!)
                } catch (e) {
                    console.log("Error")
                    return ""
                }
            }));
            if (isWorkFlow && isWorkFlow.workFlow == "identity_attestation") {
                let genHash = getGenesisHash(file.aquaTree!)
                let genRevision: Revision = Object.values(anAquaTree.aquaTree?.revisions!)[0]
                if (genRevision) {
                    let identityClaimId: string | undefined = genRevision[`forms_identity_claim_id`]
                    console.log(`identityClaimId  ${identityClaimId} genHash ${genHash} fileName ${getFileName(file.aquaTree!)}`)
                    if (identityClaimId == genHash) {
                        toast.error("This file is already attested")
                        return
                    }

                    let jsonData: Record<string, any> = {}
                    let genKeys = Object.keys(genRevision)
                    for (let key of genKeys) {
                        if (key.startsWith("forms_")) {
                            jsonData[key] = genRevision[key]
                        }
                    }


                }
              
            }

        }

        // let allFilesAffected: ApiFileInfo[] = []
        // let genesisOfFileBeingDeleted = getGenesisHash(apiFileInfo.aquaTree!)
        // let fileNameBeingDeleted = getFileName(apiFileInfo.aquaTree!)

        // //check if the file is linked to any aqua chain by using the file index of an aqua tree
        //
        //     // skip the current file being deleted
        //     let genesisHash = getGenesisHash(anAquaTree.aquaTree!)
        //     if (genesisHash == genesisOfFileBeingDeleted) {
        //         console.log(`skipping ${fileNameBeingDeleted} the file is being deleted`)
        //     } else {
        //         let { isWorkFlow } = isWorkFlowData(anAquaTree.aquaTree!, systemFileInfo.map((e) => {
        //             try {
        //                 return getAquaTreeFileName(e.aquaTree!!)
        //             } catch (e) {
        //                 console.log("Error")
        //                 return ""
        //             }
        //         }));

        //         if (!isWorkFlow) {
        //             let indexValues = Object.values(anAquaTree.aquaTree!.file_index)
        //             for (let fileName of indexValues) {
        //                 if (fileNameBeingDeleted == fileName) {
        //                     allFilesAffected.push(anAquaTree)
        //                 }
        //             }
        //         }
        //     }
        // }

        // if (allFilesAffected.length == 0) {
        //     await deleteFileApi()
        // } else {
        //     setAquaTreesAffected(allFilesAffected)
        //     setOpen(true)
        // }
    }


    if (secondRevision) {
        if (secondRevision.revision_type == "signature") {
            if (secondRevision.signature_wallet_address == session?.address) {
                return null
            } else {
                return (
                    <div className="w-[100px]">
                        {
                            children ? (
                                <div data-testid={"attest-in-progress-aqua-claim-button-" + index} onClick={() => {
                                    if (!isAttesting) {
                                        attestAquaClaimAction();
                                    } else {
                                        toast("Attesting is already in progress")
                                    }
                                }}>
                                    {children}
                                </div>
                            ) : (
                                <button
                                    data-testid={"attest-aqua-claim-button-" + index}
                                    onClick={() => {
                                        if (!isAttesting) {
                                            attestAquaClaimAction();
                                        } else {
                                            toast("Attesting is already in progress")
                                        }
                                    }}
                                    className={`w-full flex items-center justify-center space-x-1 bg-[#009c6e] text-white px-3 py-2 rounded transition-colors text-xs ${isAttesting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#7ECEB7]'}`}
                                    disabled={isAttesting}
                                >
                                    {isAttesting ? (
                                        <>
                                            <svg className="animate-spin h-3 w-3 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                            </svg>
                                            <span>Attesting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Album className="w-4 h-4" />
                                            <span>Attest</span>
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
                                        // onClick={() => deleteFileApi()}
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
                    </div>
                )
            }


        } else {
            toast.error("This claim does not have a signature revision, cannot attest")
            return null;
        }
    }

    return <></>



}