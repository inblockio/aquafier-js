import { WalletAutosuggest } from "@/components/wallet_auto_suggest";
import { useState } from "react";

export  const walletMap = new Map([
    ['Alice Personal Wallet', '0x742d35C8A3dE3b7f6c7D8E9C8B5A2F1E8D7C6B5A4'],
    ['Bob Trading Account', '0x892f45D9B2eF4c8A7B6E5D4C3B2A1F8E7D6C5B4A3'],
    ['Company Treasury', '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1'],
    ['Development Fund', '0x9F8E7D6C5B4A3928F7E6D5C4B3A2918E7D6C5B4A3'],
    ['Marketing Wallet', '0x5C4B3A2918E7D6F5E4D3C2B1A0F9E8D7C6B5A4392'],
    ['Alice Secondary', '0xABC123DEF456789ABCDEF123456789ABCDEF12345'],
    ['Bob Cold Storage', '0x123456789ABCDEF123456789ABCDEF123456789A'],
    ['Emergency Reserve', '0xDEADBEEF1234567890ABCDEF1234567890ABCDEF']
  ]);

// Demo Component
export default function WalletAutosuggestDemo() {
  // Sample wallet data as Map

  // State for multiple addresses
  const [multipleAddresses, setMultipleAddresses] = useState(['', '', '']);

  const addAddress = () => {
    setMultipleAddresses([...multipleAddresses, '']);
  };

  const removeAddress = (index: number) => {
    const newAddresses = multipleAddresses.filter((_, i) => i !== index);
    setMultipleAddresses(newAddresses);
  };

  const clearAll = () => {
    setMultipleAddresses(['']);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          WalletAutosuggest Demo
        </h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Available Wallets:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Array.from(walletMap.entries()).map(([name, address]) => (
              <div key={name} className="bg-gray-50 p-2 rounded border">
                <div className="font-medium text-gray-900">{name}</div>
                <div className="text-gray-600 font-mono text-xs">{address}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">
              Wallet Addresses ({multipleAddresses.length})
            </h2>
            <div className="space-x-2">
              <button
                onClick={addAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Address
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Clear All
              </button>
            </div>
          </div>

          {multipleAddresses.map((address, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signer {index + 1}
                </label>
                <WalletAutosuggest
                  field={{ name: 'signer' }}
                  index={index}
                  address={address}
                  multipleAddresses={multipleAddresses}
                  setMultipleAddresses={setMultipleAddresses}
                  walletAddresses={walletMap}
                  placeholder={`Enter wallet address for signer ${index + 1}`}
                />
              </div>
              {multipleAddresses.length > 1 && (
                <button
                  onClick={() => removeAddress(index)}
                  className="mt-8 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Current Values:
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            {multipleAddresses.map((address, index) => (
              <div key={index} className="mb-2">
                <span className="font-medium">Signer {index + 1}:</span>{' '}
                <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                  {address || 'Empty'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How to test:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Type at least 3 characters to see suggestions (try "alice", "bob", "comp")</li>
            <li>• Use arrow keys to navigate suggestions</li>
            <li>• Press Enter or click to select</li>
            <li>• Notice how the display name is shown but the actual wallet address is set</li>
            <li>• Try adding multiple signers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}