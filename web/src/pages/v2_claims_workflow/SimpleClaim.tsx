import { HiShieldCheck } from 'react-icons/hi'
import { formatCryptoAddress } from '@/utils/functions'
import { Mail, Phone } from 'lucide-react'
import CopyButton from '@/components/CopyButton'

interface ISimpleClaim {
      claimInfo: Record<string, string>
}

const SimpleClaim = ({ claimInfo }: ISimpleClaim) => {
      // Extract relevant information from claimInfo

      function getClaimTitle(claimType: string) {
            if (claimType === 'simple_claim') {
                  return 'Simple Claim'
            } else if (claimType === 'phone_number_claim') {
                  return 'Phone Number Claim'
            } else if (claimType === 'email_claim') {
                  return 'Email Claim'
            }
            return 'Unknown Claim'
      }

      function getClaimDescription(claimType: string) {
            if (claimType === 'simple_claim') {
                  return 'A basic, standard claim type.'
            } else if (claimType === 'phone_number_claim') {
                  return 'A claim that verifies a phone number.'
            } else if (claimType === 'email_claim') {
                  return 'A claim that verifies an email address.'
            }
            return 'Unknown Claim'
      }
      function getClaimIcon(claimType: string) {
            if (claimType === 'simple_claim') {
                  return <HiShieldCheck className="text-blue-500 w-6 h-6" />
            } else if (claimType === 'phone_number_claim') {
                  return <Phone className="text-green-500 w-6 h-6" />
            } else if (claimType === 'email_claim') {
                  return <Mail className="text-green-500 w-6 h-6" />
            }
            return <HiShieldCheck className="text-blue-500 w-6 h-6" />
      }

      const claimName = getClaimTitle(claimInfo['forms_type'])
      const description = getClaimDescription(claimInfo['forms_type'])
      const Icon = getClaimIcon(claimInfo['forms_type'])

      // const date =
      //       claimInfo['forms_created_at'] ||
      //       claimInfo['date'] ||
      //       new Date().toLocaleDateString('en-US', {
      //             month: 'short',
      //             day: 'numeric',
      //             year: 'numeric',
      //       })
      // const verifiedTo = claimInfo['forms_name']

      const fields = Object.entries(claimInfo).map(([key, value]) => {
            let processedKey = key.split('forms_')[1].split('_').join(' ')
            let processedValue = value
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
                        <div className="flex gap-2 " style={{
                              alignItems: 'center'
                        }}>
                              <span className={`text-sm font-medium max-w-[200px] ${cssClass}`}
                                    style={{
                                          textAlign: 'right',
                                          whiteSpace: 'normal',
                                          wordWrap: 'break-word',
                                          wordBreak: 'break-word',
                                          overflowWrap: 'break-word',
                                          lineHeight: '1',
                                          display: "inline-block",
                                          height: "fit-content"
                                    }}
                              >
                                    {processedValue}
                              </span>
                              {
                                    key === 'forms_wallet_address' ? (
                                          <CopyButton text={value} isIcon={true} />
                                    ) : null
                              }
                        </div>
                  </div>
            )
      })


      return (
            <div className="p-0"> {/* Removed redundant card styling; adjust padding as needed */}
                  <div className="flex items-start gap-3 mb-4">
                        <div className="bg-blue-50 p-2 rounded-lg">
                              {Icon}
                        </div>
                        <div>
                              <h2 className="text-xl font-bold">{claimName}</h2>
                              <p className="text-gray-600 text-sm">{description}</p>
                        </div>
                  </div>

                  <div className="flex flex-col gap-3">{fields}</div>
            </div>
      )
}

export default SimpleClaim
