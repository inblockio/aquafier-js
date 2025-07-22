import { ClipboardIcon } from 'lucide-react'
import React from 'react'
import { Label } from './label'

const ClipboardButton = ({ value }: { value: string }) => {
    const [copied, setCopied] = React.useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    return (
        <button
            onClick={handleCopy}
            data-testid="copy-file-action-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#D4F9FD] text-[#225B71] rounded-md hover:bg-[#c2e9ed] transition-colors focus:outline-none focus:ring-2 focus:ring-[#225B71] focus:ring-opacity-50 active:bg-[#b0d9dd]"
        >
            <ClipboardIcon className="w-4 h-4" />
            <Label>{copied ? 'Copied!' : 'Copy'}</Label>
        </button>
    )
}

export default ClipboardButton
