import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import { formatCryptoAddress, getAquaTreeFileName, getGenesisHash, isWorkFlowData } from '@/utils/functions'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { LucideCheckCircle, TimerIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HiHashtag, HiShieldCheck } from 'react-icons/hi'
import { LuUser } from 'react-icons/lu'
import { TbWorldWww } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useStore } from 'zustand'

interface ISignatureWalletAddressCard {
      index?: number
      signatureHash: string
      walletAddress: string
      timestamp: string
}

interface IClaim {
      claimType: string
      claimName?: string
      attestationsCount: number
      apiFileInfo: ApiFileInfo
}

const ClaimCard = ({ claim }: { claim: IClaim }) => {
      const { setSelectedFileInfo } = useStore(appStore)
      const navigate = useNavigate()

      const openClaimPage = () => {
            setSelectedFileInfo(claim.apiFileInfo)
            navigate('/app/claims/workflow')
      }

      const getClaimIcon = () => {
            if (claim.claimType === 'simple_claim') {
                  return (
                        <div className="h-[24px] w-[24px] flex items-center justify-center">
                              <HiShieldCheck />
                        </div>
                  )
            } else if (claim.claimType === 'dns_claim') {
                  return (
                        <div className="h-[24px] w-[24px] flex items-center justify-center">
                              <TbWorldWww />
                        </div>
                  )
            } else {
                  return (
                        <div className="h-[24px] w-[24px] flex items-center justify-center">
                              <LucideCheckCircle />
                        </div>
                  )
            }
      }

      return (
            <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                        <div className="w-[20px] h-[20px] flex items-center justify-center text-gray-500">{getClaimIcon()}</div>
                        <div className="flex flex-col gap-2">
                              <span className="text-sm">{claim.claimName || claim.claimType}</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full w-fit">
                                    {claim.attestationsCount} attestation
                                    {claim.attestationsCount !== 1 ? 's' : ''}
                              </span>
                        </div>
                  </div>
                  <div className="flex items-center gap-2">
                        <button onClick={openClaimPage} className="px-3 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors cursor-pointer">
                              View
                        </button>
                  </div>
            </div>
      )
}

const SignatureWalletAddressCard = ({ walletAddress, signatureHash, index, timestamp }: ISignatureWalletAddressCard) => {
      const { files, systemFileInfo, setSelectedFileInfo } = useStore(appStore)
      const [claims, setClaims] = useState<IClaim[]>([])
      const [totalAttestations, setTotalAttestations] = useState(0)
      const [loading, setLoading] = useState(false)

      const navigate = useNavigate()

      const getWalletClaims = () => {
            setLoading(true)
            const aquaTemplates: string[] = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        // //  console.log('Error processing system file') // More descriptive
                        return ''
                  }
            })

            if (files && files.fileData.length > 0) {
                  let attestationFiles = files.fileData.filter(file => {
                        const fileInfo = isWorkFlowData(file.aquaTree!, aquaTemplates)
                        return fileInfo.isWorkFlow && fileInfo.workFlow === 'identity_attestation'
                  })

                  const localClaims: IClaim[] = []
                  let _totalAttestations = 0
                  for (let i = 0; i < files.fileData.length; i++) {
                        const aquaTree = files.fileData[i].aquaTree
                        if (aquaTree) {
                              const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, aquaTemplates)

                              if (isWorkFlow && (workFlow === 'identity_claim' || workFlow === 'domain_claim')) {
                                    const orderedAquaTree = OrderRevisionInAquaTree(aquaTree)
                                    const revisionHashes = Object.keys(orderedAquaTree.revisions)
                                    const firstRevisionHash = revisionHashes[0]
                                    const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                                    const _wallet_address = firstRevision.forms_wallet_address
                                    if (walletAddress === _wallet_address) {
                                          // setSelectedFileInfo(files[i])
                                          // firstClaim = files[i]
                                          let attestationsCount = 0

                                          // Lets get all Attestation for this claim
                                          for (let a = 0; a < attestationFiles.length; a++) {
                                                let attestationFile = attestationFiles[a]
                                                let attestationAquaTree = attestationFile?.aquaTree!
                                                let attestationFileGenesisHash = getGenesisHash(attestationAquaTree)!
                                                let genesisRevision = attestationAquaTree.revisions[attestationFileGenesisHash]
                                                if (genesisRevision.forms_claim_wallet_address === _wallet_address) {
                                                      attestationsCount += 1
                                                }
                                          }
                                          _totalAttestations += attestationsCount
                                          let claimInformation: IClaim = {
                                                claimType: firstRevision.forms_type,
                                                claimName: firstRevision.forms_name ?? firstRevision.forms_domain,
                                                attestationsCount: attestationsCount,
                                                apiFileInfo: files.fileData[i],
                                          }
                                          localClaims.push(claimInformation)
                                    }
                              }
                        }
                  }

                  setClaims(localClaims)
                  setTotalAttestations(_totalAttestations)
                  setLoading(false)
            }
      }

      const openClaimPage = () => {
            if (claims.length > 0) {
                  const firstClaim = claims[0]?.apiFileInfo
                  if (firstClaim) {
                        setSelectedFileInfo(firstClaim)
                        navigate('/app/claims/workflow')
                  }
            } else {
                  toast.info('Claim not found', {
                        description: 'No claims found for this wallet address',
                  })
            }
      }

      const getClassesToRender = () => {
            if (claims.length > 0 && totalAttestations === 0) {
                  return 'border-yellow-500'
            }
            if (claims.length > 0 && totalAttestations > 0) {
                  return 'border-green-500'
            }
            return 'border-transparent'
      }

      useEffect(() => {
            getWalletClaims()
      }, [])

      return (
            <div className={`${getClassesToRender()} flex flex-col gap-2 border-2 rounded-lg p-2 bg-white dark:bg-gray-800`}>
                  <div className="flex align-start gap-2 p-4 cursor-pointer" onClick={openClaimPage}>
                        {index && <div className="bg-gray-200 rounded-md p-4 w-[20px] h-[20px] flex items-center justify-center">{index}</div>}
                        <div className="flex flex-col gap-2">
                              <div className="flex align-center gap-2">
                                    <div className="w-[20px] h-[20px] flex items-center justify-center">
                                          <HiHashtag className="h-100 w-100 text-gray-500" />
                                    </div>
                                    <div className="flex flex-nowrap gap-2">
                                          <p className="text-sm">Signature Hash: </p>
                                          <p className="text-xs break-all text-gray-500">{`${formatCryptoAddress(signatureHash, 4, 6)}`}</p>
                                    </div>
                              </div>
                              <div className="flex align-center gap-2 justify-end">
                                    <div className="w-[20px] h-[20px] flex items-center justify-center">
                                          <LuUser className="h-100 w-100 text-gray-500" />
                                    </div>
                                    <div className="flex flex-nowrap gap-2">
                                          <p className="text-sm">Wallet: </p>
                                          <p className="text-xs break-all text-gray-500">{`${walletAddress}`}</p>
                                    </div>
                              </div>
                              <div className="flex align-center gap-2">
                                    <div className="w-[20px] h-[20px] flex items-center justify-center">
                                          <TimerIcon className="h-100 w-100 text-gray-500" />
                                    </div>
                                    <div className="flex flex-nowrap gap-2">
                                          <p className="text-sm">Timestamp: </p>
                                          <p className="text-xs break-all text-gray-500">{`${timestamp}`}</p>
                                    </div>
                              </div>
                        </div>
                  </div>
                  {/* <div className="h-[1px] bg-gray-200 dark:bg-gray-700" /> */}
                  {loading ? (
                        <div className="flex align-center gap-2">
                              <div className="w-[20px] h-[20px] flex items-center justify-center">
                                    <TimerIcon className="h-100 w-100 text-gray-500" />
                              </div>
                              <div className="flex flex-nowrap gap-2">
                                    <p className="text-sm">Loading...</p>
                              </div>
                        </div>
                  ) : (
                        <>
                              {claims.map((claim, index) => (
                                    <ClaimCard key={`claim_${index}`} claim={claim} />
                              ))}
                        </>
                  )}
            </div>
      )
}

export default SignatureWalletAddressCard
