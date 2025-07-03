import { ApiFileInfo } from "@/models/FileInfo";
import { useEffect } from "react";

import { LuDelete, LuDownload, LuEye, LuGlasses, LuLink2, LuShare2, LuSignature } from 'react-icons/lu';


export default function FilesListItem({file , index  }:{file: ApiFileInfo, index: number}) {


    
        const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);


    useEffect(() => {
        // Fetch files or perform any necessary setup here
        // For example, you might want to fetch files from an API or initialize state
    }, []);


    const handleFileSelect = (fileId: number) => {
        setSelectedFiles((prev: number[]) =>
            prev.includes(fileId)
            ? prev.filter((id: number) => id !== fileId)
            : [...prev, fileId]
        );
    };

    return (
          <div
                            key={index}
                            className="flex items-center py-3 hover:bg-gray-50 rounded-md cursor-pointer group"
                            onClick={() => handleFileSelect(file.id)}
                        >
                            <div className="flex-1 flex items-center space-x-3">
                                <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <span className="text-md text-gray-900">{file.name}</span>
                            </div>

                            {/* Type Column */}
                            <div className="w-24 text-sm text-gray-500">PDF</div>

                            {/* Uploaded At Column */}
                            <div className="w-32 text-sm text-gray-500">1/7/2025</div>

                            {/* File Size Column */}
                            <div className="w-24 text-sm text-gray-500">2.4 MB</div>

                            {/* Actions Column - 3-3-1 Layout */}
                            <div className="w-96 flex flex-col gap-1">
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