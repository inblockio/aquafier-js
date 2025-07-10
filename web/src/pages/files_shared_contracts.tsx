import { useState } from 'react';
import { Button } from '@/components/shadcn/ui/button';
import { Card, CardContent } from '@/components/shadcn/ui/card';
import { Badge } from '@/components/shadcn/ui/badge';
import { Input } from '@/components/shadcn/ui/input';
import { Avatar, AvatarFallback } from '@/components/shadcn/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/shadcn/ui/dropdown-menu';
import {
    Search,
    FileText,
    Users,
    Hash,
    Copy,
    ExternalLink,
    MoreHorizontal,
    Eye,
    Download,
    Share2,
    Filter,
    ArrowUpDown,
} from 'lucide-react';

interface Contract {
    hash: string;
    genesis_hash?: string;
    latest?: string;
    sender?: string;
    receiver?: string;
    option?: string;
    reference_count?: number;
}

// Mock contract data
const mockContracts: Contract[] = [
    {
        hash: '0x254B0D7b63342Fcb8955DB82e95C21d72EFdB6f7',
        genesis_hash: '0x123...abc',
        latest: '{"status": "active", "version": "1.2"}',
        sender: 'alice@company.com',
        receiver: 'bob@partner.com',
        option: 'standard',
        reference_count: 3,
    },
    {
        hash: '0x789C1E2f94567Ghi1234JK56e78L90m34EfgH8i9',
        genesis_hash: '0x456...def',
        latest: '{"status": "pending", "version": "2.1"}',
        sender: 'carol@startup.io',
        receiver: 'david@enterprise.com',
        option: 'premium',
        reference_count: 7,
    },
    {
        hash: '0xABC3F4g56789Hij2345KL67f89M01n45GhiJ9k0',
        genesis_hash: '0x789...ghi',
        latest: '{"status": "completed", "version": "1.0"}',
        sender: 'eve@tech.org',
        receiver: 'frank@solutions.net',
        option: 'basic',
        reference_count: 1,
    },
];

export function SharedContracts() {
    const [contracts] = useState<Contract[]>(mockContracts);
    const [searchQuery, setSearchQuery] = useState('');
    const [_selectedContract, setSelectedContract] = useState<Contract | null>(null);

    const filteredContracts = contracts.filter(contract =>
        contract.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.receiver?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const truncateHash = (hash: string, length: number = 8) => {
        return `${hash.slice(0, length)}...${hash.slice(-6)}`;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getInitials = (email?: string) => {
        if (!email) return '?';
        return email.charAt(0).toUpperCase();
    };

    const getStatusFromLatest = (latest?: string) => {
        if (!latest) return 'unknown';
        try {
            const parsed = JSON.parse(latest);
            return parsed.status || 'unknown';
        } catch {
            return 'unknown';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div>
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            Shared Contracts
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {contracts.length} contracts available
                        </p>
                    </div>
                </div>

                <div className="flex flex-col h-full">
                    {/* Search and Filters */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search contracts by hash, sender, or receiver..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Button variant="outline" size="sm">
                                <Filter className="w-4 h-4 mr-2" />
                                Filter
                            </Button>
                            <Button variant="outline" size="sm">
                                <ArrowUpDown className="w-4 h-4 mr-2" />
                                Sort
                            </Button>
                        </div>
                    </div>

                    {/* Contracts List */}
                    <div className="flex-1 overflow-auto p-6">
                        <div className="space-y-4">
                            {filteredContracts.map((contract) => (
                                <Card
                                    key={contract.hash}
                                    className="hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                                    onClick={() => setSelectedContract(contract)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-4">
                                                {/* Contract Hash */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                                        <Hash className="w-4 h-4 text-gray-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                                                {truncateHash(contract.hash)}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    copyToClipboard(contract.hash);
                                                                }}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">Contract Hash</p>
                                                    </div>
                                                </div>

                                                {/* Participants */}
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                                                {getInitials(contract.sender)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {contract.sender || 'Unknown Sender'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">Sender</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center text-gray-400">
                                                        <div className="w-8 border-t border-dashed border-gray-300"></div>
                                                        <div className="w-2 h-2 rounded-full bg-gray-300 mx-1"></div>
                                                        <div className="w-8 border-t border-dashed border-gray-300"></div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="w-6 h-6">
                                                            <AvatarFallback className="text-xs bg-green-100 text-green-600">
                                                                {getInitials(contract.receiver)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {contract.receiver || 'Unknown Receiver'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">Receiver</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status and Details */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <Badge
                                                            variant="outline"
                                                            className={`${getStatusColor(getStatusFromLatest(contract.latest))} capitalize`}
                                                        >
                                                            {getStatusFromLatest(contract.latest)}
                                                        </Badge>

                                                        {contract.option && (
                                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                                                <span className="capitalize">{contract.option}</span>
                                                            </div>
                                                        )}

                                                        {contract.reference_count !== undefined && (
                                                            <div className="flex items-center gap-1 text-sm text-gray-600">
                                                                <Users className="w-3 h-3" />
                                                                <span>{contract.reference_count} refs</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <DropdownMenu>
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
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {filteredContracts.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <FileText className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
                                    <p className="text-gray-500">
                                        {searchQuery ? 'Try adjusting your search terms' : 'No shared contracts available'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const FilesSharedContracts = () => {
    return (
        <div className='container mx-auto max-w-4xl'>
            <SharedContracts />
        </div>
    )
}

export default FilesSharedContracts