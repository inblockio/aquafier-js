import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { FileText, Users, Hash, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '@/store'
import { formatCryptoAddress, timeToHumanFriendly } from '@/utils/functions'
import { Contract } from '@/types/types'

export const SharedContract = ({
    contract,
    index,
    showDeleteIcon
}: {
    contract: Contract
    index: number
    showDeleteIcon: boolean
}) => {
    const navigate = useNavigate()

    const getStatusFromLatest = (latest?: string) => {
        if (!latest) return 'unknown'
        try {
            const parsed = JSON.parse(latest)
            return parsed.status || 'unknown'
        } catch {
            return 'unknown'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    return (
        <Card
            key={contract.hash}
            className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
        >
            <CardContent className="p-3 sm:p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-4">
                        {/* Contract Hash */}
                        <div className="flex items-center gap-3 align-center">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                <Hash className="h-3 text-gray-600" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">
                                        File Name:{' '}
                                    </span>
                                    <code className="text-xs sm:text-sm font-mono bg-gray-100 px-1 sm:px-2 py-1 rounded break-all sm:break-words sm:max-w-none overflow-hidden text-ellipsis">
                                        {/* {formatCryptoAddress(contract.hash, 10, 10)} */}
                                        {contract.file_name}
                                    </code>
                                    {/* <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyToClipboard(contract.hash);
                                        }}
                                        className="h-6 w-6 p-0"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button> */}
                                </div>
                                {contract.created_at ? (
                                    <p className="text-xs text-gray-500 mt-1">
                                        {timeToHumanFriendly(
                                            contract.created_at,
                                            true
                                        )}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                                    <Wallet className="w-4 h-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-xs sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">
                                                    {formatCryptoAddress(
                                                        contract.sender,
                                                        10,
                                                        10
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Sender
                                                </p>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-mono text-xs">
                                            {contract.sender}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <div className="hidden xs:flex items-center text-gray-400">
                                <div className="w-8 border-t border-dashed border-gray-300"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-300 mx-1"></div>
                                <div className="w-8 border-t border-dashed border-gray-300"></div>
                            </div>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarFallback className="text-xs bg-green-100 text-green-600">
                                                    <Wallet className="w-4 h-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-xs sm:text-sm font-medium text-gray-900 font-mono max-w-[120px] sm:max-w-none truncate">
                                                    {formatCryptoAddress(
                                                        contract.receiver
                                                    )}
                                                </p>
                                                <p className="text-xs text-gray-500 break-words">
                                                    Receiver
                                                </p>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-mono text-xs">
                                            {contract.receiver}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        {/* Status and Details */}
                        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                <Badge
                                    variant="outline"
                                    className={`${getStatusColor(getStatusFromLatest(contract.latest))} text-xs whitespace-normal max-w-[150px] sm:max-w-none px-2`}
                                >
                                    {formatCryptoAddress(contract.latest, 5, 6)}
                                </Badge>

                                {contract.option && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                        <span className="capitalize">
                                            {contract.option}
                                        </span>
                                    </div>
                                )}

                                {contract.reference_count !== undefined && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                        <Users className="w-4 h-4" />
                                        <span>
                                            {contract.reference_count} refs
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 w-full">
                                <Button
                                    data-testid={
                                        'open-shared-contract-button-' + index
                                    }
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() =>
                                        navigate(
                                            `/app/shared-contracts/${contract.hash}`
                                        )
                                    }
                                >
                                    Open
                                </Button>
                                <Button
                                    data-testid={
                                        'delete-shared-contract-button-' + index
                                    }
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() =>
                                        navigate(
                                            `/app/shared-contracts/${contract.hash}`
                                        )
                                    }
                                >
                                    Delete
                                </Button>
                            </div>

                            {/* <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-8 w-8 p-0"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Hash
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Open in Explorer
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Download className="w-4 h-4 mr-2" />
                                        Export
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu> */}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export function SharedContracts() {
    const [searchQuery, _setSearchQuery] = useState('')
    const { backend_url, session, setContracts, contracts } = useStore(appStore)

    const loadAccountSharedContracts = async () => {
        if (!session) {
            return
        }
        try {
            const url = `${backend_url}/contracts`
            const response = await axios.get(url, {
                params: {
                    receiver: session?.address,
                },
                headers: {
                    nonce: session?.nonce,
                },
            })
            if (response.status === 200) {
                setContracts(response.data?.contracts)
            }
        } catch (error) {
            console.error(error)
        }
    }
    // console.log(contracts)

    useEffect(() => {
        loadAccountSharedContracts()
    }, [backend_url, session])

    const filteredContracts = contracts.filter(
        contract =>
            contract.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
            contract.sender
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            contract.receiver?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div>
            <div className="flex flex-col gap-2 ">
                <div className="flex items-center gap-3 mt-5">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Shared Contracts.
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {contracts.length} contracts available
                        </p>
                    </div>
                </div>

                <div className="flex flex-col h-full">
                    {/* Contracts List */}
                    <div className="flex-1 overflow-auto p-0">
                        <div className="space-y-4">
                            {filteredContracts.map((contract, index) => (
                                <SharedContract
                                    key={`${contract.hash}`}
                                    contract={contract}
                                    index={index}
                                    showDeleteIcon={true}
                                />
                            ))}

                            {filteredContracts.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        No contracts found
                                    </h3>
                                    <p className="text-gray-500">
                                        {searchQuery
                                            ? 'Try adjusting your search terms'
                                            : 'No shared contracts available'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const FilesSharedContracts = () => {
    return (
        <div className="container mx-auto max-w-4xl px-0 py-6">
            <SharedContracts />
        </div>
    )
}

export default FilesSharedContracts
