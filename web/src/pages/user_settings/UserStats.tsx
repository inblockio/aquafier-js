import React, { useEffect } from 'react';
import {
    FileText,
    Shield,
    CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { useStore } from 'zustand';
import appStore from '@/store';
import { API_ENDPOINTS, getClaimIcon } from '@/utils/constants';
import { ensureDomainUrlHasSSL } from '@/utils/functions';
import { emptyUserStats, IUserStats } from '@/types/types';
import { useReloadWatcher } from '@/hooks/useReloadWatcher';
import { RELOAD_KEYS } from '@/utils/reloadDatabase';
import { Link, useNavigate } from 'react-router-dom';

const formatClaimName = (claimType: string) => {
    return claimType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const UserStats = () => {

    const { session, backend_url } = useStore(appStore)
    const [stats, setStats] = React.useState<IUserStats>(emptyUserStats)
    const navigate = useNavigate();

    const getUserStats = async () => {
        if (session) {
            try {
                let result = await axios.get(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.USER_STATS}`), {
                    headers: {
                        'nonce': session.nonce,
                        'metamask_address': session.address
                    }
                })
                setStats(result.data)
            } catch (error) {
                console.log("Error getting stats", error)
            }
        }
    }

    const totalClaims = Object.values(stats.claimTypeCounts).reduce((sum, count) => sum + count, 0) - (stats.claimTypeCounts.aqua_files || 0);
    const activeClaims = Object.entries(stats.claimTypeCounts).filter(([_, count]) => count > 0).length;

    useEffect(() => {
        getUserStats()
    }, [backend_url, JSON.stringify(session)])

    // Watch for stats reload triggers
    useReloadWatcher({
        key: RELOAD_KEYS.user_stats,
        onReload: () => {
            // console.log('Reloading user stats...');
            getUserStats();
        }
    });

    return (
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-2 md:p-8 rounded-2xl">
            <div className="mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-800 mb-2">Account Statistics</h1>
                    <p className="text-slate-600">Overview of your claims and files</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border-2 cursor-pointer border-blue-200"
                    onClick={() => {
                        navigate(`/app?tab=all`)
                    }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm font-medium mb-1">Total Files</p>
                                <p className="text-3xl font-bold text-slate-800">{stats?.filesCount}</p>
                            </div>
                            <div className="bg-blue-100 p-3 rounded-lg">
                                <FileText className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm font-medium mb-1">Total Claims</p>
                                <p className="text-3xl font-bold text-slate-800">{totalClaims}</p>
                            </div>
                            <div className="bg-green-100 p-3 rounded-lg">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-600 text-sm font-medium mb-1">Active Types</p>
                                <p className="text-3xl font-bold text-slate-800">{activeClaims}</p>
                            </div>
                            <div className="bg-purple-100 p-3 rounded-lg">
                                <Shield className="w-8 h-8 text-purple-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Claims Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-800">Claims Breakdown</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6" dir="rtl">
                        {Object.entries(stats.claimTypeCounts).map(([claimType, count]) => {
                            const Icon = getClaimIcon(claimType);
                            const isActive = count > 0;

                            return (
                                <Link
                                    key={claimType}
                                    to={`/app?tab=${claimType}`}
                                >
                                    <div
                                        className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${isActive
                                            ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                                            : 'bg-slate-50 border-slate-200 opacity-60'
                                            }`}
                                        dir="ltr"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-slate-200'
                                                }`}>
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-500'
                                                    }`} />
                                            </div>
                                            <div>
                                                <p className={`font-medium text-sm ${isActive ? 'text-slate-800' : 'text-slate-600'
                                                    }`}>
                                                    {formatClaimName(claimType)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={`text-xl font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'
                                            }`}>
                                            {count}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserStats;