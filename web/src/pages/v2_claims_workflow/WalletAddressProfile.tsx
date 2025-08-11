import CustomCopyButton from '@/components/CustomCopyButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import { formatCryptoAddress, generateAvatar, getAquaTreeFileName, getGenesisHash, isWorkFlowData } from '@/utils/functions'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { ArrowRight, LucideCheckCircle, Mail, Phone, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HiShieldCheck } from 'react-icons/hi'
import { TbWorldWww } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { useStore } from 'zustand'

interface ISignatureWalletAddressCard {
      index?: number
      signatureHash?: string
      walletAddress?: string
      timestamp?: string
      callBack?: () => void
      showAvatar?: boolean
}

interface IClaim {
      claimType: string
      claimName?: string
      attestationsCount: number
      apiFileInfo: ApiFileInfo
}

const ClaimCard = ({ claim }: { claim: IClaim }) => {

      const getTextContent = () => {
            let textContent = claim.claimName || claim.claimType
            if (claim.claimType === "domain_claim") {
                  textContent = textContent.replace("aqua._wallet.", "")
            }
            return textContent
      }

      const getClaimIcon = () => {
            if (claim.claimType === 'identity_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <HiShieldCheck size={24} className={extraClasses} />
                        </div>
                  )
            } else if (claim.claimType === 'domain_claim') {
                  return (
                        <div className="h-[34px] w-[34px] flex items-center justify-center">
                              <TbWorldWww size={24} />
                        </div>
                  )
            }
            else if (claim.claimType === 'phone_number_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <Phone size={24} />
                        </div>
                  )
            }
            else if (claim.claimType === 'email_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <Mail size={24} />
                        </div>
                  )
            }
            else {
                  return (
                        <div className="h-[34px] w-[34px] flex items-center justify-center">
                              <LucideCheckCircle size={24} />
                        </div>
                  )
            }
      }

      return (
            <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                        <div className="w-[34px] h-[34px] flex items-center justify-center text-gray-500">{getClaimIcon()}</div>
                        <div className="flex flex-col gap-2">
                              <span className="text-sm">{getTextContent()}</span>
                        </div>
                  </div>
            </div>
      )
}

const WalletAddressProfile = ({ walletAddress, callBack, showAvatar }: ISignatureWalletAddressCard) => {
      const { files, systemFileInfo } = useStore(appStore)
      const [claims, setClaims] = useState<IClaim[]>([])
      // const [totalAttestations, setTotalAttestations] = useState(0)
      const [loading, setLoading] = useState(false)
      const navigate = useNavigate()
      const requiredClaims = ['simple_claim', 'domain_claim', 'identity_claim', 'phone_number_claim', 'email_claim']

      const getWalletClaims = () => {
            setLoading(true)
            const aquaTemplates: string[] = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        // console.log('Error processing system file') // More descriptive
                        return ''
                  }
            })

            if (files && files.length > 0) {
                  let attestationFiles = files.filter(file => {
                        const fileInfo = isWorkFlowData(file.aquaTree!, aquaTemplates)
                        return fileInfo.isWorkFlow && fileInfo.workFlow === 'identity_attestation'
                  })

                  console.log("attestationFiles", attestationFiles)

                  const localClaims: IClaim[] = []
                  // let _totalAttestations = 0
                  for (let i = 0; i < files.length; i++) {
                        const aquaTree = files[i].aquaTree
                        if (aquaTree) {
                              const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, aquaTemplates)

                              if (isWorkFlow && requiredClaims.includes(workFlow)) {
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
                                                if (genesisRevision.forms_claim_wallet_address === _wallet_address
                                                      && genesisRevision.forms_identity_claim_id === firstRevisionHash) {
                                                      attestationsCount += 1
                                                }
                                          }

                                          // _totalAttestations += attestationsCount
                                          let claimName = ""
                                          if (workFlow === 'simple_claim' || workFlow === 'identity_claim') {
                                                claimName = firstRevision.forms_name ?? firstRevision.forms_domain
                                          } else if (workFlow === 'domain_claim' || workFlow === 'dns_claim') {
                                                claimName = firstRevision.forms_domain
                                          } else if (workFlow === 'phone_number_claim') {
                                                claimName = firstRevision.forms_phone_number
                                          } else if (workFlow === 'email_claim') {
                                                claimName = firstRevision.forms_email
                                          }
                                          let claimInformation: IClaim = {
                                                claimType: workFlow,
                                                claimName: claimName,
                                                attestationsCount: attestationsCount,
                                                apiFileInfo: files[i],
                                          }
                                          localClaims.push(claimInformation)
                                    }
                              }
                        }
                  }

                  setClaims(localClaims)
                  // setTotalAttestations(_totalAttestations)
                  setLoading(false)
            }
      }

      console.log("Claims ", claims)

      // const openClaimPage = () => {
      //       if (claims.length > 0) {
      //             const firstClaim = claims[0]?.apiFileInfo
      //             if (firstClaim) {
      //                   setSelectedFileInfo(firstClaim)
      //                   navigate('/app/claims/workflow')
      //             }
      //       } else {
      //             toast.info('Claim not found', {
      //                   description: 'No claims found for this wallet address',
      //             })
      //       }
      // }

      // const getClassesToRender = () => {
      //       if (claims.length > 0 && totalAttestations === 0) {
      //             return 'border-yellow-500'
      //       }
      //       if (claims.length > 0 && totalAttestations > 0) {
      //             return 'border-green-500'
      //       }
      //       return 'border-transparent'
      // }

      useEffect(() => {
            getWalletClaims()
      }, [JSON.stringify(files)])

      return (
            <>
            {
                  loading ? <div className="flex items-center justify-center h-full w-full">
                        <ClipLoader color="#000" loading={loading} size={150} />
                  </div> : null
            }
                  {/* <div className={`${getClassesToRender()} flex flex-col gap-2 border-2 rounded-lg p-2 bg-white dark:bg-gray-800`}>
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
                  </div> */}
                  {showAvatar && (
                        <div className="relative group">
                              <Avatar className="size-20 border-2 border-primary/20 hover:border-primary/50 transition-all duration-300">
                                    <AvatarImage src={generateAvatar(walletAddress!)} alt="User Avatar" />
                                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                          {walletAddress ? walletAddress.substring(2, 4).toUpperCase() : 'UN'}
                                    </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-background" title="Connected" />
                        </div>
                  )}
                  {showAvatar && (
                        <div className="flex flex-col items-center gap-2 w-full">
                              <p className="font-mono text-sm bg-secondary/30 px-3 py-1 rounded-full">{formatCryptoAddress(walletAddress, 10, 10)}</p>
                              <CustomCopyButton value={`${walletAddress}`} />
                        </div>
                  )}
                  <div className="flex p-4 flex-col bg-gray-100 rounded-md gap-2">
                        <div className="flex gap-2 align-center">
                              <Wallet />
                              <p className="text-sm break-all">{walletAddress}</p>
                        </div>
                        <div className="flex flex-col gap-0 bg-amber-100 rounded-lg">
                              {
                                    claims.filter((claim) => claim.claimType === 'identity_claim').map((claim, index) => (
                                          <ClaimCard key={`claim_${index}`} claim={claim} />
                                    ))
                              }
                              {
                                    claims.filter((claim) => claim.claimType !== 'identity_claim').map((claim, index) => (
                                          <ClaimCard key={`claim_${index}`} claim={claim} />
                                    ))
                              }
                        </div>
                        <div className="flex justify-end">
                              <Button className="bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer" onClick={() => {
                                    console.log("Clicked", callBack)
                                    if (callBack) {
                                          callBack()
                                    }
                                    navigate(`/app/claims/workflow/${walletAddress}`)
                              }}>
                                    Open Profile
                                    <ArrowRight className="w-4 h-4" />
                              </Button>
                        </div>
                  </div>
            </>
      )
}

export default WalletAddressProfile


