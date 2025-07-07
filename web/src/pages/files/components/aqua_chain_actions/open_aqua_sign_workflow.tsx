import { IShareButton } from "@/types/types";
import { FaFileExport } from "react-icons/fa6";



export const OpenWorkflowButton = ({ item, nonce }: IShareButton) => {


    return (
          <div className="flex gap-1">
                                        <button data-testid="open-workflow-button" className="flex items-center space-x-1 bg-[#D4F9FD] text-[#225B71]  px-3 py-2 rounded hover:bg-[#AFF2FB] transition-colors text-xs" onClick={(e) => {
                                            e.preventDefault();
                                            // setSelectedFileInfo(item)
                                            // navigate("/workflow")
                                        }} >
                                            <FaFileExport /> &nbsp;
                                            Open Workflow
                                        </button>
        
        
                                    </div>
    )
}