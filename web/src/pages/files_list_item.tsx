import { ApiFileInfo } from "@/models/FileInfo";
import { displayTime, formatBytes, getAquaTreeFileName, getAquaTreeFileObject, getFileCategory, getFileExtension, getGenesisHash, isWorkFlowData } from "@/utils/functions";
import { FileObject } from "aqua-js-sdk";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react"
import { LuEye } from 'react-icons/lu';
import { SignAquaChain } from "../components/aqua_chain_actions/sign_aqua_chain";
import { WitnessAquaChain } from "../components/aqua_chain_actions/witness_aqua_chain";
import { DownloadAquaChain } from "../components/aqua_chain_actions/download_aqua_chain";
import { DeleteAquaChain } from "../components/aqua_chain_actions/delete_aqua_chain";
import { ShareButton } from "../components/aqua_chain_actions/share_aqua_chain";
import { OpenWorkflowButton } from "../components/aqua_chain_actions/open_aqua_sign_workflow";
import { LinkButton } from "../components/aqua_chain_actions/link_aqua_chain";
import appStore from "@/store";
import { useStore } from "zustand";


export default function FilesListItem({ showWorkFlowsOnly, file, index, systemFileInfo, backendUrl, nonce, viewMode = "table" }: { showWorkFlowsOnly: boolean, file: ApiFileInfo, index: number, systemFileInfo: ApiFileInfo[], backendUrl: string, nonce: string, viewMode?: "table" | "card" | "actions-only" }) {


    const { setSelectedFileInfo, setOpenFileDetailsPopUp } = useStore(appStore)

    // const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);
    const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined);
    const [workflowInfo, setWorkFlowInfo] = useState<{ isWorkFlow: boolean; workFlow: string } | undefined>(undefined);


    useEffect(() => {
        const someData = systemFileInfo.map((e) => {
            try {
                return getAquaTreeFileName(e.aquaTree!!);
            } catch (e) {
                console.log("Error processing system file"); // More descriptive
                return "";
            }
        });

        const fileObject = getAquaTreeFileObject(file);
        setCurrentFileObject(fileObject);
        const workFlow = isWorkFlowData(file.aquaTree!!, someData);
        setWorkFlowInfo(workFlow)
    }, []);

    useEffect(() => {
        const someData = systemFileInfo.map((e) => {
            try {
                return getAquaTreeFileName(e.aquaTree!!);
            } catch (e) {
                console.log("Error processing system file");
                return "";
            }
        });

        const fileObject = getAquaTreeFileObject(file);
        setCurrentFileObject(fileObject);
        const workFlow = isWorkFlowData(file.aquaTree!!, someData);
        setWorkFlowInfo(workFlow)
    }, [file, systemFileInfo]);


    const getFileInfo = () => {
        if (currentFileObject) {
            return formatBytes(currentFileObject.fileSize ?? 0)

        } else {
            return "Not available";
        }
    }
    const getTimeInfo = () => {

        let genRevision = getGenesisHash(file.aquaTree!);
        if (genRevision) {
            let timestamp = file.aquaTree?.revisions?.[genRevision]?.local_timestamp;
            if (timestamp) {
                return displayTime(timestamp);
            }
        } else {
            return "Not available";
        }
    }

    const workFileActions = () => {
        return <>
            {/* Grid layout for action buttons with equal widths */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 w-full">
                {/* Details Button */}
                <button onClick={() => {
                    setOpenFileDetailsPopUp(true)
                    setSelectedFileInfo(file)
                }} className="flex items-center justify-center space-x-1 bg-green-100 text-green-700 px-2 py-2 rounded hover:bg-green-200 transition-colors text-xs w-full">
                    <LuEye className="w-3 h-3" />
                    <span>Details</span>
                </button>

                {/* Sign Button */}
                <div className="w-full">
                    <SignAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                </div>

                {/* Witness Button */}
                <div className="w-full">
                    <WitnessAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                </div>

                {/* Link Button */}
                <div className="w-full">
                    <LinkButton item={file} nonce={nonce} index={index} />
                </div>

                {/* Share Button */}
                <div className="w-full">
                    <ShareButton item={file} nonce={nonce} index={index}/>
                </div>

                {/* Delete Button */}
                <div className="w-full">
                    <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />
                </div>

                {/* Download Button */}
                <div className="w-full">
                    <DownloadAquaChain file={file} index={index} />
                </div>
            </div>

            {/* Third row - 1 smaller button */}
            {/* <div className="flex">
                        
                    </div> */}
        </>
    }
    const workFlowActions = () => {
        return <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full">
                <OpenWorkflowButton item={file} nonce={nonce} index={index}/>

                <ShareButton item={file} nonce={nonce} index={index} />

                {/* Delete Button */}
                <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" index={index} />

                {/* Download Button - Smaller width */}
                <DownloadAquaChain file={file} index={index}/>
            </div>

        </>

    }

    const showActionsButton = () => {
        if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == "aqua_sign") {
            return workFlowActions()
        }
        return workFileActions()
    }

    const renderTableView = () => {

        return (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 flex items-center space-x-3 px-4">
                    {/* <FileText className="w-5 h-5 text-blue-500" /> */}
                    <span className="font-medium text-sm">{getAquaTreeFileName(file.aquaTree!!)}</span>
                </td>
                <td className="py-3 text-sm text-gray-500">{getFileCategory(getFileExtension(getAquaTreeFileName(file.aquaTree!!)))}</td>
                <td className="py-3 text-sm text-gray-500">
                    {(() => {
                        let genRevision = getGenesisHash(file.aquaTree!);
                        if (genRevision) {
                            let timestamp = file.aquaTree?.revisions?.[genRevision]?.local_timestamp;
                            if (timestamp) {
                                return displayTime(timestamp);
                            }
                        }
                        return "Not available";
                    })()}
                </td>
                <td className="py-3 text-sm text-gray-500">
                    {(() => {
                        const fileObject = getAquaTreeFileObject(file);
                        if (fileObject) {
                            return formatBytes(fileObject.fileSize ?? 0);
                        }
                        return "Not available";
                    })()}
                </td>
                <td className="py-3">
                    {showActionsButton()}
                </td>
            </tr>
        )
    }

    const renderCardView = () => {
        if ((showWorkFlowsOnly && workflowInfo?.isWorkFlow) || !showWorkFlowsOnly) {
            return (
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <FileText className="w-6 h-6 text-blue-500" />
                        <span className="font-medium text-gray-900 text-sm">{getAquaTreeFileName(file.aquaTree!!)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-gray-500 font-medium">Type</p>
                            <p className="text-gray-700">{getFileExtension(getAquaTreeFileName(file.aquaTree!!))}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium">Size</p>
                            <p className="text-gray-700">{getFileInfo()}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-500 font-medium">Uploaded</p>
                            <p className="text-gray-700">{getTimeInfo()}</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-2">Actions</p>
                        <div className="flex flex-wrap gap-2">
                            {showActionsButton()}
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    const showListItemData = () => {
        // First check if we should show this item based on workflow filter
        if (showWorkFlowsOnly && (!workflowInfo?.isWorkFlow)) {
            return null;
        }

        // Then handle different view modes
        if (viewMode === "table") {
            return renderTableView();
        } else if (viewMode === "card") {
            return renderCardView();
        } else if (viewMode === "actions-only") {
            return workFileActions();
        }

        return null;
    }

    return (
        <>
            {showListItemData()}
        </>
    );
}