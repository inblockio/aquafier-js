import {ensureDomainUrlHasSSL, formatCryptoAddress, getGenesisHash} from '@/utils/functions'
import {useEffect, useState} from 'react'
import {TbWorldWww} from 'react-icons/tb'
import {FaCheck, FaTimes} from 'react-icons/fa'
import {ShareButton} from '@/components/aqua_chain_actions/share_aqua_chain'
import {ApiFileInfo} from '@/models/FileInfo'
import {useStore} from 'zustand'
import appStore from '@/store'
import apiClient from '@/api/axiosInstance'
import ImprovedDNSLogs from './ImprovedDNSLogs'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LuRefreshCw } from 'react-icons/lu'

interface IDNSClaim {
      claimInfo: Record<string, string>,
      apiFileInfo: ApiFileInfo,
      nonce: string,
      sessionAddress: string,
}

interface LogEntry {
      level: 'info' | 'success' | 'warning' | 'error'
      message: string
      details?: any
}

interface VerificationResult {
      success: boolean
      message: string
      domain: string
      expectedWallet?: string
      totalRecords: number
      verifiedRecords: number
      results: any[]
      logs: LogEntry[]
      dnssecValidated: boolean
}


// const getIcon = (type: string) => {
//       switch (type) {
//             case 'info':
//                   return <Info />
//             case 'success':
//                   return <Check />
//             case 'warning':
//                   return <AlertTriangle />
//             case 'error':
//                   return <X />
//             default:
//                   return <Info />
//       }
// }

// const getClasses = (type: string) => {
//       switch (type) {
//             case 'info':
//                   return 'bg-blue-50 border-blue-200 text-blue-800'
//             case 'success':
//                   return 'bg-green-50 border-green-200 text-green-800'
//             case 'warning':
//                   return 'bg-amber-50 border-amber-200 text-amber-800'
//             case 'error':
//                   return 'bg-red-50 border-red-200 text-red-800'
//             default:
//                   return 'bg-blue-50 border-blue-200 text-blue-800'
//       }
// }

const DNSClaim = ({ claimInfo, apiFileInfo, nonce, sessionAddress }: IDNSClaim) => {
      // State for DNS verification
      const [verificationStatus, setVerificationStatus] = useState<'loading' | 'verified' | 'failed' | 'not_found' | 'pending'>('loading')
      const [verificationMessage, setVerificationMessage] = useState<string>('Checking DNS verification...')
      // const [dnsRecords, setDnsRecords] = useState<string[]>([])
      const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)

      const urlHash = useLocation().hash

      const { backend_url } = useStore(appStore)
      const genesisRevisionHash = getGenesisHash(apiFileInfo.aquaTree!)

      // Helper function to download claim file
      const downloadClaimFile = () => {
            const claimJson = claimInfo['forms_claim_json']
            const uniqueId = claimInfo['forms_unique_id']

            if (!claimJson || !uniqueId) {
                  console.error('No claim data available for download')
                  return
            }

            const blob = new Blob([claimJson], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `claim_${uniqueId}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
      } 

      // Extract relevant information from claimInfo
      const claimName = 'DNS Claim'
      const description = 'Domain control validation for a domain.'
      const domain = claimInfo['forms_domain'] || ''
      const walletAddress = claimInfo['forms_wallet_address'] || ''
      const uniqueId = claimInfo['forms_unique_id']
      const claimSecret = claimInfo['forms_claim_secret']
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

      const verifyDNS = async (forceRefresh: boolean) => {
            resetVerification()

            if (!domain) {
                  setVerificationStatus('failed')
                  setVerificationMessage('No domain specified')
                  return
            }

            try {
                  setVerificationStatus('loading')
                  setVerificationMessage('Verifying DNS records...')

                  const response = await apiClient.post(ensureDomainUrlHasSSL(`${backend_url}/verify/dns_claim`), {
                        domain: domain,
                        wallet: walletAddress,
                        genesis_hash: genesisRevisionHash,
                        refresh: forceRefresh,
                        claimData: {
                              wallet: walletAddress, 
                              uniqueId: uniqueId,
                              secret: claimSecret
                        }
                  })

                  const result: VerificationResult = response.data
                  setVerificationResult(result)

                  if (result.success) {
                        setVerificationStatus('verified')
                        setVerificationMessage(result.message)
                  } else {
                        setVerificationStatus('failed')
                        setVerificationMessage(result.message || 'Verification failed')
                  }
            } catch (error: any) {
                  console.error('Error verifying DNS claim:', error)
                  if (error.response?.data) {
                        const result: VerificationResult = error.response.data
                        setVerificationResult(result)
                        if (error.response.status === 404) {
                              setVerificationStatus('not_found')
                              setVerificationMessage(result.message || 'DNS records not found')
                        } else {
                              setVerificationStatus('failed')
                              setVerificationMessage(result.message || 'Verification failed')
                        }
                  } else {
                        setVerificationStatus('failed')
                        setVerificationMessage('Error connecting to verification service')
                  }
            }
      }

      const getCardBackgroundColor = () => {
            if (verificationStatus === 'verified') {
                  return 'bg-green-50 border-green-200'
            } else if (verificationStatus === 'failed' || verificationStatus === 'not_found') {
                  return 'bg-red-50 border-red-200'
            }
            return 'bg-white border-gray-200'
      }

      useEffect(() => {
            if (domain && walletAddress && genesisRevisionHash) {
                  verifyDNS(false)
            }
      }, [domain, walletAddress, genesisRevisionHash])

      return (
            <div className="grid lg:grid-cols-12 gap-4 relative" id={`${genesisRevisionHash}`}>
                  {
                                    urlHash?.replace("#", "") === genesisRevisionHash ? (
                                          <div className='absolute top-0 right-0 z-10 bg-green-500 w-fit px-2 py-1 text-white rounded-md'>
                                                Selected
                                          </div>
                                    ) : null
                              }
                  <div className='col-span-7 bg-gray-50 p-2'>
                        <div className="flex flex-col gap-2">
                              <div className={`rounded-lg shadow-sm border p-6 ${getCardBackgroundColor()}`}>
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
                                          <div className="flex items-center gap-2">
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
                                                <Button onClick={() => verifyDNS(true)} size={"sm"} variant={"link"} className='cursor-pointer'>
                                                      <LuRefreshCw />
                                                </Button>
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
                                    {/* {verificationStatus !== 'loading' && (
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
                                    )} */}
                                    {verificationResult && (
                                          <div className="mt-4">
                                                <div
                                                      className={`p-3 rounded-md ${verificationResult.success
                                                            ? 'bg-green-100 border border-green-200'
                                                            : 'bg-red-100 border border-red-200'
                                                            }`}
                                                >
                                                      <div className="flex items-center justify-between">
                                                            <div className="flex items-center">
                                                                  {verificationResult.success ? (
                                                                        <FaCheck className="text-green-500 mr-2" />
                                                                  ) : (
                                                                        <FaTimes className="text-red-500 mr-2" />
                                                                  )}
                                                                  <p
                                                                        className={`text-sm font-medium ${verificationResult.success ? 'text-green-800' : 'text-red-800'
                                                                              }`}
                                                                  >
                                                                        {verificationResult.success ? 'Domain Ownership Verified' : 'Verification Failed'}
                                                                  </p>
                                                            </div>
                                                      </div>

                                                      <p className={`mt-1 text-xs ${verificationResult.success ? 'text-green-700' : 'text-red-700'}`}>
                                                            {verificationMessage}
                                                      </p>

                                                      {verificationResult.totalRecords > 0 && (
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                  Records: {verificationResult.verifiedRecords}/{verificationResult.totalRecords} verified
                                                            </p>
                                                      )}
                                                </div>
                                          </div>
                                    )}

                                    {/* Claim File Download Section */}
                                    {claimInfo['forms_unique_id'] && claimInfo['forms_claim_json'] && (
                                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                <h4 className="text-sm font-semibold text-blue-900 mb-2">Claim File</h4>
                                                {claimInfo['forms_public_association'] === 'true' ? (
                                                      <div className="space-y-2">
                                                            <p className="text-xs text-blue-700">
                                                                  <strong>Public mode:</strong> Claim file optional. Wallet address is visible in DNS record.
                                                            </p>
                                                            <button
                                                                  onClick={downloadClaimFile}
                                                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                                                            >
                                                                  Download claim_{claimInfo['forms_unique_id']}.json (Optional)
                                                            </button>
                                                      </div>
                                                ) : (
                                                      <div className="space-y-2">
                                                            <p className="text-xs text-blue-700 mb-2">
                                                                  <strong>Private mode:</strong> Download and store this claim file securely. It's required for verification.
                                                            </p>
                                                            <button
                                                                  onClick={downloadClaimFile}
                                                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                                                            >
                                                                  Download claim_{claimInfo['forms_unique_id']}.json
                                                            </button>
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
                              <div className="flex flex-col h-[600px] overflow-y-auto px-2">
                                    {verificationResult && (
                                          <ImprovedDNSLogs
                                                verificationResult={verificationResult}
                                                verificationMessage={verificationMessage}
                                                showLogs={true}
                                                onToggleLogs={() => { }}
                                          />
                                    )}
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default DNSClaim
