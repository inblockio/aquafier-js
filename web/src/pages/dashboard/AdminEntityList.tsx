import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/api/axiosInstance'
import { useStore } from 'zustand';
import appStore from '@/store';
import { ensureDomainUrlHasSSL } from '@/utils/functions';
import { getContentTypeFromFileName } from '@/components/file_preview/constants';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    RefreshCw,
    Loader2,
    X,
    Download,
    FileIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface Column {
    key: string;
    label: string;
    render?: (value: any, row: any, rowIndex: number) => React.ReactNode;
}

const formatAddress = (address: string) => {
    if (!address) return '-';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
};

const AdminToggleButton = ({ row, session, backendUrl, onSuccess }: {
    row: any;
    session: any;
    backendUrl: string;
    onSuccess: () => void;
}) => {
    const [toggling, setToggling] = useState(false);
    const isAdmin = row.is_admin;

    const handleToggle = async () => {
        setToggling(true);
        try {
            await apiClient.post(
                ensureDomainUrlHasSSL(`${backendUrl}/admin/toggle-admin`),
                { targetAddress: row.address, makeAdmin: !isAdmin },
                { headers: { 'nonce': session.nonce } }
            );
            toast.success(`${isAdmin ? 'Removed admin from' : 'Made admin:'} ${formatAddress(row.address)}`);
            onSuccess();
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Failed to update admin status';
            toast.error(msg);
        } finally {
            setToggling(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isAdmin
                    ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                    : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200'
            }`}
        >
            {toggling ? (
                <Loader2 className="w-3 h-3 animate-spin inline" />
            ) : isAdmin ? (
                'Remove Admin'
            ) : (
                'Make Admin'
            )}
        </button>
    );
};

const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
};

const getFileNameFromLocation = (location: string) => {
    if (!location) return 'Unknown';
    const parts = location.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || location;
};

const FilePreviewDialog = ({ file, open, onClose, session, backendUrl }: {
    file: any;
    open: boolean;
    onClose: () => void;
    session: any;
    backendUrl: string;
}) => {
    const [fileURL, setFileURL] = useState<string>('');
    const [textContent, setTextContent] = useState<string>('');
    const [contentType, setContentType] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const fileName = getFileNameFromLocation(file?.file_location || '');

    const fetchFile = useCallback(async () => {
        if (!file?.file_hash || !session || !backendUrl) return;

        setIsLoading(true);
        setFileURL('');
        setTextContent('');
        try {
            const res = await apiClient.get(
                ensureDomainUrlHasSSL(`${backendUrl}/admin/files/${file.file_hash}`),
                {
                    headers: { nonce: session.nonce },
                    responseType: 'arraybuffer',
                }
            );

            let ct = res.headers['content-type'] || '';
            if (ct === 'application/octet-stream' || !ct) {
                ct = getContentTypeFromFileName(fileName);
            }
            setContentType(ct);

            if (ct.startsWith('text/') || ct === 'application/json' || ct === 'application/xml') {
                const decoder = new TextDecoder('utf-8');
                setTextContent(decoder.decode(res.data));
            }

            const blob = new Blob([res.data], { type: ct });
            setFileURL(URL.createObjectURL(blob));
        } catch (err) {
            console.error('Error fetching file preview:', err);
            toast.error('Failed to load file preview');
        } finally {
            setIsLoading(false);
        }
    }, [file?.file_hash, session, backendUrl, fileName]);

    useEffect(() => {
        if (open && file) fetchFile();
        return () => {
            if (fileURL) URL.revokeObjectURL(fileURL);
        };
    }, [open, file?.file_hash]);

    const handleDownload = () => {
        if (!fileURL) return;
        const a = document.createElement('a');
        a.href = fileURL;
        a.download = fileName;
        a.click();
    };

    const renderPreview = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center py-16">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-slate-500">Loading preview...</p>
                </div>
            );
        }

        if (!fileURL && !textContent) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <FileIcon className="w-12 h-12 mb-3" />
                    <p>No preview available</p>
                </div>
            );
        }

        // Images
        if (contentType.startsWith('image/')) {
            return <img src={fileURL} alt={fileName} className="max-w-full max-h-[60vh] object-contain mx-auto rounded" />;
        }

        // Video
        if (contentType.startsWith('video/')) {
            return (
                <video controls className="max-w-full max-h-[60vh] mx-auto rounded">
                    <source src={fileURL} type={contentType} />
                    Your browser does not support this video format.
                </video>
            );
        }

        // Audio
        if (contentType.startsWith('audio/')) {
            return (
                <div className="flex flex-col items-center justify-center py-8">
                    <FileIcon className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-sm text-slate-500 mb-4">{fileName}</p>
                    <audio controls className="w-full max-w-md">
                        <source src={fileURL} type={contentType} />
                    </audio>
                </div>
            );
        }

        // PDF
        if (contentType === 'application/pdf') {
            return <iframe src={fileURL} className="w-full h-[60vh] rounded border border-slate-200" title={fileName} />;
        }

        // JSON
        if (contentType === 'application/json') {
            try {
                const parsed = JSON.parse(textContent);
                return (
                    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[60vh] text-xs font-mono">
                        {JSON.stringify(parsed, null, 2)}
                    </pre>
                );
            } catch {
                return <pre className="bg-slate-50 p-4 rounded-lg overflow-auto max-h-[60vh] text-xs font-mono text-slate-700">{textContent}</pre>;
            }
        }

        // Text / code
        if (contentType.startsWith('text/') || contentType === 'application/xml') {
            return (
                <pre className="bg-slate-50 p-4 rounded-lg overflow-auto max-h-[60vh] text-xs font-mono text-slate-700 whitespace-pre-wrap">
                    {textContent}
                </pre>
            );
        }

        // Fallback
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileIcon className="w-16 h-16 mb-3" />
                <p className="mb-1">Preview not available for this file type</p>
                <p className="text-xs">{contentType || 'Unknown type'}</p>
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" hideTitle={false}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base pr-8">
                        <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{fileName}</span>
                    </DialogTitle>
                    <DialogDescription>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{formatFileSize(file?.file_size || 0)}</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-mono">{formatAddress(file?.file_hash || '')}</span>
                            <span className="text-slate-300">|</span>
                            <span>{formatDate(file?.createdAt || '')}</span>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-2">
                    {renderPreview()}
                </div>
                <div className="flex justify-end mt-2">
                    <button
                        onClick={handleDownload}
                        disabled={!fileURL}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Download
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const AdminEntityList = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { session, backend_url } = useStore(appStore);

    const statusFilter = type === 'payments' ? searchParams.get('status') : null;

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState<any>(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    const clearStatusFilter = () => {
        setSearchParams({});
    };

    const fetchData = async (page: number) => {
        if (!session || !backend_url || !type) return;

        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: pagination.limit };
            if (statusFilter) {
                params.status = statusFilter;
            }
            const res = await apiClient.get(ensureDomainUrlHasSSL(`${backend_url}/admin/data/${type}`), {
                headers: { 'nonce': session.nonce },
                params
            });

            setData(res.data.data);
            setPagination(prev => ({ ...prev, ...res.data.pagination }));
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to fetch data");
            if (err.response?.status === 403) {
                navigate('/app/dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    const columnsMap: Record<string, Column[]> = {
        users: [
            { key: 'index', label: '#', render: (_val, _row, rowIndex) => (pagination.page - 1) * pagination.limit + rowIndex + 1 },
            { key: 'address', label: 'Wallet Address', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'email', label: 'Email' },
            { key: 'ens_name', label: 'ENS Name' },
            { key: 'is_admin', label: 'Admin', render: (val) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    val ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                }`}>
                    {val ? 'Admin' : 'User'}
                </span>
            )},
            { key: 'createdAt', label: 'Created At', render: formatDate },
            { key: 'updatedAt', label: 'Last Active', render: formatDate },
            { key: 'actions', label: 'Actions', render: (_val, row) => (
                <AdminToggleButton
                    row={row}
                    session={session}
                    backendUrl={backend_url}
                    onSuccess={() => fetchData(pagination.page)}
                />
            )},
        ],
        contracts: [
            { key: 'index', label: '#', render: (_val, _row, rowIndex) => (pagination.page - 1) * pagination.limit + rowIndex + 1 },
            { key: 'hash', label: 'Contract Hash', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'file_name', label: 'File Name', render: (val) => <span className="font-medium text-slate-700">{val || 'Untitled'}</span> },
            { key: 'sender', label: 'Sender', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'recipients', label: 'Recipients', render: (val: string[]) => <span className="text-xs">{val?.length || 0} recipients</span> },
            { key: 'created_at', label: 'Created At', render: formatDate },
        ],
        revisions: [
            { key: 'index', label: '#', render: (_val, _row, rowIndex) => (pagination.page - 1) * pagination.limit + rowIndex + 1 },
            { key: 'pubkey_hash', label: 'Revision Hash', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'revision_type', label: 'Type' },
            { key: 'has_content', label: 'Has Content', render: (val: boolean) => val ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span> },
            { key: 'createdAt', label: 'Created At', render: formatDate },
        ],
        files: [
            { key: 'index', label: '#', render: (_val, _row, rowIndex) => (pagination.page - 1) * pagination.limit + rowIndex + 1 },
            { key: 'file_hash', label: 'File Hash', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'file_location', label: 'File Name', render: (val) => <span className="font-medium text-slate-700 truncate max-w-[200px] block" title={val}>{getFileNameFromLocation(val)}</span> },
            { key: 'file_size', label: 'Size', render: (val: number) => <span className="text-slate-500">{formatFileSize(val)}</span> },
            { key: 'createdAt', label: 'Created At', render: formatDate },
        ],
        payments: [
            { key: 'index', label: '#', render: (_val, _row, rowIndex) => (pagination.page - 1) * pagination.limit + rowIndex + 1 },
            { key: 'id', label: 'Payment ID', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'user', label: 'User', render: (_val, row) => {
                const addr = row.Subscription?.user_address;
                return addr ? <span title={addr} className="font-mono text-xs text-blue-600">{formatAddress(addr)}</span> : '-';
            }},
            { key: 'amount', label: 'Amount', render: (val, row) => <span className="font-medium">${val} {row.currency}</span> },
            { key: 'status', label: 'Status', render: (val) => {
                const colors: Record<string, string> = {
                    'SUCCEEDED': 'text-emerald-600 bg-emerald-50',
                    'PENDING': 'text-amber-600 bg-amber-50',
                    'FAILED': 'text-red-600 bg-red-50',
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[val] || 'text-slate-600 bg-slate-100'}`}>
                        {val}
                    </span>
                );
            }},
            { key: 'payment_method', label: 'Method', render: (val) => <span className="text-xs uppercase text-slate-500">{val}</span> },
            { key: 'createdAt', label: 'Date', render: formatDate },
        ]
    };

    const getTitle = (t: string) => {
        switch(t) {
            case 'users': return 'User Management';
            case 'contracts': return 'Contracts Registry';
            case 'revisions': return 'Revision History';
            case 'files': return 'File Storage';
            case 'payments': return 'Payment History';
            default: return 'Data List';
        }
    };

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchData(1);
    }, [type, session, backend_url, statusFilter]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
            fetchData(newPage);
        }
    };

    if (!type || !columnsMap[type]) return <div>Invalid type</div>;

    return (
        <div className="p-2 md:p-8 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/app/admin/dashboard')}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 capitalize">{getTitle(type)}</h1>
                        <p className="text-slate-500 text-sm">
                            {statusFilter ? `Showing ${statusFilter.toLowerCase()} payments` : `Viewing ${type} records`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => fetchData(pagination.page)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Status Filter Badge */}
            {statusFilter && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Filtered by:</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {statusFilter}
                        <button onClick={clearStatusFilter} className="hover:bg-blue-100 rounded-full p-0.5 transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {columnsMap[type].map((col) => (
                                    <th key={col.key} className="px-6 py-4 font-semibold text-slate-600">
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={columnsMap[type].length} className="px-6 py-12 text-center text-slate-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading data...
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={columnsMap[type].length} className="px-6 py-12 text-center text-slate-500">
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className={`hover:bg-slate-50/50 transition-colors ${type === 'files' ? 'cursor-pointer' : ''}`}
                                        onClick={() => type === 'files' && setPreviewFile(row)}
                                    >
                                        {columnsMap[type].map((col) => (
                                            <td key={col.key} className="px-6 py-4 text-slate-600">
                                                {col.render ? col.render(row[col.key], row, idx) : row[col.key] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Showing page <span className="font-medium">{pagination.page}</span> of <span className="font-medium">{pagination.totalPages}</span>
                        <span className="mx-2 text-slate-300">|</span>
                        Total {pagination.total} items
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1 || loading}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages || loading}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* File Preview Dialog */}
            {type === 'files' && (
                <FilePreviewDialog
                    file={previewFile}
                    open={!!previewFile}
                    onClose={() => setPreviewFile(null)}
                    session={session}
                    backendUrl={backend_url}
                />
            )}
        </div>
    );
};

export default AdminEntityList;
