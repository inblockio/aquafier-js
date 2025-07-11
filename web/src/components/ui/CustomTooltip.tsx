import { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ICustomTooltip {
    children: ReactNode,
    content: string
}

const CustomTooltip = ({ children, content }: ICustomTooltip) => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent>
                <p>{content}</p>
            </TooltipContent>
        </Tooltip>
    )
}

export default CustomTooltip