import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from 'zustand';
import appStore from '../store';

const EnsResolverPage = () => {
  const [address, setAddress] = useState('');
  const [ensName, setEnsName] = useState<string | null>(null);
  const [ensType, setEnsType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { session, backend_url } = useStore(appStore);

  const resolveENS = async () => {
    const trimmedInput = address.trim();
    
    if (!trimmedInput) {
      setError('Please enter an Ethereum address or ENS name');
      return;
    }

    if (!session?.nonce) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setEnsName(null);
    setEnsType(null);

    try {
      const response = await fetch(`${backend_url}/resolve/${trimmedInput}?useEns=true`, {
        method: 'GET',
        headers: {
          'nonce': session.nonce,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setEnsName(data.result);
        setEnsType(data.type);
      } else {
        setError(data.message || 'Resolution failed');
      }
    } catch (err) {
      console.error('Resolution error:', err);
      setError('Failed to resolve. The service may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      resolveENS();
    }
  };
 
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl p-1 md:p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">ENS Resolver</h1>
            <p className="text-gray-600">Enter an Ethereum address or ENS name to resolve</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="0x... or vitalik.eth"
                className="w-full px-4 py-4 pr-12 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-lg font-mono"
              />
              <button
                onClick={resolveENS}
                disabled={loading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white p-2 rounded-lg transition-colors"
              >
                <Search size={24} />
              </button>
            </div>

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                <p className="mt-4 text-gray-600">Resolving...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {ensName && ensType && !loading && (
              <div className="bg-gradient-to-r from-orange-50 to-orange-50 border-l-4 border-orange-500 p-6 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  {ensType === 'ens_name' ? 'ENS Name:' : 'Ethereum Address:'}
                </p>
                <p className="text-2xl font-bold text-orange-600 break-all">{ensName}</p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Try examples: <br />
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block mr-2">
                0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
              </code>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                vitalik.eth
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnsResolverPage;