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


export default function FilesListItem({ showWorkFlowsOnly, file, index, systemFileInfo, backendUrl, nonce }: { showWorkFlowsOnly: boolean, file: ApiFileInfo, index: number, systemFileInfo: ApiFileInfo[], backendUrl: string, nonce: string }) {


    const { setSelectedFileInfo , setOpenFileDetailsPopUp} = useStore(appStore)

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
            {/* First row - 3 buttons */}
            <div className="flex gap-1">
                {/* Details Button */}
                <button onClick={() => {
                    setOpenFileDetailsPopUp(true)
                    setSelectedFileInfo(file)

                }} className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-2 rounded hover:bg-green-200 transition-colors text-xs">
                    <LuEye className="w-3 h-3" />
                    <span>Details</span>
                </button>

                <SignAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" />

                <WitnessAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" />


                <LinkButton item={file} nonce={nonce} />

                {/* Link Button */}
                {/* <button className="flex items-center space-x-1 bg-yellow-100 text-yellow-700  px-3 py-2 rounded hover:bg-yellow-200 transition-colors text-xs">
                                    <LuLink2 className="w-3 h-3" />
                                    <span>Link</span>
                                </button> */}
            </div>

            {/* Second row - 3 buttons */}
            <div className="flex gap-1">


                <ShareButton item={file} nonce={nonce} />

                {/* Delete Button */}
                <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" />

                {/* Download Button - Smaller width */}
                <DownloadAquaChain file={file} />
            </div>

            {/* Third row - 1 smaller button */}
            {/* <div className="flex">
                        
                    </div> */}
        </>
    }
    const workFlowActions = () => {
        return <>
            <div className="flex gap-1">
                <OpenWorkflowButton item={file} nonce={nonce} />

                <ShareButton item={file} nonce={nonce} />

                {/* Delete Button */}
                <DeleteAquaChain apiFileInfo={file} backendUrl={backendUrl} nonce={nonce} revision="" />

                {/* Download Button - Smaller width */}
                <DownloadAquaChain file={file} />
            </div>

        </>

    }

    const showActionsButton = () => {
        if (workflowInfo?.isWorkFlow == true && workflowInfo.workFlow == "aqua_sign" ) {
            return workFlowActions()
        }
        return workFileActions()
    }


    const showListItemData = () => {
        if (showWorkFlowsOnly) {
            if (workflowInfo?.isWorkFlow == true) { //&& workflowInfo.workFlow == "aqua_sign"
                return listItem()
            }
            return <></>
        } else {
            return listItem()
        }
    }

    const listItem = () => {

        return <div
            key={index}
            className="flex items-center py-3 hover:bg-gray-50 rounded-md cursor-pointer group"

        >
            <div className="flex-1 flex items-center space-x-3">
                <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-md text-gray-900">{currentFileObject?.fileName}</span>
            </div>

            {/* Type Column */}
            <div className="w-24 text-sm text-gray-500">{getFileCategory(getFileExtension(currentFileObject?.fileName ?? ""))}</div>

            {/* Uploaded At Column */}
            <div className="w-50 text-sm text-gray-500">{
                getTimeInfo()
            }</div>

            {/* File Size Column */}
            <div className="w-24 text-sm text-gray-500">{
                getFileInfo()
            }</div>

            {/* Actions Column - 3-3-1 Layout */}
            <div className="w-120 flex flex-col gap-1">

                {showActionsButton()}

            </div>
        </div>
    }



    return (

        <>
            {
                showListItemData()
            }
        </>


    );
}