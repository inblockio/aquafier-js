import { ICompleteClaimInformation } from '@/types/types'
import { formatCryptoAddress } from '@/utils/functions'
import { Check, Phone, X } from 'lucide-react'

const PhoneNumberClaim = ({ claim }: { claim: ICompleteClaimInformation }) => {
    // Extract relevant information from claimInfo
    const claimInfo = claim.processedInfo.claimInformation
    let isVerified = false
    let serverAttestation = ""

    if (claim.attestations.length > 0) {
        isVerified = true
        serverAttestation = claim.attestations[0].context
    }

    const claimName = 'Phone Number Claim'
    const description = 'A basic, standard claim type.'
    const date =
        claimInfo['forms_created_at'] ||
        claimInfo['date'] ||
        new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    const verifiedTo = claimInfo['forms_phone_number']

    const fields = Object.entries(claimInfo).map(([key, value]) => {
        let processedKey = key.split('forms_')[1].split('_').join(' ')
        let processedValue = value as string
        let cssClass = {}
        if (key === 'forms_wallet_address') {
            processedValue = formatCryptoAddress(processedValue, 6, 4)
            cssClass = 'font-mono'
        }

        if (key === 'forms_type') {
            return null
        }

        return (
            <div key={key} className="flex justify-between items-start">
                <span className="text-sm text-gray-600 capitalize">{processedKey}</span>
                <span className={`text-sm font-medium max-w-[200px] ${cssClass}`}
                    style={{
                        textAlign: 'right',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                    }}
                >
                    {processedValue}
                </span>
            </div>
        )
    })


    return (
        <div className={`bg-white rounded-lg shadow-sm border-1 border-${isVerified ? "green" : "gray"}-400 p-6 flex flex-col gap-4`}>
            <div className="flex items-center gap-3 mb-4 justify-between">
                <div className="flex items-center gap-2">
                    <div className={`bg-${isVerified ? "green" : "gray"}-50 p-2 rounded-lg`}>
                        <Phone className={isVerified ? "text-green-500 w-6 h-6" : "text-gray-500 w-6 h-6"} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{claimName}</h2>
                        <p className="text-gray-600 text-sm">{description}</p>
                    </div>
                </div>
                {
                    isVerified ? (
                        <div className='flex items-center gap-2'>
                            <Check size={16} color="green" />
                            <p className="text-sm text-gray-700">Verified</p>
                        </div>
                    ) : (
                        <div className='flex items-center gap-2'>
                            <X size={16} color="gray" />
                            <p className="text-sm text-gray-700">Not Verified</p>
                        </div>
                    )
                }
            </div>

            <div className={`border-t border-${isVerified ? "green" : "gray"}-400 pt-4 mb-4`}>
                <p className={`text-sm text-gray-700`}>Claim verified to "{verifiedTo}"</p>
                <p className="text-xs text-gray-500">{date}</p>
            </div>
            <div className="flex flex-col gap-2">{fields}</div>
            {
                isVerified && (
                    <div className="flex flex-col justify-between items-start gap-2">
                        <span className="text-md font-semibold text-gray-800">Server Attestation</span>
                        <span className="text-sm text-gray-600">{serverAttestation}</span>
                    </div>
                )
            }

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

export default PhoneNumberClaim