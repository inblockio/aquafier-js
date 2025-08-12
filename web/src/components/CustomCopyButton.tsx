import { Button } from "./ui/button"
import { toast } from "sonner"
import { LuCopy } from "react-icons/lu"

const CustomCopyButton = ({ value }: { value: string }) => {
    // const clipboard = useClipboard({ value: value })
    return (
        <Button
            data-testid="custom-copy-button"
            variant="default"
            size="sm"
            onClick={() => {
                navigator.clipboard.writeText(value)
                toast.success(`Wallet Address copied to clipboard`)
            }}
            className="flex items-center gap-2 rounded-md"
        >
            {'Copy Address'}
            <LuCopy />
        </Button>
    )
}

export default CustomCopyButton