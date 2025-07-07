import { Button } from "@/components/shadcn/ui/button";
import appStore from "@/store";
import { IShareButton } from "@/types/types";
import { FaFileExport } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useStore } from "zustand";



export const OpenWorkflowButton = ({ item }: IShareButton) => {
    const { setSelectedFileInfo } = useStore(appStore)
    const navigate = useNavigate()

    return (
        <Button data-testid="open-workflow-button" className="cursor-pointer rounded-sm bg-cyan-500/10 text-cyan-600 text-xs hover:bg-cyan-500/20" onClick={(e) => {
            e.preventDefault();
            setSelectedFileInfo(item)
            navigate("/files/pdf/workflow")
        }} >
            <FaFileExport /> &nbsp;
            Open Workflow
        </Button>
    )
}