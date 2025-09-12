import {ensureDomainUrlHasSSL, formatCryptoAddress} from '@/utils/functions'
import {useEffect, useState} from 'react'
import {TbWorldWww} from 'react-icons/tb'
import {FaCheck, FaChevronDown, FaChevronUp, FaTimes} from 'react-icons/fa'
import appStore from '../../store'
import {useStore} from 'zustand'
import ImprovedDNSLogs from './DNSClaimLogs'

interface IDNSClaim {
      claimInfo: Record<string, string>
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

const DNSClaim = ({ claimInfo }: IDNSClaim) => {
      // State for DNS verification
      const [verificationStatus, setVerificationStatus] = useState<'loading' | 'verified' | 'failed' | 'not_found' | 'pending'>('loading')
      const [verificationMessage, setVerificationMessage] = useState<string>('Checking DNS verification...')
      const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
      const [showLogs, setShowLogs] = useState<boolean>(false)

      const { backend_url } = useStore(appStore)

      // Extract relevant information from claimInfo
      const claimName = 'DNS Claim'
      const description = 'Domain control validation for a domain.'
      const domain = claimInfo['forms_domain'] || ''
      const walletAddress = claimInfo['forms_wallet_address'] || ''
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
                        <p 
                              className={`text-sm font-medium max-w-[200px] text-right ${cssClass}`}
                              style={{
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                              }}
                        >{processedValue}</p>
                  </div>
            )
      }).filter(Boolean) // Filter out null entries

      const resetVerification = () => {
            setVerificationStatus('loading')
            setVerificationMessage('Checking DNS records...')
            setVerificationResult(null)
      }

      const verifyDNS = async () => {
            resetVerification()

            if (!domain) {
                  setVerificationStatus('failed')
                  setVerificationMessage('No domain specified')
                  return
            }

            try {
                  setVerificationStatus('loading')
                  setVerificationMessage('Verifying DNS records...')

                  const url = `${backend_url}/verify/dns_claim`
                  const actualUrlToFetch = ensureDomainUrlHasSSL(url)
                  const response = await fetch(actualUrlToFetch, {
                        method: 'POST',
                        headers: {
                              'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                              domain: domain,
                              wallet: walletAddress
                        }),
                  })

                  // if (!response.ok) {
                  //   throw new Error(`HTTP error! status: ${response.status}`)
                  // }

                  // const result: VerificationResult = await response.json()
                  // setVerificationResult(result)


                  // if (result.success) {
                  //   setVerificationStatus('verified')
                  //   setVerificationMessage(result.message)
                  // } else {
                  // Determine status based on the response and logs
                  //   if (response.status === 404 || result.logs.some(log => log.message.includes('No TXT records found'))) {
                  //     setVerificationStatus('not_found')
                  //     setVerificationMessage(result.message || 'DNS records not found')
                  //   } else {
                  //     setVerificationStatus('failed')
                  //     setVerificationMessage(result.message || 'Verification failed')
                  //   }


                  // }

                  const result: VerificationResult = await response.json()
                  setVerificationResult(result)

                  if (result.success) {
                        setVerificationStatus('verified')
                        setVerificationMessage(result.message)
                  } else {
                        // Determine status based on the response status and result
                        if (response.status === 404) {
                              setVerificationStatus('not_found')
                              setVerificationMessage(result.message || 'DNS records not found')
                        } else if (response.status === 429) {
                              setVerificationStatus('failed')
                              setVerificationMessage(result.message || 'Rate limit exceeded. Please try again later.')
                        } else if (response.status === 400) {
                              setVerificationStatus('failed')
                              setVerificationMessage(result.message || 'Invalid request format')
                        } else if (response.status === 422) {
                              setVerificationStatus('failed')
                              setVerificationMessage(result.message || 'Verification failed')
                        } else {
                              // Fallback for other cases
                              setVerificationStatus('failed')
                              setVerificationMessage(result.message || 'Verification failed')
                        }
                  }
            } catch (error) {
                  console.error('Error verifying DNS claim:', error)
                  setVerificationStatus('failed')
                  setVerificationMessage('Error connecting to verification service')


            }
      }

      // const _getLogLevelColor = (level: string) => {
      //       switch (level) {
      //             case 'success':
      //                   return 'text-green-600'
      //             case 'error':
      //                   return 'text-red-600'
      //             case 'warning':
      //                   return 'text-amber-600'
      //             case 'info':
      //             default:
      //                   return 'text-blue-600'
      //       }
      // }

      const getCardBackgroundColor = () => {
            if (verificationStatus === 'verified') {
                  return 'bg-green-50 border-green-200'
            } else if (verificationStatus === 'failed' || verificationStatus === 'not_found') {
                  return 'bg-red-50 border-red-200'
            }
            return 'bg-white border-gray-200'
      }

      useEffect(() => {
            if (domain && walletAddress) {
                  verifyDNS()
            }
      }, [domain, walletAddress])

      return (
            <div className="w-full max-w-2xl">
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
                                                {verificationResult?.dnssecValidated && (
                                                      <p className="text-xs text-green-600 mt-1">DNSSEC Validated</p>
                                                )}
                                          </div>
                                    )}
                              </div>
                        </div>

                        <div className="flex flex-col gap-3">{fields}</div>

                        {/* Verification Results */}
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
                                                {/* FIXED: Show logs toggle button when there are logs, regardless of verification status */}
                                                {verificationResult?.logs?.length > 0 && (
                                                      <button
                                                            onClick={() => setShowLogs(!showLogs)}
                                                            className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                                      >
                                                            <span className="text-xs">View Logs</span>
                                                            {showLogs ? <FaChevronUp /> : <FaChevronDown />}
                                                      </button>
                                                )}
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

                        {/* Retry button for failed verifications */}
                        {(verificationStatus === 'failed' || verificationStatus === 'not_found') && (
                              <div className="mt-4 flex justify-center">
                                    <button
                                          onClick={verifyDNS}
                                          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                          Retry Verification
                                    </button>
                              </div>
                        )}
                  </div>

                  {/* Collapsible Logs - Outside the main card */}
                  {/* {showLogs && verificationResult && verificationResult?.logs?.length > 0 && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Verification Logs</h3>
            <button
              onClick={() => setShowLogs(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaChevronUp />
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3">
            {verificationResult.logs.map((log, index) => (
              <div key={index} className="bg-white rounded p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className={`font-semibold uppercase text-xs px-2 py-1 rounded ${getLogLevelColor(log.level)} bg-opacity-10`}>
                    {log.level}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 font-medium">{log.message}</p>
                    {log.details && (
                      <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded overflow-x-auto">
                        <pre className="whitespace-pre-wrap">
                          {typeof log.details === 'string' 
                            ? log.details 
                            : JSON.stringify(log.details, null, 2)
                          }
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

                  {/* // Replace your existing logs section with: */}
                  {verificationResult && (
                        <ImprovedDNSLogs
                              verificationResult={verificationResult}
                              verificationMessage={verificationMessage}
                              showLogs={showLogs}
                              onToggleLogs={() => setShowLogs(!showLogs)}
                        />
                  )}
            </div>
      )
}

export default DNSClaim
