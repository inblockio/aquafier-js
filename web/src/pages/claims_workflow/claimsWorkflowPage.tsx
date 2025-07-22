


import React, { useState } from 'react';
import { Settings, Package, ArrowUpDown, QrCode, Smartphone, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../../components/ui/button";
import { LuArrowLeft } from 'react-icons/lu';
import appStore from '../../store';
import { useStore } from "zustand";
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain';

export default function ClaimsWorkflowPage() {
    const [activeTab, setActiveTab] = useState('claims_summary');
    const [previewEnabled, setPreviewEnabled] = useState(true);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const { selectedFileInfo, systemFileInfo, setSelectedFileInfo, session } = useStore(appStore);

    const navigate = useNavigate()

    const tabs = [
        {
            id: 'claims_summary',
            label: 'Claims Summary',
            icon: Boxes,
            completion: 100,
            completionColor: 'bg-green-500'
        },
        {
            id: 'claims_attestation',
            label: 'Attestations',
            icon: Package,
            completion: 40,
            completionColor: 'bg-orange-500'
        },
        {
            id: 'shared_data',
            label: 'Shared Data',
            icon: ArrowUpDown,
            completion: 0,
            completionColor: 'bg-gray-400'
        },
    ];

    const activeTabData = tabs.find(tab => tab.id === activeTab);

    // <div className="w-full  mx-auto bg-white">
    return (
        <div className="container mx-auto py-4 px-1 md:px-4">
            {/* <div className="flex flex-col gap-10"> */}
            <div className="container">
                <div className="flex items-center justify-between">
                    <div></div>
                    <h1 className="text-center text-2xl font-bold">{timeLineTitle}</h1>
                    <Button variant="outline" onClick={() => {
                        setSelectedFileInfo(null)
                        navigate("/app", { replace: true })
                    }} className='cursor-pointer'>
                        <LuArrowLeft className="mr-2 h-4 w-4" /> Go Home
                    </Button>
                </div>
            </div>
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <div className="flex space-x-0">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors duration-200
                  ${isActive
                                        ? 'text-gray-900 border-gray-900'
                                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                                    }
                `}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>

                                {/* Completion Badge */}
                                {/* <span className={`
                  inline-flex items-center px-2 py-1 text-xs font-medium rounded-full text-white
                  ${tab.completion === 100 ? 'bg-green-500' : 
                    tab.completion > 0 ? 'bg-orange-500' : 'bg-gray-400'}
                `}>
                  {tab.completion}%
                </span> */}
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


                    <div className="flex items-center gap-3">

                        <ShareButton item={selectedFileInfo!!} nonce={session?.nonce!!} index={1} />
                    </div>

                    {/* Preview Toggle */}
                    {/* <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Preview</span>
            <button
              onClick={() => setPreviewEnabled(!previewEnabled)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${previewEnabled ? 'bg-green-500' : 'bg-gray-300'}
              `}
            >
              <span className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out
                ${previewEnabled ? 'translate-x-6' : 'translate-x-1'}
              `} />
            </button>
          </div> */}
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {activeTab === 'claims_summary' && (
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Store Name</span>
                                    <input
                                        type="text"
                                        placeholder="Your Store Name"
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Store URL</span>
                                    <input
                                        type="text"
                                        placeholder="https://yourstore.com"
                                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shared_data' && (
                        <div>
                            

                            <div className="bg-gray-50 rounded-lg p-6">
                                <p className="text-gray-600">Wallets that you have shared the claim with</p>
                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                                        <span className="text-sm text-gray-700">Product Category 1</span>
                                        <button className="text-blue-600 text-sm hover:text-blue-800">Edit</button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                                        <span className="text-sm text-gray-700">Product Category 2</span>
                                        <button className="text-blue-600 text-sm hover:text-blue-800">Edit</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'claims_attestation' ) && (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              attestation history
                            </h3>
                            <p className="text-gray-600">This section is not configured yet.</p>
                            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                Get Started
                            </button>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

