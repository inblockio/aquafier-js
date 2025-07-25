import { ApiFileInfo } from '@/models/FileInfo'

import {
    displayTime,
    formatBytes,
    getAquaTreeFileName,
    getAquaTreeFileObject,
    getFileCategory,
    getFileExtension,
    getGenesisHash,
    isWorkFlowData,
} from '@/utils/functions'
import { FileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SignAquaChain } from '../components/aqua_chain_actions/sign_aqua_chain'
import { WitnessAquaChain } from '../components/aqua_chain_actions/witness_aqua_chain'
import { DownloadAquaChain } from '../components/aqua_chain_actions/download_aqua_chain'
import { DeleteAquaChain } from '../components/aqua_chain_actions/delete_aqua_chain'
import { ShareButton } from '../components/aqua_chain_actions/share_aqua_chain'
import { OpenAquaSignWorkFlowButton } from '../components/aqua_chain_actions/open_aqua_sign_workflow'
import { LinkButton } from '../components/aqua_chain_actions/link_aqua_chain'
import { OpenClaimsWorkFlowButton } from '@/components/aqua_chain_actions/open_identity_claim_workflow'
import { AttestAquaClaim } from '@/components/aqua_chain_actions/attest_aqua_claim'
import { OpenSelectedFileDetailsButton } from '@/components/aqua_chain_actions/details_button'
import { useStore } from 'zustand'
import appStore from '@/store'

export default function FilesListItem({
    showWorkFlowsOnly,
    file,
    index,
    systemFileInfo,
    backendUrl,
    nonce,
    viewMode = 'table',
}: {
    showWorkFlowsOnly: boolean
    file: ApiFileInfo
    index: number
    systemFileInfo: ApiFileInfo[]
    backendUrl: string
    nonce: string
    viewMode?: 'table' | 'card' | 'actions-only'
}) {
    // const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const { files } = useStore(appStore)
    const [currentFileObject, setCurrentFileObject] = useState<
        FileObject | undefined
    >(undefined)
    const [workflowInfo, setWorkFlowInfo] = useState<
        { isWorkFlow: boolean; workFlow: string } | undefined
    >(undefined)

    useEffect(() => {
        const someData = systemFileInfo.map(e => {
            try {
                return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                console.log('Error processing system file') // More descriptive
                return ''
            }
        })

        const fileObject = getAquaTreeFileObject(file)
        setCurrentFileObject(fileObject)
        const workFlow = isWorkFlowData(file.aquaTree!, someData)
        // console.log(
        //     `Workflow info for some data ${JSON.stringify(someData, null, 4)} file ${getAquaTreeFileName(file.aquaTree!)}: ${JSON.stringify(workFlow, null, 4)}`
        // )
        setWorkFlowInfo(workFlow)
    }, [])

    useEffect(() => {
        const someData = systemFileInfo.map(e => {
            try {
                return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                console.log('Error processing system file')
                return ''
            }
        })

        const fileObject = getAquaTreeFileObject(file)
        setCurrentFileObject(fileObject)
        const workFlow = isWorkFlowData(file.aquaTree!, someData)
        setWorkFlowInfo(workFlow)
    }, [file, systemFileInfo])

    const getFileInfo = () => {
        if (currentFileObject) {
            return formatBytes(currentFileObject.fileSize ?? 0)
        } else {
            return 'Not available'
        }
    }
    const getTimeInfo = () => {
        const genRevision = getGenesisHash(file.aquaTree!)
        if (genRevision) {
            const timestamp =
                file.aquaTree?.revisions?.[genRevision]?.local_timestamp
            if (timestamp) {
                return displayTime(timestamp)
            }
        } else {
            return 'Not available'
        }
    }


    
// Helper function to capitalize the first character of every word
function capitalizeWords(str: string): string {
    return str.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
    // const detailsButton = () =>{
    //         return <button onClick={() => {
    //             setOpenFileDetailsPopUp(true);
    //             setSelectedFileInfo(file);
    //         } } className="w-full flex items-center justify-center space-x-1 bg-green-100 text-green-700 px-2 py-2 rounded hover:bg-green-200 transition-colors text-xs">
    //             <LuEye className="w-4 h-4" />
    //             <span>Details</span>
    //         </button>;
    //     }
    
    const workFlowAquaSignActions = () => {
        return (
            <>
                <div className="flex flex-wrap gap-1">
                    <div className="w-[202px]">
                        <OpenAquaSignWorkFlowButton
                            item={file}
                            nonce={nonce}
                            index={index}
                        />
                    </div>

                    <div className="w-[100px]">
                        <ShareButton item={file} nonce={nonce} index={index} />
                    </div>

                    {/* Delete Button */}
                    <div className="w-[100px]">
                        <DeleteAquaChain
                            apiFileInfo={file}
                            backendUrl={backendUrl}
                            nonce={nonce}
                            revision=""
                            index={index}
                        />
                    </div>

                    {/* Download Button - Smaller width */}
                    <div className="w-[100px]">
                        <DownloadAquaChain file={file} index={index} />
                    </div>
                </div>
            </>
        )
    }

    const workFlowIdentityClaimAttestationActions = () => {
        let identityClaimfile = null
        const currentFileAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
        const currentFileRevisionHashes = Object.keys(
            currentFileAquaTree.revisions
        )
        const firstRevision =
            currentFileAquaTree.revisions[currentFileRevisionHashes[0]]

        for (let i = 0; i < files.length; i++) {
            const claimFile: ApiFileInfo = files[i]
            const aquaTree = OrderRevisionInAquaTree(claimFile.aquaTree!)
            const revisionHashes = Object.keys(aquaTree.revisions)

            if (revisionHashes[0] === firstRevision.forms_identity_claim_id) {
                identityClaimfile = claimFile
                break
            }
        }

        return (
            <>
                <div className="flex flex-wrap gap-1">
                    {identityClaimfile ? (
                        <div className="w-[202px]">
                            <OpenClaimsWorkFlowButton
                                item={identityClaimfile}
                                nonce={nonce}
                                index={index}
                            />
                        </div>
                    ) : null}
                    <div className="w-[100px]">
                        <OpenSelectedFileDetailsButton
                            file={file}
                            index={index}
                        />
                    </div>

                    <div className="w-[100px]">
                        <ShareButton item={file} nonce={nonce} index={index} />
                    </div>

                    {/* Delete Button */}
                    <div className="w-[100px]">
                        <DeleteAquaChain
                            apiFileInfo={file}
                            backendUrl={backendUrl}
                            nonce={nonce}
                            revision=""
                            index={index}
                        />
                    </div>

                    {/* Download Button - Smaller width */}
                    <div className="w-[100px]">
                        <DownloadAquaChain file={file} index={index} />
                    </div>
                </div>
            </>
        )
    } 
    const workFlowIdentityClaimActions = () => {
        return (
            <>
                <div className="flex flex-wrap gap-1">
                    <div className="w-[202px]">
                        <OpenClaimsWorkFlowButton
                            item={file}
                            nonce={nonce}
                            index={index}
                        />
                    </div>

                    <div className="w-[100px]">
                        <AttestAquaClaim file={file} index={index} />
                    </div>

                    <div className="w-[100px]">
                        <OpenSelectedFileDetailsButton
                            file={file}
                            index={index}
                        />
                    </div>

                    <div className="w-[100px]">
                        <ShareButton item={file} nonce={nonce} index={index} />
                    </div>

                    {/* Delete Button */}
                    <div className="w-[100px]">
                        <DeleteAquaChain
                            apiFileInfo={file}
                            backendUrl={backendUrl}
                            nonce={nonce}
                            revision=""
                            index={index}
                        />
                    </div>

                    {/* Download Button - Smaller width */}
                    <div className="w-[100px]">
                        <DownloadAquaChain file={file} index={index} />
                    </div>

                     {/* Link Button */}
                    <div className="w-[100px]">
                        <LinkButton item={file} nonce={nonce} index={index} />
                    </div>
                </div>
            </>
        )
    }

    const showActionsButton = () => {
        console.log(
            `workflowInfo data ${JSON.stringify(workflowInfo, null, 4)}`
        )
        if (
            workflowInfo?.isWorkFlow == true &&
            workflowInfo.workFlow == 'aqua_sign'
        ) {
            return workFlowAquaSignActions()
        }
        if (
            workflowInfo?.isWorkFlow == true &&
            workflowInfo.workFlow == 'identity_claim'
        ) {
            return workFlowIdentityClaimActions()
        }

        if (
            workflowInfo?.isWorkFlow == true &&
            workflowInfo.workFlow == 'identity_attestation'
        ) {
            return workFlowIdentityClaimAttestationActions()
        }
        return workFileActions()
    }

    const workFileActions = () => {
        return (
            <>
                {/* Grid layout for action buttons with equal widths */}
                <div className="flex flex-wrap gap-1">
                    {/* Details Button */}
                    <div className="w-[100px]">
                        <OpenSelectedFileDetailsButton
                            file={file}
                            index={index}
                        />
                    </div>

                    {/* Sign Button */}
                    <div className="w-[100px]">
                        <SignAquaChain
                            apiFileInfo={file}
                            backendUrl={backendUrl}
                            nonce={nonce}
                            revision=""
                            index={index}
                        />
                    </div>

                    {/* Witness Button */}
                    <div className="w-[100px]">
                        <WitnessAquaChain
                            apiFileInfo={file}
                            backendUrl={backendUrl}
                            nonce={nonce}
                            revision=""
                            index={index}
                        />
                    </div>

                    {/* Link Button */}
                    <div className="w-[100px]">
                        <LinkButton item={file} nonce={nonce} index={index} />
                    </div>

                    {/* Share Button */}
                    <div className="w-[100px]">
                        <ShareButton item={file} nonce={nonce} index={index} />
                    </div>

                    {/* Delete Button */}
                    <div className="w-[100px]">
                        <DeleteAquaChain
                            apiFileInfo={file}
                            backendUrl={backendUrl}
                            nonce={nonce}
                            revision=""
                            index={index}
                        />
                    </div>

                    {/* Download Button */}
                    <div className="w-[100px]">
                        <DownloadAquaChain file={file} index={index} />
                    </div>
                </div>

                {/* Third row - 1 smaller button */}
                {/* <div className="flex">
                        
                    </div> */}
            </>
        )
    }
    const renderTableView = () => {
        return (
            <tr
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50"
            >
                <td className="py-3 flex items-center px-4">
                    {/* <FileText className="w-5 h-5 text-blue-500" /> */}
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">
                            {getAquaTreeFileName(file.aquaTree!)}
                        </span>
                        {
                            !showWorkFlowsOnly && workflowInfo?.isWorkFlow ? (
                                <span className="text-xs text-gray-500">    
                                    Workflow :  {capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' '))}
                                </span> 
                            ) : null
                        }
                    </div>
                </td>

               
                {
                    showWorkFlowsOnly ? (
                        <td className="py-3 px-3 text-sm text-gray-500">
                            {workflowInfo?.workFlow || 'Not a workflow'}
                        </td>
                    ) : null
                }
                <td className="py-3 text-sm text-gray-500">
                    {getFileCategory(
                        getFileExtension(getAquaTreeFileName(file.aquaTree!))
                    )}
                </td>
                <td className="py-3 text-sm text-gray-500">
                    {(() => {
                        const genRevision = getGenesisHash(file.aquaTree!)
                        if (genRevision) {
                            const timestamp =
                                file.aquaTree?.revisions?.[genRevision]
                                    ?.local_timestamp
                            if (timestamp) {
                                return displayTime(timestamp)
                            }
                        }
                        return 'Not available'
                    })()}
                </td>
                <td className="py-3 text-sm text-gray-500">
                    {(() => {
                        const fileObject = getAquaTreeFileObject(file)
                        if (fileObject) {
                            return formatBytes(fileObject.fileSize ?? 0)
                        }
                        return 'Not available'
                    })()}
                </td>
                <td className="py-3">{showActionsButton()}</td>
            </tr>
        )
    }

    const renderCardView = () => {
        // if (
        //     (showWorkFlowsOnly && workflowInfo?.isWorkFlow) ||
        //     !showWorkFlowsOnly
        // ) {
            return (
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <FileText className="w-6 h-6 text-blue-500" />
                        <span className="font-medium text-gray-900 text-sm">
                            {getAquaTreeFileName(file.aquaTree!)}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-gray-500 font-medium">Type</p>
                            <p className="text-gray-700">
                                {getFileExtension(
                                    getAquaTreeFileName(file.aquaTree!)
                                )}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">Size</p>
                            <p className="text-gray-700">{getFileInfo()}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-500 font-medium">
                                Uploaded
                            </p>
                            <p className="text-gray-700">{getTimeInfo()}</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-2">
                            Actions
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {showActionsButton()}
                        </div>
                    </div>
                </div>
            )
        // }
        // return null
    }


    // return <>{showWorkFlowsOnly+"-"+workflowInfo?.isWorkFlow+"=="}</>
    // const showListItemData = () => {
        // First check if we should show this item based on workflow filter

        if(workflowInfo=== undefined) {
            return null
        }
        if (showWorkFlowsOnly && !workflowInfo?.isWorkFlow) {
            return null
        }

        // Then handle different view modes
        if (viewMode === 'table') {
            return renderTableView()
        } else if (viewMode === 'card') {
            return renderCardView()
        } else if (viewMode === 'actions-only') {
            return workFileActions()
        }

        return null
    // }

    // return <>{showListItemData()}</>
}
