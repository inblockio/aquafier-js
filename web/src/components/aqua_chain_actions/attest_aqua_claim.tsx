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
    const { files, session, openCreateClaimAttestationPopUp, setOpenCreateClaimAttestationPopUp, setSelectedFileInfo, systemFileInfo } = useStore(appStore)
    // const [isAttesting, setIsAttesting] = useState(false)
    // const [open, setOpen] = useState(false)
    // const [isLoading, setIsloading] = useState(false)
    // const [aquaTreesAffected, setAquaTreesAffected] = useState<ApiFileInfo[]>([])


    const allHashes = Object.keys(file.aquaTree!.revisions!);
    let secondRevision: Revision | null = null;
    if (allHashes.length >= 2) {
        secondRevision = file.aquaTree!.revisions![allHashes[2]];
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

        setSelectedFileInfo(file)
        setOpenCreateClaimAttestationPopUp(true);


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
                                    if (!openCreateClaimAttestationPopUp) {
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
                                        if (!openCreateClaimAttestationPopUp) {
                                            attestAquaClaimAction();
                                        } else {
                                            toast("Attesting is already in progress")
                                        }
                                    }}
                                    className={`w-full flex items-center justify-center space-x-1 bg-[#009c6e] text-white px-3 py-2 rounded transition-colors text-xs ${openCreateClaimAttestationPopUp ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#7ECEB7]'}`}
                                // disabled={openCreateClaimAttestationPopUp}
                                >
                                    {openCreateClaimAttestationPopUp ? (
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