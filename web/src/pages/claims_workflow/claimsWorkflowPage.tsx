import { useEffect, useState } from 'react';
import { Package, ArrowUpDown, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { LuArrowLeft } from 'react-icons/lu';
import appStore from '../../store';
import { useStore } from 'zustand';
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain';
import { processSimpleWorkflowClaim } from '@/utils/functions';
import { ClipLoader } from 'react-spinners';
import { ClaimInformation } from '@/models/FileInfo';
import axios from 'axios';
import { Contract } from '@/types/types';
import { SharedContract } from '../files_shared_contracts';

export default function ClaimsWorkflowPage() {
    const { selectedFileInfo, setSelectedFileInfo, session, backend_url } = useStore(appStore);

    const [activeTab, setActiveTab] = useState('claims_summary');
    // const [previewEnabled, setPreviewEnabled] = useState(true);
    const [timeLineTitle, setTimeLineTitle] = useState('');
    const [processedInfo, setProcessedInfo] = useState<ClaimInformation | null>(null);
    const [sharedContracts, setSharedContracts] = useState<Contract[] | null>(null);

    const navigate = useNavigate();

    const tabs = [
        {
            id: 'claims_summary',
            label: 'Claims Summary',
            icon: Boxes,
            completion: 100,
            completionColor: 'bg-green-500',
        },
        {
            id: 'claims_attestation',
            label: 'Attestations',
            icon: Package,
            completion: 40,
            completionColor: 'bg-orange-500',
        },
        {
            id: 'shared_data',
            label: 'Shared Data',
            icon: ArrowUpDown,
            completion: 0,
            completionColor: 'bg-gray-400',
        },
    ];

    const activeTabData = tabs.find(tab => tab.id === activeTab);

    const loadSharedContractsData = async (_latestRevisionHash: string, _genesisHash: string) => {
        try {
            const url = `${backend_url}/contracts`;
            const response = await axios.get(url, {
                params: {
                    sender: session?.address,
                    // genesis_hash: genesisHash,
                    latest: _latestRevisionHash,
                },
                headers: {
                    nonce: session?.nonce,
                },
            });
            if (response.status === 200) {
                setSharedContracts(response.data?.contracts);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (selectedFileInfo) {
            const processedInfo = processSimpleWorkflowClaim(selectedFileInfo);
            setTimeLineTitle('Claims Workflow');
            setProcessedInfo(processedInfo);
        }
    }, [JSON.stringify(selectedFileInfo)]);

    useEffect(() => {
        if (processedInfo) {
            loadSharedContractsData(processedInfo.latestRevisionHash!, processedInfo.genesisHash!);
        }
    }, [JSON.stringify(processedInfo)]);

    // <div className="w-full  mx-auto bg-white">
    return (
        <>
            {!processedInfo && selectedFileInfo ? (
                <div className="flex items-center justify-center flex-col align-center py-8">
                    <ClipLoader
                        color={'blue'}
                        loading={true}
                        size={150}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                    />
                    <span className="text-center font-500 text-2xl">Processing claim...</span>
                </div>
            ) : null}
            {processedInfo && processedInfo?.isClaimValid ? (
                <div className="container mx-auto py-4 px-1 md:px-4">
                    {/* <div className="flex flex-col gap-10"> */}
                    <div className="container">
                        <div className="flex items-center justify-between">
                            <div></div>
                            <h1 className="text-center text-2xl font-bold">{timeLineTitle}</h1>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedFileInfo(null);
                                    navigate('/app', { replace: true });
                                }}
                                className="cursor-pointer"
                            >
                                <LuArrowLeft className="mr-2 h-4 w-4" /> Go Home
                            </Button>
                        </div>
                    </div>
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <div className="flex space-x-0">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200
                                            ${
                                                isActive
                                                    ? 'text-gray-900 border-gray-900'
                                                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                            }
                                            `}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-semibold text-gray-900 capitalize">
                                {activeTabData?.label}
                            </h1>

                            {processedInfo?.walletAddress === session?.address ? (
                                <div className="flex items-center gap-3">
                                    <ShareButton
                                        item={selectedFileInfo!}
                                        nonce={session?.nonce!}
                                        index={1}
                                    />
                                </div>
                            ) : null}
                        </div>

                        {/* Content Area */}
                        <div className="space-y-6">
                            {activeTab === 'claims_summary' && (
                                <div className="bg-gray-50 rounded-lg p-6">
                                    {/* <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3> */}
                                    <div className="space-y-2">
                                        {Object.keys(processedInfo?.claimInformation ?? {}).map(
                                            (key: any) => (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-700 capitalize">
                                                        {key}
                                                    </span>
                                                    <span className="text-sm text-gray-900 capitalize">
                                                        {processedInfo?.claimInformation[key]}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'shared_data' && (
                                <div>
                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <p className="text-gray-900">
                                            Wallets that you have shared the claim with
                                        </p>
                                        <div className="mt-4 space-y-3">
                                            {/* <div className="flex items-center justify-between p-3 bg-white rounded border">
                                                    <span className="text-sm text-gray-700">Product Category 1</span>
                                                    <button className="text-blue-600 text-sm hover:text-blue-800">Edit</button>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white rounded border">
                                                    <span className="text-sm text-gray-700">Product Category 2</span>
                                                    <button className="text-blue-600 text-sm hover:text-blue-800">Edit</button>
                                                </div> */}
                                            {sharedContracts?.map((contract, index) => (
                                                <SharedContract
                                                    key={`${contract.hash}`}
                                                    contract={contract}
                                                    index={index}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'claims_attestation' && (
                                <div className="bg-gray-50 rounded-lg p-6 text-center">
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        attestation history
                                    </h3>
                                    <p className="text-gray-600">
                                        This section is not configured yet.
                                    </p>
                                    <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                        Get Started
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="container mx-auto py-4 px-1 md:px-4">
                    <div className="container">
                        <div className="flex items-center justify-between flex-col space-y-6 py-8">
                            <div></div>
                            <h1 className="text-center text-2xl font-bold">Claim Not Valid</h1>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedFileInfo(null);
                                    navigate('/app', { replace: true });
                                }}
                                className="cursor-pointer"
                            >
                                <LuArrowLeft className="mr-2 h-4 w-4" /> Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
