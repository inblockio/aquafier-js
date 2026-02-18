import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import { loadSignatureImage } from '@/utils/functions'
import { reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk'
import { CheckCircle, LucideCheckCircle, Mail, Phone, Signature, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { TbWorldWww } from 'react-icons/tb'
import { useStore } from 'zustand'
import { getDNSStatusBadge, IDnsVerificationResult, verifyDNS } from '@/utils/verify_dns'
import { FaEthereum } from 'react-icons/fa6'

export interface IClaim {
      claimType: string
      claimName?: string
      attestationsCount: number
      apiFileInfo: ApiFileInfo
}

const ClaimCard = ({ claim }: { claim: IClaim }) => {

      const [signatureImage, setSignatureImage] = useState<string | null | Uint8Array>(null)
      const [dnsVerificationResult, setDnsVerificationResult] = useState<IDnsVerificationResult | null>(null)

      const { session, backend_url } = useStore(appStore)

      const ICON_SIZE = 18

      const getTextContent = () => {
            let textContent = claim.claimName || claim.claimType
            if (claim.claimType === "domain_claim") {
                  textContent = textContent.replace("aqua._wallet.", "")
            }
            return textContent
      }

      const getClaimTitle = () => {
            if (claim.claimType === 'identity_claim') {
                  return 'Identity'
            }
            else if (claim.claimType === 'domain_claim') {
                  return 'Domain'
            }
            else if (claim.claimType === 'phone_number_claim') {
                  return 'Phone'
            }
            else if (claim.claimType === 'email_claim') {
                  return 'Email'
            }
            else if (claim.claimType === 'user_signature') {
                  return 'Signature'
            }
            else if (claim.claimType === 'ens_claim') {
                  return 'ENS Name'
            }
            else {
                  return 'Unknown'
            }
      }

      const getClaimIcon = () => {
            if (claim.claimType === 'identity_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <User size={ICON_SIZE} className={"text-orange-500"} />
                        </div>
                  )
            } else if (claim.claimType === 'domain_claim') {
                  return (
                        <div className="h-[34px] w-[34px] flex items-center justify-center">
                              <TbWorldWww size={ICON_SIZE} className='text-purple-500' />
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
                              <Phone size={ICON_SIZE} className='text-green-500' />
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
                              <Mail size={ICON_SIZE} className='text-blue-500' />
                        </div>
                  )
            }
            else if (claim.claimType === 'ens_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <FaEthereum size={ICON_SIZE} className='text-blue-500' />
                        </div>
                  )
            }
            else if (claim.claimType === 'user_signature') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-yellow-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <Signature size={ICON_SIZE} className='text-yellow-500' />
                        </div>
                  )
            }
            else {
                  return (
                        <div className="h-[34px] w-[34px] flex items-center justify-center">
                              <LucideCheckCircle size={ICON_SIZE} className='text-green-500' />
                        </div>
                  )
            }
      }

      const getRightSectionContent = () => {

            if (claim.claimType === "user_signature") {
                  return (
                        <div className="flex gap-2 items-center">
                              <div className="p-1 rounded-md w-[120px] relative">
                                    {
                                          signatureImage ? (
                                                typeof signatureImage === 'string' ? (
                                                      <img src={signatureImage} alt={signatureImage} />
                                                ) : (
                                                      <img
                                                            src={`data:image/png;base64,${btoa(String.fromCharCode(...signatureImage))}`}
                                                            alt={'signatureImage'}
                                                      />
                                                )
                                          ) : (
                                                <img src={`${window.location.origin}/images/placeholder-img.png`} alt={claim.claimName} />
                                          )
                                    }
                                    {
                                          claim.attestationsCount > 0 ? (
                                                <div className="absolute bottom-0 right-0 w-[34px] h-[34px]">
                                                      <div className="h-[34px] w-[34px] flex items-center justify-center">
                                                            <LucideCheckCircle size={ICON_SIZE} className='text-green-500' />
                                                      </div>
                                                </div>
                                          ) : null
                                    }
                              </div>
                        </div>
                  )
            }
            else if (claim.claimType === "domain_claim") {
                  if (!dnsVerificationResult) {
                        return (
                              <div className="flex gap-2 items-center">
                                    <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full" />
                                    <p className="text-xs font-medium text-gray-900">Loading</p>
                              </div>
                        )
                  }
                  const verificationBadge = getDNSStatusBadge(dnsVerificationResult?.dnsStatus!, dnsVerificationResult?.message!)
                  return (
                        <div className="flex gap-2 items-center" onClick={() => {
                              verifyDomainClaim(true)
                        }}>

                              {verificationBadge}
                        </div>
                  )
            }
            else if (claim.claimType === "ens_claim") {
                  const verificationBadge = getDNSStatusBadge("verified", "Verified")
                  return (
                        <div className="flex gap-2 items-center" >

                              {verificationBadge}
                        </div>
                  )
            }
            else {
                  if (claim.attestationsCount > 0) {
                        return (
                              <div className="flex gap-2 items-center flex-wrap">
                                    <CheckCircle size={ICON_SIZE - 2} className="text-green-500" />
                                    <p className="text-xs font-medium text-gray-900">Verified</p>
                              </div>
                        )
                  }
                  return (
                        <>
                              <X size={ICON_SIZE - 2} className="text-red-500" />
                              <p className="text-xs font-medium text-gray-900">Not Attested</p>
                        </>
                  )
            }
      }

      const verifyDomainClaim = async (triggerReload: boolean) => {
            try {

                  const aquaTree = claim.apiFileInfo.aquaTree!
                  const reorderedAquaTree = reorderAquaTreeRevisionsProperties(aquaTree)
                  const hashes = Object.keys(reorderedAquaTree.revisions)
                  const genesisHash = hashes[0]
                  const genesisRevision = reorderedAquaTree.revisions[genesisHash]
                  const result = await verifyDNS(backend_url, claim.claimName!, genesisRevision["forms_wallet_address"], triggerReload, genesisHash, genesisRevision['forms_unique_id'], genesisRevision['forms_claim_secret'])

                  setDnsVerificationResult(result)
            } catch (error) {
                  console.error(error)
            }

      }

      const loadImage = async () => {
            let signatureImage = await loadSignatureImage(claim.apiFileInfo.aquaTree!, claim.apiFileInfo.fileObject, session?.nonce!)
            setSignatureImage(signatureImage)
      }

      useEffect(() => {
            const timeoutId = setTimeout(() => {
                  if (claim.claimType === 'user_signature') {
                        loadImage()
                  } else if (claim.claimType === 'domain_claim') {
                        verifyDomainClaim(false)
                  }
            }, 0)

            return () => clearTimeout(timeoutId)
      }, [])

      return (
            <div className="flex gap-2 p-2 bg-gray-50 rounded-lg justify-between items-center">
                  <div className="flex gap-2 max-w-[60%]">
                        <div className="w-[34px] h-[34px] flex items-center justify-center text-gray-500 rounded-full bg-gray-100">{getClaimIcon()}</div>
                        <div className="flex flex-col gap-1">
                              <p className="text-xs">{getClaimTitle()}</p>
                              <p className="text-xs font-medium text-gray-900 break-all">{getTextContent()}</p>
                        </div>
                  </div>
                  <div className="flex gap-1">
                        {getRightSectionContent()}
                  </div>
            </div>
      )
}

export default ClaimCard
