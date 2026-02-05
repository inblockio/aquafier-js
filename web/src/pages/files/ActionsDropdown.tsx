import { DeleteAquaChain } from "@/components/aqua_chain_actions/delete_aqua_chain"
import { Button } from "@/components/ui/button"
import { DropdownMenuContent, DropdownMenu, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ApiFileInfo } from "@/models/FileInfo"
import appStore from "@/store"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { ReactNode } from "react"
import { useStore } from "zustand"

interface IActionsDropdown {
    children: ReactNode,
    apiFileInfo: ApiFileInfo,
    index: number
}

const ActionsDropdown = ({ children, apiFileInfo, index }: IActionsDropdown) => {
    const { backend_url, session } = useStore(appStore)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        // ref={dropdownTriggerRef}
                        variant="outline"
                        className="h-8 w-8 p-0 cursor-pointer"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-50">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {children}

                    <DropdownMenuSeparator />
                    <DeleteAquaChain
                        apiFileInfo={apiFileInfo}
                        backendUrl={backend_url}
                        nonce={session?.nonce ?? ''}
                        revision=""
                        index={index}
                    >
                        <DropdownMenuItem variant='destructive' className="cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DeleteAquaChain>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}

export default ActionsDropdown