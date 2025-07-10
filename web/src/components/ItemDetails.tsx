import { IItemDetailData } from "../models/AquaTreeDetails"
import { ClipboardIcon } from "lucide-react";
import { useState } from "react";

export const ItemDetail = ({ label, value, displayValue, showCopyIcon }: IItemDetailData) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center w-full text-left gap-1 sm:gap-2">
            <span className="font-medium">{label}</span>
            <div className="flex items-center gap-1">
                <span className="font-mono break-words">{displayValue}</span>
                {showCopyIcon && (
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        title={copied ? "Copied!" : "Copy to clipboard"}
                    >
                        <ClipboardIcon className="h-3 w-3" />
                    </button>
                )}
            </div>
        </div>
    )
}