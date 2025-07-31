import { digTxtRecordsGoogle, extractDNSClaimInfo, formatCryptoAddress } from '@/utils/functions'
import { useEffect, useState } from 'react'
import { TbWorldWww } from 'react-icons/tb'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { verifyProofV2 } from '@/utils/dnsClaimVerification'
import { Info, Check, X, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain'
import { ApiFileInfo } from '@/models/FileInfo'

interface IDNSClaim {
      claimInfo: Record<string, string>,
      apiFileInfo: ApiFileInfo,
      nonce: string,
      sessionAddress: string,
}

const getIcon = (type: string) => {
      switch (type) {
            case 'info':
                  return <Info />
            case 'success':
                  return <Check />
            case 'warning':
                  return <AlertTriangle />
            case 'error':
                  return <X />
            default:
                  return <Info />
      }
}

const getClasses = (type: string) => {
      switch (type) {
            case 'info':
                  return 'bg-blue-50 border-blue-200 text-blue-800'
            case 'success':
                  return 'bg-green-50 border-green-200 text-green-800'
            case 'warning':
                  return 'bg-amber-50 border-amber-200 text-amber-800'
            case 'error':
                  return 'bg-red-50 border-red-200 text-red-800'
            default:
                  return 'bg-blue-50 border-blue-200 text-blue-800'
      }
}

const DNSClaim = ({ claimInfo, apiFileInfo, nonce, sessionAddress }: IDNSClaim) => {
      // State for DNS verification
      const [verificationStatus, setVerificationStatus] = useState<'loading' | 'verified' | 'failed' | 'not_found' | 'pending'>('loading')
      const [verificationMessage, setVerificationMessage] = useState<string>('Checking DNS verification...')
      const [dnsRecords, setDnsRecords] = useState<string[]>([])
      const [verificationLogs, setVerificationLogs] = useState<Array<{ content: string; type: string }>>([])

      // Extract relevant information from claimInfo
      const claimName = 'DNS Claim'
      const description = 'Domain control validation for a domain.'
      const domain = claimInfo['forms_domain'] || ''
      const date =
            claimInfo['forms_created_at'] ||
            claimInfo['date'] ||
            new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
            })

      const fields = Object.entries(claimInfo).map(([key, value]) => {
            let processedKey = key.split('forms_')[1]?.split('_').join(' ') || key
            let processedValue = value
            let cssClass = ''

            if (key === 'forms_wallet_address' || key === 'forms_signature') {
                  processedValue = formatCryptoAddress(processedValue, 6, 4)
                  cssClass = 'font-mono'
            }

            if (key === 'forms_type') {
                  return null
            }

            return (
                  <div key={key} className="flex justify-between items-start">
                        <span className="text-sm text-gray-600 capitalize">{processedKey}</span>
                        <p className={`text-sm font-medium max-w-[200px] break-all text-right ${cssClass}`}>{processedValue}</p>
                  </div>
            )
      })

      const resetVerification = () => {
            setVerificationStatus('loading')
            setVerificationMessage('Checking DNS records...')
      }

      const getRecords = async () => {
            resetVerification()
            try {
                  setVerificationStatus('loading')
                  setVerificationMessage('Checking DNS records...')

                  const domain = claimInfo['forms_domain'] || 'aqua._wallet.inblock.io'
                  const records = await digTxtRecordsGoogle(domain)

                  if (!records || records.length === 0) {
                        setVerificationStatus('not_found')
                        setVerificationMessage(`No DNS TXT records found for ${domain}`)
                        return false
                  }

                  console.log('DNS records:', records)

                  setDnsRecords(records)

                  const currentWalletAddress = claimInfo['forms_wallet_address']
                  const currentSignature = claimInfo['forms_signature']

                  if (!currentWalletAddress || !currentSignature) {
                        setVerificationStatus('failed')
                        setVerificationMessage('Missing wallet address or signature in claim')
                        return false
                  }

                  // Loop through records and find a record whose signature matches the current signature and wallet address
                  for (const record of records) {
                        try {
                              const { walletAddress, expiration } = extractDNSClaimInfo(record)

                              // Check if the record is expired
                              const currentTime = Date.now() / 1000 // Convert to seconds
                              const isExpired = expiration > 0 && currentTime > expiration

                              if (isExpired) {
                                    continue // Skip expired records
                              }

                              // TODO: We should find a way to show the user the txt record to add it to the domain
                              // if (walletAddress === currentWalletAddress && signature === currentSignature) {
                              if (walletAddress.trim().toLowerCase() === currentWalletAddress.trim().toLowerCase()) {
                                    let verificationMsg = 'Signature verified via DNS TXT record'
                                    if (expiration > 0) {
                                          const expirationDate = new Date(expiration * 1000).toLocaleDateString()
                                          verificationMsg += ` (valid until ${expirationDate})`
                                    }

                                    setVerificationStatus('verified')
                                    setVerificationMessage(verificationMsg)
                                    return true
                              }
                        } catch (err) {
                              // Continue to next record if this one fails to parse
                        }
                  }

                  setVerificationStatus('failed')
                  setVerificationMessage('No matching DNS record found for verification')
                  return false
            } catch (error) {
                  // console.error('Error verifying DNS claim:', error)
                  setVerificationStatus('failed')
                  setVerificationMessage('Error checking DNS records')
                  return false
            }
      }

      const getVerificationLogs = async () => {
            const verifyProofResult = await verifyProofV2("inblock.io", "wallet")
            console.log("verifyProofResult", verifyProofResult)
            setVerificationLogs(verifyProofResult)
      }

      useEffect(() => {
            getRecords()
      }, [])

      useEffect(() => {
            getVerificationLogs()
      }, [])

      return (
            <div className="grid lg:grid-cols-12 gap-4">
                  <div className='col-span-7 bg-gray-50 p-2'>
                        <div className="flex flex-col gap-2">
                              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                          <div className="flex items-start gap-3">
                                                <div className="bg-purple-50 p-2 rounded-lg">
                                                      <TbWorldWww className="text-purple-500 w-6 h-6" />
                                                </div>
                                                <div>
                                                      <h2 className="text-xl font-bold">{claimName}</h2>
                                                      <p className="text-gray-600 text-sm">{description}</p>
                                                </div>
                                          </div>

                                          {/* DNS Verification Status Indicator */}
                                          <div className="flex items-center">
                                                {verificationStatus === 'loading' && (
                                                      <div className="flex items-center text-blue-500">
                                                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                                                            <span className="text-xs">Verifying...</span>
                                                      </div>
                                                )}
                                                {verificationStatus === 'verified' && (
                                                      <div className="flex items-center text-green-500">
                                                            <FaCheck className="mr-1" />
                                                            <span className="text-xs">Verified</span>
                                                      </div>
                                                )}
                                                {verificationStatus === 'not_found' && (
                                                      <div className="flex items-center text-amber-500">
                                                            <FaTimes className="mr-1" />
                                                            <span className="text-xs">Records Not Found</span>
                                                      </div>
                                                )}
                                                {verificationStatus === 'failed' && (
                                                      <div className="flex items-center text-red-500">
                                                            <FaTimes className="mr-1" />
                                                            <span className="text-xs">Verification Failed</span>
                                                      </div>
                                                )}
                                          </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 mb-4">
                                          <div className="flex justify-between items-start">
                                                <div>
                                                      <p className="text-sm text-gray-700">Domain verification</p>
                                                      <p className="text-xs text-gray-500">{date}</p>
                                                </div>

                                                {domain && (
                                                      <div className="text-right">
                                                            <p className="text-sm font-medium">{domain}</p>
                                                            <p className="text-xs text-gray-500">{verificationMessage}</p>
                                                      </div>
                                                )}
                                          </div>
                                    </div>
                                    <div className="flex flex-col gap-3">{fields}</div>

                                    {/* Verification alert */}
                                    {verificationStatus !== 'loading' && (
                                          <div
                                                className={`mt-4 p-3 rounded-md ${verificationStatus === 'verified' ? 'bg-green-50 border border-green-200' : verificationStatus === 'not_found' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}
                                          >
                                                <div className="flex items-center">
                                                      {verificationStatus === 'verified' && <FaCheck className="text-green-500 mr-2" />}
                                                      {verificationStatus === 'not_found' && <FaTimes className="text-amber-500 mr-2" />}
                                                      {verificationStatus === 'failed' && <FaTimes className="text-red-500 mr-2" />}
                                                      <p
                                                            className={`text-sm font-medium ${verificationStatus === 'verified' ? 'text-green-800' : verificationStatus === 'not_found' ? 'text-amber-800' : 'text-red-800'}`}
                                                      >
                                                            {verificationStatus === 'verified' ? 'Domain Ownership Verified' : verificationStatus === 'not_found' ? 'DNS Records Not Found' : 'Verification Failed'}
                                                      </p>
                                                </div>
                                                <p className={`mt-1 text-xs ${verificationStatus === 'verified' ? 'text-green-700' : verificationStatus === 'not_found' ? 'text-amber-700' : 'text-red-700'}`}>
                                                      {verificationMessage}
                                                </p>

                                                {/* Show DNS records if available */}
                                                {dnsRecords.length > 0 && verificationStatus !== 'verified' && (
                                                      <div className="mt-2">
                                                            <p className="text-xs font-medium mb-1">Found DNS TXT Records:</p>
                                                            <div className="text-xs bg-white/50 p-2 rounded max-h-24 overflow-y-auto">
                                                                  {dnsRecords.map((record, index) => (
                                                                        <div key={index} className="font-mono mb-1 break-all">
                                                                              {record}
                                                                        </div>
                                                                  ))}
                                                            </div>
                                                      </div>
                                                )}
                                          </div>
                                    )}
                              </div>
                        {claimInfo?.forms_wallet_address?.trim().toLowerCase() === sessionAddress?.trim().toLowerCase() && (
                              <ShareButton item={apiFileInfo} nonce={nonce} />
                        )}
                        </div>
                  </div>
                  <div className='col-span-5 p-2'>
                              <div className="flex flex-col gap-2">
                                    <h3 className="text-lg font-bold text-center">Claim Verification</h3>
                                    <div className="flex flex-col gap-2 h-[400px] overflow-y-auto px-2 py-2">
                                          {
                                                verificationLogs.map((log, index) => (
                                                      <div className="w-full" key={index}>
                                                            <Alert className={getClasses(log.type)}>
                                                                  {/* <Terminal /> */}
                                                                  {
                                                                        getIcon(log.type)
                                                                  }
                                                                  <AlertTitle>Heads up!</AlertTitle>
                                                                  <AlertDescription className={getClasses(log.type)}>
                                                                        {log.content}
                                                                  </AlertDescription>
                                                            </Alert>
                                                      </div>
                                                ))
                                          }
                                    </div>
                              </div>
                        </div>
            </div>
      )
}

export default DNSClaim
