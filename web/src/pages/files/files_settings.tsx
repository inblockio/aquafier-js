import React, { useState } from 'react';
import { X, Sun } from 'lucide-react';

export default function FilesSettings() {
    const [aliasName, setAliasName] = useState('Alias');
    const [publicAddress] = useState('0x677e5E9d3badb280d7393464C09490F813d6d6ef');
    const [alchemyKey, setAlchemyKey] = useState('ZqQtnup49WhU7fxrujVpkFdRz4JaFRtZ');
    const [contractAddress] = useState('0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611');
    const [selectedNetwork, setSelectedNetwork] = useState('Sepolia');
    const [isOpen, setIsOpen] = useState(true);

    const networks = ['Mainnet', 'Sepolia', 'Holesky'];

    if (!isOpen) return null;

    return (
        // <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="flex-1 bg-white px-6 py-4">
            {/* <div className="bg-white rounded-lg shadow-xl w-full max-w-lg"> */}
            <div className="flex items-center justify-between mb-6">


                {/* Content */}
                <div className="p-6 space-y-22">
                    <h2 className="text-lg font-semibold text-gray-900 mb-5">Settings</h2>
                    {/* Themes Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-700 font-medium">Themes</span>
                            <Sun size={20} className="text-gray-600" />
                        </div>
                    </div>

                    {/* Alias Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Alias Name
                        </label>
                        <input
                            type="text"
                            value={aliasName}
                            onChange={(e) => setAliasName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Etherium Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Etherium Settings</h3>

                        {/* Public Address */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Public address
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 font-mono break-all">
                                {publicAddress}
                            </div>
                            <p className="text-xs text-gray-500">
                                self-issued identity claim used for generating/verifying aqua chain
                            </p>
                        </div>

                        {/* Alchemy Key */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Alchemy Key
                            </label>
                            <input
                                type="text"
                                value={alchemyKey}
                                onChange={(e) => setAlchemyKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            />
                        </div>

                        {/* Contract Address */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Contract Address
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 font-mono break-all">
                                {contractAddress}
                            </div>
                        </div>

                        {/* Network Selection */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Select Network sepolia
                            </label>
                            <div className="flex space-x-2">
                                {networks.map((network) => (
                                    <button
                                        key={network}
                                        onClick={() => setSelectedNetwork(network)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedNetwork === network
                                            ? 'bg-black text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {network}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>


                    <div className="flex space-x-3">
                        <button className="text-red-600 hover:text-red-700 font-medium transition-colors">
                            Clear Account Data
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors">
                            Save
                        </button>
                    </div>
                </div>


            </div>
        </div>
    );
}