import { ApiFileInfo } from "@/models/FileInfo";
import { displayTime, formatBytes, getAquaTreeFileName, getAquaTreeFileObject, getFileCategory, getFileExtension, getGenesisHash, isWorkFlowData } from "@/utils/functions";
import { FileObject } from "aqua-js-sdk";
import { FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { LuDelete, LuDownload, LuEye, LuGlasses, LuLink2, LuShare2, LuSignature } from 'react-icons/lu';


export default function FilesListItem({ file, index, systemFileInfo }: { file: ApiFileInfo, index: number, systemFileInfo: ApiFileInfo[] }) {



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


    // const handleFileSelect = (fileId: number) => {
    //     setSelectedFiles((prev: number[]) =>
    //         prev.includes(fileId)
    //         ? prev.filter((id: number) => id !== fileId)
    //         : [...prev, fileId]
    //     );
    // };


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

    return (
        <div
            key={index}
            className="flex items-center py-3 hover:bg-gray-50 rounded-md cursor-pointer group"
        // onClick={() => handleFileSelect(file.id)}
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
                {/* First row - 3 buttons */}
                <div className="flex gap-1">
                    {/* Details Button */}
                    <button className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-2 rounded-md hover:bg-green-200 transition-colors text-xs">
                        <LuEye className="w-3 h-3" />
                        <span>Details</span>
                    </button>

                    {/* Sign Button */}
                    <button className="flex items-center space-x-1 bg-blue-100 text-blue-700  px-3 py-2 rounded-md hover:bg-blue-200 transition-colors text-xs">
                        <LuSignature className="w-3 h-3" />
                        <span>Sign</span>
                    </button>

                    {/* Witness Button */}
                    <button className="flex items-center space-x-1 bg-gray-800 text-white  px-3 py-2 rounded-md hover:bg-gray-900 transition-colors text-xs">
                        <LuGlasses className="w-3 h-3" />
                        <span>Witness</span>
                    </button>

                    {/* Link Button */}
                    <button className="flex items-center space-x-1 bg-yellow-100 text-yellow-700  px-3 py-2 rounded-md hover:bg-yellow-200 transition-colors text-xs">
                        <LuLink2 className="w-3 h-3" />
                        <span>Link</span>
                    </button>
                </div>

                {/* Second row - 3 buttons */}
                <div className="flex gap-1">


                    {/* Share Button */}
                    <button className="flex items-center space-x-1 bg-red-100 text-red-700  px-3 py-2 rounded-md hover:bg-red-200 transition-colors text-xs">
                        <LuShare2 className="w-3 h-3" />
                        <span>Share</span>
                    </button>

                    {/* Delete Button */}
                    <button className="flex items-center space-x-1 bg-pink-100 text-pink-700  px-3 py-2 rounded-md hover:bg-pink-200 transition-colors text-xs">
                        <LuDelete className="w-3 h-3" />
                        <span>Delete</span>
                    </button>

                    {/* Download Button - Smaller width */}
                    <button className="flex items-center justify-center space-x-1 bg-purple-100 text-purple-700  px-3 py-2 rounded-md hover:bg-purple-200 transition-colors text-xs w-20">
                        <LuDownload className="w-3 h-3" />
                        <span>Download</span>
                    </button>
                </div>

                {/* Third row - 1 smaller button */}
                {/* <div className="flex">
                        
                    </div> */}
            </div>
        </div>
    );
}