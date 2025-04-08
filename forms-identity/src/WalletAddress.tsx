import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function WalletNameResolver() {
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to resolve wallet address to name
  const resolveName = async () => {
    if (!ethers.utils.isAddress(address)) {
      setError('Invalid Ethereum address');
      setName('');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Get Infura Project ID from environment variable
    //   const infuraProjectId = process.env.REACT_APP_INFURA_PROJECT_ID;
      
      const infuraProjectId = import.meta.env.VITE_INFURA_PROJECT_ID;
      if (!infuraProjectId) {
        throw new Error('Infura project ID not found in environment variables');
      }
      
      // Connect to Ethereum network (Mainnet)
      const provider = new ethers.providers.JsonRpcProvider(
        `https://mainnet.infura.io/v3/${infuraProjectId}`
      );
      
      // Look up an ENS name for the address
      const ensName = await provider.lookupAddress(address);
      

      if (ensName) {
        setName(ensName);
      } else {
        setName('No ENS name found');
      }
    } catch (err :any) {
      console.error('Error resolving name:', err);
      setError(`Error: ${err.message || 'Failed to resolve name'}`);
      setName('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Wallet Name Resolution</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Ethereum Address:</label>
        <input
          type="text"
          className="w-full px-3 py-2 border rounded-md"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
        />
      </div>
      
      <button
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        onClick={resolveName}
        disabled={loading || !address}
      >
        {loading ? 'Resolving...' : 'Resolve Name'}
      </button>
      
      {error && <p className="mt-3 text-red-500">{error}</p>}
      
      {name && !error && (
        <div className="mt-4 p-3 bg-gray-100 rounded-md">
          <p className="font-semibold">Name:</p>
          <p className="break-all">{name}</p>
        </div>
      )}
    </div>
  );
}