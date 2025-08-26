import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface AddressViewProps {
  address: string;
  className?: string;
}

export const AddressView: React.FC<AddressViewProps> = ({ 
  address, 
  className = "" 
}) => {
  const [copied, setCopied] = useState(false);

  const formatAddress = (addr: string, expanded: boolean = false) => {
    if (expanded) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className={`rounded-2xl shadow-lg border border-gray-100 ${className}`}>
      <div className="relative group">
            <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-4 border-2 border-transparent group-hover:border-blue-200 transition-all duration-200">
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 font-mono text-sm sm:text-base break-all select-all" style={{ whiteSpace: 'pre-wrap' }}>
                  {formatAddress(address, true)}
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all duration-200 hover:shadow-md"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
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