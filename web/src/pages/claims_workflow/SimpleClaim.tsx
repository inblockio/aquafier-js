import { HiShieldCheck } from 'react-icons/hi'
import { formatCryptoAddress } from '@/utils/functions'

interface ISimpleClaim {
      claimInfo: Record<string, string>
}

const SimpleClaim = ({ claimInfo }: ISimpleClaim) => {
      // Extract relevant information from claimInfo
      const claimName = 'Simple Claim'
      const description = 'A basic, standard claim type.'
      const date =
            claimInfo['forms_created_at'] ||
            claimInfo['date'] ||
            new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
            })
      const verifiedTo = claimInfo['forms_name']

      const fields = Object.entries(claimInfo).map(([key, value]) => {
            let processedKey = key.split('forms_')[1].split('_').join(' ')
            let processedValue = value
            let extraStyles = {}
            if (key === 'forms_wallet_address') {
                  processedValue = formatCryptoAddress(processedValue, 6, 4)
                  extraStyles = { fontFamily: 'monospace' }
            }

            if (key === 'forms_type') {
                  return null
            }

            return (
                  <div key={key} className="flex justify-between items-start">
                        <span className="text-sm text-gray-600 capitalize">{processedKey}</span>
                        <span className={`text-sm font-medium max-w-[200px] break-all`} style={{ textAlign: 'right', ...extraStyles }}>
                              {processedValue}
                        </span>
                  </div>
            )
      })

      return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-md">
                  <div className="flex items-start gap-3 mb-4">
                        <div className="bg-blue-50 p-2 rounded-lg">
                              <HiShieldCheck className="text-blue-500 w-6 h-6" />
                        </div>
                        <div>
                              <h2 className="text-xl font-bold">{claimName}</h2>
                              <p className="text-gray-600 text-sm">{description}</p>
                        </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mb-4">
                        <p className="text-sm text-gray-700">Claim verified to "{verifiedTo}"</p>
                        <p className="text-xs text-gray-500">{date}</p>
                  </div>
                  <div className="flex flex-col gap-3">{fields}</div>

                  {/* <div className="space-y-2">
                {claimant && (
                    <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Claimant</span>
                        <span className="text-sm font-medium">{claimant}</span>
                    </div>
                )}

                {wallet && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Wallet</span>
                        <span className="text-sm font-mono">{formatCryptoAddress(wallet, 6, 4)}</span>
                    </div>
                )}
            </div> */}
            </div>
      )
}

export default SimpleClaim
