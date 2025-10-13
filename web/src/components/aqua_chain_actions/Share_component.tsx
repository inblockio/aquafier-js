import appStore from '@/store'
import { Contract } from '@/types/types'
import { SYSTEM_WALLET_ADDRESS } from '@/utils/constants'
import { fetchWalletAddressesAndNamesForInputRecommendation, getGenesisHash, isValidEthereumAddress, timeToHumanFriendly } from '@/utils/functions'
import { getAquaTreeFileObject } from 'aqua-js-sdk'
import axios from 'axios'
import { Share2, X, Users, ExternalLink, Check, Copy, Lock, Trash2, Plus } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { generateNonce } from 'siwe'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import CopyButton from '../CopyButton'
import { WalletAutosuggest } from '../wallet_auto_suggest'
import { Button } from '@/components/ui/button'
import { Badge } from '../ui/badge'
import WalletAdrressClaim from '@/pages/v2_claims_workflow/WalletAdrressClaim'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'

const ShareComponent = () => {

      const { selectedFileInfo, setSelectedFileInfo, setOpenDialog, backend_url, session, files, systemFileInfo } = useStore(appStore)
      const [loading, setLoading] = useState(true)
      const [recipientType, setRecipientType] = useState<'0xfabacc150f2a0000000000000000000000000000' | 'specific'>('0xfabacc150f2a0000000000000000000000000000')
      // const [walletAddress, setWalletAddress] = useState('')
      const [optionType, setOptionType] = useState<'latest' | 'current'>('latest')
      const [shared, setShared] = useState<string | null>(null)
      const [sharing, setSharing] = useState(false)
      const [copied, setCopied] = useState(false)
      const [loadingPreviousShares, setLoadingPreviousShares] = useState(true)
      const [previousShares, setPreviousShares] = useState<Contract[]>([])
      const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])
      const [recipientErrors, setRecipientErrors] = useState<{ [key: number]: string }>({})
      // const recipients = recipientType === SYSTEM_WALLET_ADDRESS ? [SYSTEM_WALLET_ADDRESS] : multipleAddresses

      const addAddress = () => {
            // if (multipleAddresses.length === 0 && session?.address) {
            //     setMultipleAddresses([...multipleAddresses, session.address, ""])
            // } else {
            setMultipleAddresses([...multipleAddresses, ''])
            // }
      }

      const removeAddress = (index: number) => {
            setMultipleAddresses(multipleAddresses.filter((_, i) => i !== index))
      }

      const resetShareState = () => {
            setShared(null)
            setSharing(false)
      }


      useEffect(() => {
            const timer = setTimeout(() => {
                  setLoading(false)
            }, 1000)
            return () => clearTimeout(timer)
      }, [])

      const itemsToWatchForChange = useMemo(() => {
            return [recipientType, optionType, multipleAddresses]
      }, [recipientType, optionType, multipleAddresses])

      useEffect(() => {
            resetShareState()
      }, [JSON.stringify(itemsToWatchForChange)])

      const handleCopy = () => {
            if (shared) {
                  navigator.clipboard.writeText(shared)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
            }
      }

      const handleShare = async () => {
            if (!selectedFileInfo) {
                  toast.error(`selected file not found`)
                  return
            }
            if (recipientType == 'specific' && multipleAddresses.length == 0) {
                  toast.error(`If recipient is specific a wallet address has to be specified.`)
                  return
            }

            if (recipientType == 'specific') {
                  let invalidAddresses: { msg: string, index: number }[] = []
                  for (let i = 0; i < multipleAddresses.length; i++) {
                        let addr = multipleAddresses[i]
                        if (!addr || addr.trim() === '') {
                              invalidAddresses.push({ msg: `Empty address at position`, index: i })
                        } else if (!isValidEthereumAddress(addr)) {
                              invalidAddresses.push({ msg: `Invalid address at position`, index: i })
                        }
                  }
                  if (invalidAddresses.length > 0) {
                        // toast.error(`${invalidAddresses.length} invalid wallet address found. Please fill all wallet address fields or remove empty ones.`)
                        // Show a message for the index of invalid addresses
                        let _recipientErrors: { [key: number]: string } = {}
                        for (let i = 0; i < invalidAddresses.length; i++) {
                              _recipientErrors[invalidAddresses[i].index] = invalidAddresses[i].msg
                        }
                        setRecipientErrors(_recipientErrors)
                        return
                  }

            }

            setSharing(true)

            const unique_identifier = `${Date.now()}_${generateNonce()}`
            const url = `${backend_url}/share_data`

            const allHashes = Object.keys(selectedFileInfo!.aquaTree!.revisions!)
            const latest = allHashes[allHashes.length - 1]


            let recepientWalletData: string[] = []

            if (recipientType == 'specific') {
                  recepientWalletData = multipleAddresses
            } else {
                  recepientWalletData = [SYSTEM_WALLET_ADDRESS]
            }

            let mainFileObject = getAquaTreeFileObject(selectedFileInfo)

            if (!mainFileObject) {
                  toast.error(`selected file name not found`)
                  return
            }

            const response = await axios.post(
                  url,
                  {
                        latest: latest,
                        hash: unique_identifier,
                        recipients: recepientWalletData,
                        option: optionType,
                        file_name: mainFileObject.fileName,
                        genesis_hash: getGenesisHash(selectedFileInfo.aquaTree!),

                  },
                  {
                        headers: {
                              nonce: session?.nonce,
                        },
                  }
            )

            if (response.status === 200) {
                  setSharing(false)
                  const domain = window.location.origin
                  setShared(`${domain}/app/shared-contracts/${unique_identifier}`)
            } else {
                  toast.error('Error sharing')
                  setSharing(false)
            }
      }

      const getDomain = () => {
            return window.location.origin
      }

      const loadPreviousShare = async () => {
            setLoadingPreviousShares(true)
            try {
                  if (!selectedFileInfo) {
                        setLoadingPreviousShares(false)
                        toast.error(`selected file not found`)
                        return
                  }

                  const response = await axios.get(`${backend_url}/contracts`, {
                        params: {
                              genesis_hash: getGenesisHash(selectedFileInfo.aquaTree!),
                              sender: session?.address
                        },
                        headers: {
                              nonce: session?.nonce
                        }
                  })
                  if (response.status === 200) {
                        setPreviousShares(response.data.contracts)
                  } else {
                        toast.error('Error loading previous share')
                  }
                  setLoadingPreviousShares(false)
            } catch (error) {
                  toast.error('Error loading previous share')
                  setLoadingPreviousShares(false)
            }
      }

      const getAddressError = (index: number) => {
            return recipientErrors[index]
      }

      useEffect(() => {
            setRecipientErrors({})
      }, [JSON.stringify(multipleAddresses)])

      useEffect(() => {
            loadPreviousShare()
      }, [shared])

      if (loading) {
            return (
                  <div
                        style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '100vh',
                              width: '100vw',
                        }}
                  >
                        <ClipLoader color={'blue'} loading={loading} size={150} aria-label="Loading Spinner" data-testid="loader" />
                        <span style={{ fontSize: 24, fontWeight: 500 }}>Loading...</span>
                  </div>
            )
      }

      return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  {/* <div className="sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[65vh] sm:max-h-[65vh] !max-w-[95vw] !w-[95vw]  bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"> */}
                  <div className="sm:!max-w-[65vw] sm:!w-[45vw] sm:h-[75vh] sm:max-h-[95vh] !max-w-[60vw] !w-[65vw]  bg-white rounded-xl shadow-2xl   overflow-hidden ">
                        {/* Header */}
                        <div className="px-6 py-4 border-b h-[80px] border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                              <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                          <div className="p-2 bg-blue-100 rounded-lg">
                                                <Share2 className="w-5 h-5 text-blue-600" />
                                          </div>
                                          <div>
                                                <h2 className="text-lg font-semibold text-gray-900">Share Document</h2>
                                                <p className="text-sm text-gray-600">{selectedFileInfo?.fileObject[0].fileName}</p>
                                          </div>
                                    </div>
                                    <button
                                          onClick={() => {
                                                setOpenDialog(null)
                                                setSelectedFileInfo(null)
                                          }}
                                          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                                    >
                                          <X className="w-5 h-5 text-gray-400" />
                                    </button>
                              </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 py-6 space-y-6 overflow-y-auto" style={{
                              height: "calc(100% - 140px)"
                        }}>
                              {/* Warning */}
                              <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                    </div>
                                    <div>
                                          <p className="text-sm font-medium text-amber-800">Important</p>
                                          <p className="text-sm text-amber-700 mt-1">
                                                Once shared, don't delete this file as it will break the shared link for recipients.
                                          </p>
                                    </div>
                              </div>

                              {/* Recipient Selection */}
                              <div className="space-y-4">
                                    <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                                          <Users className="w-4 h-4" />
                                          Who can access
                                    </h3>

                                    <div className="grid gap-3">
                                          {/* Public Option */}
                                          <div
                                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${recipientType !== 'specific'
                                                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                      }`}
                                                onClick={() => setRecipientType('0xfabacc150f2a0000000000000000000000000000')}
                                          >
                                                <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${recipientType !== 'specific' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                  <ExternalLink className={`w-4 h-4 ${recipientType !== 'specific' ? 'text-blue-600' : 'text-gray-600'}`} />
                                                            </div>
                                                            <div>
                                                                  <div className="font-medium text-sm">Anyone with link</div>
                                                                  <div className="text-xs text-gray-500">Public access to shared document</div>
                                                            </div>
                                                      </div>
                                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${recipientType !== 'specific' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                            }`}>
                                                            {recipientType !== 'specific' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Specific Wallet Option */}
                                          <div
                                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${recipientType === 'specific'
                                                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                      }`}
                                                onClick={() => { setRecipientType('specific'); addAddress() }}
                                          >
                                                <div className="flex items-center justify-between">
                                                      <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${recipientType === 'specific' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                  <Lock className={`w-4 h-4 ${recipientType === 'specific' ? 'text-blue-600' : 'text-gray-600'}`} />
                                                            </div>
                                                            <div>
                                                                  <div className="font-medium text-sm">Specific wallet</div>
                                                                  <div className="text-xs text-gray-500">Restricted access by wallet address</div>
                                                            </div>
                                                      </div>
                                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${recipientType === 'specific' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                            }`}>
                                                            {recipientType === 'specific' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                      </div>
                                                </div>
                                          </div>
                                    </div>

                                    {/* Wallet Address Input */}
                                    {recipientType === 'specific' && (
                                          <div className="ml-12 space-y-2">

                                                <div key={`field-share-1`} className="space-y-4">
                                                      <div className="flex items-center justify-end">

                                                            <Button
                                                                  variant="outline"
                                                                  size="sm"
                                                                  type="button"
                                                                  className="rounded-lg hover:bg-blue-50 hover:border-blue-300"
                                                                  onClick={addAddress}
                                                                  data-testid={`multiple_values_add_button`}
                                                            >
                                                                  <Plus className="h-4 w-4 mr-1" />
                                                                  Add New Recepient
                                                            </Button>
                                                      </div>

                                                      <div className="space-y-3">
                                                            {multipleAddresses.map((address, index) => (
                                                                  <div
                                                                        key={`address-${index}`}
                                                                        className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-4 bg-gray-50 rounded-lg border"
                                                                  >
                                                                        <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-medium text-sm">
                                                                              {index + 1}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                              <WalletAutosuggest
                                                                                    walletAddresses={fetchWalletAddressesAndNamesForInputRecommendation(systemFileInfo, files)}
                                                                                    field={{
                                                                                          name: `share_address_${index}`,
                                                                                    }}
                                                                                    index={index}
                                                                                    address={address}
                                                                                    multipleAddresses={multipleAddresses}
                                                                                    setMultipleAddresses={setMultipleAddresses}
                                                                                    placeholder="Enter wallet address (0x...)"
                                                                                    className="rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                                                              />
                                                                              {
                                                                                    // Display error here if any
                                                                                    getAddressError(index) && <span className="text-red-500 text-xs">{getAddressError(index)}</span>
                                                                              }
                                                                        </div>
                                                                        {multipleAddresses.length > 1 && (
                                                                              <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    type="button"
                                                                                    className="rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                                                                                    onClick={() => removeAddress(index)}
                                                                              >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                              </Button>
                                                                        )}
                                                                  </div>
                                                            ))}
                                                      </div>
                                                </div>
                                          </div>
                                    )}
                              </div>

                              {/* Sharing Options */}
                              <div className="space-y-4">
                                    <h3 className="text-base font-medium text-gray-900">Version to share</h3>
                                    <p className="text-sm text-gray-600">Choose whether recipients get the current version or receive updates automatically.</p>

                                    <div className="grid gap-3">
                                          {/* Latest Option */}
                                          <div
                                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${optionType === 'latest'
                                                      ? 'border-green-500 bg-green-50 ring-2 ring-green-500/20'
                                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                      }`}
                                                onClick={() => setOptionType('latest')}
                                          >
                                                <div className="flex items-center justify-between">
                                                      <div>
                                                            <div className="font-medium text-sm flex items-center gap-2">
                                                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                                  Latest (Live Updates)
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">Recipients get all future changes automatically</div>
                                                      </div>
                                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${optionType === 'latest' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                                            }`}>
                                                            {optionType === 'latest' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                      </div>
                                                </div>
                                          </div>

                                          {/* Current Option */}
                                          <div
                                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${optionType === 'current'
                                                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/20'
                                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                      }`}
                                                onClick={() => setOptionType('current')}
                                          >
                                                <div className="flex items-center justify-between">
                                                      <div>
                                                            <div className="font-medium text-sm flex items-center gap-2">
                                                                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                                                  Current (Snapshot)
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">Recipients get the current version only</div>
                                                      </div>
                                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${optionType === 'current' ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                                                            }`}>
                                                            {optionType === 'current' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                      </div>
                                                </div>
                                          </div>
                                    </div>
                              </div>

                              {/* Loading State */}
                              {sharing && (
                                    <div className="flex flex-col items-center py-8 space-y-3">
                                          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                          <p className="text-sm text-gray-600">Creating share link...</p>
                                    </div>
                              )}

                              {/* Shared Link */}
                              {shared && !sharing && (
                                    <div className="space-y-3">
                                          <h3 className="text-base font-medium text-gray-900">Share Link Ready</h3>
                                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                <div className="flex items-center gap-3">
                                                      <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                      <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-mono text-gray-700 break-all">{shared}</p>
                                                      </div>
                                                </div>
                                          </div>
                                          <p className="text-xs text-gray-500">Share this link with your intended recipients</p>
                                    </div>
                              )}

                              {/* Existing Contracts */}
                              <div className="border-t pt-6 flex flex-col gap-2">
                                    <h3 className="text-base font-medium text-gray-900 mb-3">Previous Shares</h3>
                                    {
                                          loadingPreviousShares ? (
                                                <div className="flex items-center justify-center">
                                                      <div className="text-center py-8 text-gray-400">
                                                            <ClipLoader className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-sm">Loading previous shared contracts...</p>
                                                      </div>
                                                </div>
                                          ) : (
                                                <div className="flex flex-col gap-2">
                                                      {
                                                            previousShares.length === 0 ? (
                                                                  <div className="text-center py-8 text-gray-400">
                                                                        <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                                        <p className="text-sm">No previous sharing contracts</p>
                                                                  </div>
                                                            ) : null
                                                      }
                                                      {
                                                            previousShares.map((share) => (
                                                                  <div key={share.hash} className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                                        <div className="flex items-center gap-3">
                                                                              <Link to={`/app/shared-contracts/${share.hash}`}>
                                                                                    <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                                              </Link>
                                                                              <div className="flex-1 min-w-0 flex items-center gap-2 justify-between">
                                                                                    <div className="flex flex-col gap-1">
                                                                                          <div className="text-sm font-medium">
                                                                                                <p>
                                                                                                      Shared with:
                                                                                                </p>
                                                                                                {share.recipients.includes(SYSTEM_WALLET_ADDRESS) ? "Everyone" : (
                                                                                                      <div>
                                                                                                            {share.recipients.map((e, i: number) => (
                                                                                                                  <div key={`${share.hash}-${i}`} className="flex gap-1" style={{
                                                                                                                        alignItems: "center",
                                                                                                                  }}>
                                                                                                                        <p className='text-gray-500 text-xs' style={{ wordBreak: "break-all", fontFamily: "monospace" }}>
                                                                                                                              {`${i + 1}.`}
                                                                                                                        </p>
                                                                                                                        {
                                                                                                                              e.toLowerCase() === SYSTEM_WALLET_ADDRESS ? <Badge className="text-xs">Everyone</Badge> : null
                                                                                                                        }
                                                                                                                        {
                                                                                                                              e.toLowerCase() !== SYSTEM_WALLET_ADDRESS ? <WalletAdrressClaim walletAddress={e} /> : null
                                                                                                                        }
                                                                                                                  </div>
                                                                                                            ))}
                                                                                                      </div>
                                                                                                )}
                                                                                                <p className="text-sm font-medium">
                                                                                                      {timeToHumanFriendly(share.created_at!, true)}
                                                                                                </p>
                                                                                          </div>
                                                                                          <p className="text-sm font-mono text-gray-700 break-all">
                                                                                                {`${getDomain()}/app/shared-contracts/${share.hash}`}
                                                                                          </p>
                                                                                    </div>
                                                                                    <div>
                                                                                          <CopyButton text={`${getDomain()}/app/shared-contracts/${share.hash}`} />
                                                                                    </div>
                                                                              </div>
                                                                        </div>
                                                                  </div>
                                                            ))
                                                      }
                                                </div>
                                          )
                                    }
                              </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-2 border-t border-gray-100 bg-gray-50 h-[60px] flex justify-between items-center gap-3">
                              <button
                                    onClick={() => {
                                          setOpenDialog(null)
                                          setSelectedFileInfo(null)
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                    Cancel
                              </button>
                              <div className="flex gap-2">
                                    {shared ? (
                                          <button
                                                onClick={handleCopy}
                                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer transition-colors flex items-center gap-2"
                                          >
                                                {copied ? (
                                                      <>
                                                            <Check className="w-4 h-4" />
                                                            Copied!
                                                      </>
                                                ) : (
                                                      <>
                                                            <Copy className="w-4 h-4" />
                                                            Copy Link
                                                      </>
                                                )}
                                          </button>
                                    ) : null}

                                    <button
                                          onClick={handleShare}
                                          disabled={shared ? true : false}
                                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                          {sharing ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                          ) : (
                                                <Share2 className="w-4 h-4" />
                                          )}
                                          {sharing ? 'Sharing...' : 'Create Share Link'}
                                    </button>
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default ShareComponent