import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStore } from 'zustand';
import appStore from '@/store';
import { 
    ChevronLeft, 
    ChevronRight, 
    ArrowLeft,
    RefreshCw
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

const AdminEntityList = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const { session, backend_url } = useStore(appStore);
    
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    const columnsMap: Record<string, Column[]> = {
        users: [
            { key: 'index', label: '#', render: (_val, _row, rowIndex) => (pagination.page - 1) * pagination.limit + rowIndex + 1 },
            { key: 'address', label: 'Wallet Address', render: (val) => <span title={val} className="font-mono text-xs">{formatAddress(val)}</span> },
            { key: 'email', label: 'Email' },
            { key: 'ens_name', label: 'ENS Name' },
            { key: 'createdAt', label: 'Created At', render: formatDate },
            { key: 'updatedAt', label: 'Last Active', render: formatDate },
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
            { key: 'file_location', label: 'Location' },
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

    const fetchData = async (page: number) => {
        if (!session || !backend_url || !type) return;
        
        setLoading(true);
        try {
            const res = await axios.get(`${backend_url}/admin/data/${type}`, {
                headers: { 'nonce': session.nonce },
                params: { page, limit: pagination.limit }
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

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchData(1);
    }, [type, session, backend_url]);

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
                        <p className="text-slate-500 text-sm">Viewing {type} records</p>
                    </div>
                </div>
                <button 
                    onClick={() => fetchData(pagination.page)}
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

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
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
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
        </div>
    );
};

export default AdminEntityList;
