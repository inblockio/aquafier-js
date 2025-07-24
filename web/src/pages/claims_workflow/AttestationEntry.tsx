import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain'
import { IAttestationEntry } from '@/models/FileInfo'

const AttestationEntry = ({
    file,
    nonce,
    walletAddress,
    context,
    createdAt,
}: IAttestationEntry) => {
    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-blue-600"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <span className="font-medium text-gray-900 text-sm font-mono">
                            {/* {walletAddress.substring(0, 6)}...
              {walletAddress.substring(walletAddress.length - 4)} */}
                            {walletAddress}
                        </span>
                    </div>
                    <p className="text-gray-700 text-sm">{context}</p>
                </div>
                <div className='flex-col'>
                    <span className="text-xs text-gray-500 ">{createdAt}</span>
                <div className="flex items-center gap-3 mt-4">
                                                    <ShareButton
                                                        item={file!}
                                                        nonce={nonce}
                                                        index={1}
                                                    />
                                                </div>
                </div>
            </div>
        </div>
    )
}

export default AttestationEntry
