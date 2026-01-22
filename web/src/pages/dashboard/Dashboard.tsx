import  { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from 'zustand';
import appStore from '@/store';
import { 
    Users, 
    FileText, 
    GitBranch, 
    Files, 
    Activity, 
    PenTool, 
    Database, 
    RefreshCw,
    Shield,
    CreditCard,
    DollarSign
} from 'lucide-react';
import { MetricsResponse, AdvancedMetricsResponse } from '@/types/types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ensureDomainUrlHasSSL } from '@/utils/functions';

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, description, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white rounded-xl shadow-sm p-6 border border-slate-200 transition-all ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}
    >
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
                <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
        </div>
        <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            {subValue && (
                <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    {subValue}
                </span>
            )}
        </div>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
);

const Dashboard = () => {
    const { session, backend_url } = useStore(appStore);
    const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
    const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        if (!session || !backend_url) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const headers = {
                'nonce': session.nonce,
            };

            let url1 = ensureDomainUrlHasSSL(`${backend_url}/metrics`)
            let url2 = ensureDomainUrlHasSSL(`${backend_url}/metrics/range?startDate=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`)
            const [metricsRes, advancedRes] = await Promise.all([
                axios.get(url1, { headers }),
                axios.get(url2, { headers })
            ]);

            setMetrics(metricsRes.data.data);
            setAdvancedMetrics(advancedRes.data.data);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 403) {
                setError("You are not authorized to view this dashboard.");
            } else {
                setError("Failed to load dashboard data. Please check your connection.");
            }
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [session, backend_url]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-slate-500">Loading system analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!metrics) return null;

    return (
        <div className="p-2 md:p-8 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">System Dashboard</h1>
                    <p className="text-slate-500 mt-1">Real-time overview of Aquafier network performance</p>
                </div>
                <button 
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 font-medium"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard 
                    title="Total Users" 
                    value={metrics.users.total} 
                    subValue={metrics.users.growth} 
                    icon={Users} 
                    colorClass="text-blue-600 bg-blue-100" 
                    onClick={() => navigate('/app/admin/list/users')}
                />
                <StatCard 
                    title="Total Contracts" 
                    value={metrics.contracts.total} 
                    subValue={metrics.contracts.growth} 
                    icon={FileText} 
                    colorClass="text-purple-600 bg-purple-100"
                    description="shared files"
                    onClick={() => navigate('/app/admin/list/contracts')}
                />
                <StatCard 
                    title="Total Revisions" 
                    value={metrics.revisions.total} 
                    subValue={metrics.revisions.growth} 
                    icon={GitBranch} 
                    colorClass="text-indigo-600 bg-indigo-100" 
                    onClick={() => navigate('/app/admin/list/revisions')}
                />
                <StatCard 
                    title="Total Files" 
                    value={metrics.files.total} 
                    subValue={metrics.files.growth} 
                    icon={Files} 
                    colorClass="text-amber-600 bg-amber-100" 
                    onClick={() => navigate('/app/admin/list/files')}
                />
                 <StatCard 
                    title="Total Revenue" 
                    value={`$${metrics.payments.totalAmount}`} 
                    subValue={metrics.payments.growth} 
                    icon={CreditCard} 
                    colorClass="text-emerald-600 bg-emerald-100" 
                    description={`${metrics.payments.newToday} new payments today`}
                    onClick={() => navigate('/app/admin/list/payments')}
                />
            </div>

            {/* Activity & Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Active Users */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Activity className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">User Activity</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Last 24 Hours</span>
                            <span className="text-xl font-bold text-slate-800">{metrics.additionalMetrics.activeUsers.last24Hours}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Last 7 Days</span>
                            <span className="text-xl font-bold text-slate-800">{metrics.additionalMetrics.activeUsers.last7Days}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <span className="text-slate-600">Last 30 Days</span>
                            <span className="text-xl font-bold text-slate-800">{metrics.additionalMetrics.activeUsers.last30Days}</span>
                        </div>
                    </div>
                </div>

                {/* System Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-100 rounded-lg">
                            <PenTool className="w-5 h-5 text-rose-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Signatures & Witnesses</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Total Signatures</p>
                            <p className="text-2xl font-bold text-slate-800">{metrics.additionalMetrics.signatures.total}</p>
                            <p className="text-xs text-green-600 mt-1">+{metrics.additionalMetrics.signatures.newToday} today</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Total Witnesses</p>
                            <p className="text-2xl font-bold text-slate-800">{metrics.additionalMetrics.witnesses.total}</p>
                            <p className="text-xs text-green-600 mt-1">+{metrics.additionalMetrics.witnesses.newToday} today</p>
                        </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Total Form Revisions</p>
                            <p className="text-2xl font-bold text-slate-800">{metrics.additionalMetrics.revisionStats.form.total}</p>
                            <p className="text-xs text-green-600 mt-1">+{metrics.additionalMetrics.revisionStats.form.newToday} today</p>
                        </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Total Link Revisions</p>
                            <p className="text-2xl font-bold text-slate-800">{metrics.additionalMetrics.revisionStats.link.total}</p>
                            <p className="text-xs text-green-600 mt-1">+{metrics.additionalMetrics.revisionStats.link.newToday} today</p>
                        </div>
                         <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Total File Revisions</p>
                            <p className="text-2xl font-bold text-slate-800">{metrics.additionalMetrics.revisionStats.file.total}</p>
                            <p className="text-xs text-green-600 mt-1">+{metrics.additionalMetrics.revisionStats.file.newToday} today</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-500 mb-1">Public Templates</p>
                            <p className="text-2xl font-bold text-slate-800">{metrics.additionalMetrics.templates.publicTemplates}</p>
                            <p className="text-xs text-slate-500 mt-1">of {metrics.additionalMetrics.templates.total} total</p>
                        </div>
                    </div>
                </div>

                {/* Payment Analytics */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Financial Overview</h2>
                    </div>
                    <div className="space-y-4">
                         <div className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Total Payments</p>
                                <p className="text-2xl font-bold text-slate-800">{metrics.payments.total}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-500 mb-1">Today</p>
                                <p className="text-lg font-bold text-emerald-600">+{metrics.payments.newToday}</p>
                            </div>
                        </div>

                         <div className="mt-4">
                             <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Payment Status</h3>
                             <div className="space-y-2">
                                {metrics.payments.breakdown?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 px-3 py-3 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                item.status === 'SUCCEEDED' ? 'bg-emerald-500' : 
                                                item.status === 'PENDING' ? 'bg-amber-500' : 
                                                item.status === 'FAILED' ? 'bg-red-500' : 'bg-slate-500'
                                            }`} />
                                            <span className="text-slate-600 text-sm capitalize">
                                                {item.status ? item.status.replace(/_/g, ' ').toLowerCase() : 'unknown'}
                                            </span>
                                        </div>
                                        <span className="font-bold text-slate-800 text-sm">{item.count}</span>
                                    </div>
                                ))}
                                {(!metrics.payments.breakdown || metrics.payments.breakdown.length === 0) && (
                                    <p className="text-sm text-slate-400 text-center py-2">No payment data available</p>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Growth Table */}
            {advancedMetrics && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Database className="w-5 h-5 text-slate-600" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Database Growth (Last 30 Days)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Table Name</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Total Records</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">New (Last 30d)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-600">Growth</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {advancedMetrics.tables.map((table) => (
                                    <tr key={table.tableName} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4 font-medium text-slate-800 capitalize">{table.tableName.replace(/([A-Z])/g, ' $1').trim()}</td>
                                        <td className="px-6 py-4 text-slate-600">{table.total.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-slate-600">{table.inRange.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                parseFloat(table.percentage) > 0 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {table.percentage}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
