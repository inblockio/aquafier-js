import React, { useEffect, useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchFiles, fetchWalletAddressesAndNamesForInputRecommendation } from '@/utils/functions';
import { WalletAutosuggest } from '@/components/wallet_auto_suggest';
import { useStore } from 'zustand'
import appStore from '@/store'

interface AddressViewProps {
  address: string;
  className?: string;
}

export const AddressView: React.FC<AddressViewProps> = ({
  address,
  className = ""
}) => {
  const [copied, setCopied] = useState(false);
  // const [inputAddress, setInputAddress] = useState(address);
  const navigate = useNavigate();
  const {

    systemFileInfo,
    session,
    backend_url,
    setWorkflows,
    workflows
  } = useStore(appStore)
  const [multipleAddresses, setMultipleAddresses] = useState<string[]>([address])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(multipleAddresses[0] || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleNavigate = () => {
    if (multipleAddresses[0] || ''.trim()) {
      navigate(`/app/claims/workflow/${multipleAddresses[0] || ''.trim()}`);
    }
  };

  useEffect(() => {

    (async () => {

      const filesApi = await fetchFiles(session!.address, `${backend_url}/workflows`, session!.nonce)
      setWorkflows({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

    })()


    let add = multipleAddresses
    if (add.length === 0) {
      add = [address]
    } else {
      add[0] = address
    }
    setMultipleAddresses(add)
  }, [address])

  return (
    <div className={`rounded-2xl shadow-lg border border-gray-100 ${className}`}>
      <div className="relative group">
        <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 border-2 border-transparent group-hover:border-blue-200 transition-all duration-200">
          <div className="flex-1 min-w-0">
            {/* <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="w-full text-gray-600 font-mono text-sm sm:text-base bg-transparent border-none outline-none focus:ring-0 p-0"
              placeholder="Enter wallet address..."
            /> */}
            <WalletAutosuggest

              walletAddresses={fetchWalletAddressesAndNamesForInputRecommendation(systemFileInfo, workflows)}
              field={{
                name: 'address',

              }}
              index={0}
              address={multipleAddresses[0]}
              multipleAddresses={multipleAddresses}
              setMultipleAddresses={(addrs: string[]) => {
                console.log('Setting multiple addresses:', addrs)
                setMultipleAddresses(addrs)

              }}
              placeholder="Enter name claim or wallet address..."
              className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 cursor-pointer p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-md"
            title="Copy address"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleNavigate}
            className="flex-shrink-0 cursor-pointer p-2 text-gray-400 hover:text-green-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-md"
            title="Navigate to profile"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Copy feedback */}
        {copied && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow-lg animate-pulse">
            Copied!
          </div>
        )}
      </div>
    </div>
  );
};