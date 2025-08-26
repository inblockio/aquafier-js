import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import appStore from '../../store'
import { useStore } from 'zustand'
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain'
import { getAquaTreeFileName, isWorkFlowData, processSimpleWorkflowClaim, timeToHumanFriendly } from '@/utils/functions'
import { ClipLoader } from 'react-spinners'
import { ApiFileInfo, ClaimInformation, IAttestationEntry } from '@/models/FileInfo'
import axios from 'axios'
import { Contract, ICompleteClaimInformation } from '@/types/types'
import { SharedContract } from '../files_shared_contracts'
import AttestationEntry from './AttestationEntry'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import SimpleClaim from './SimpleClaim'
import DNSClaim from './DNSClaim'
import { toast } from 'sonner'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import WalletAddressProfile from './WalletAddressProfile'
import PhoneNumberClaim from './PhoneNumberClaim'
import EmailClaim from './EmailClaim'
import UserSignatureClaim from './UserSignatureClaim'
import { AddressView } from './AddressView'


export default function ClaimsWorkflowPage() {
      const { session, backend_url, systemFileInfo, files } = useStore(appStore)

      const [claims, setClaims] = useState<Array<{ file: ApiFileInfo, processedInfo: ClaimInformation, attestations: Array<IAttestationEntry>, sharedContracts: Contract[] }>>([])
      const [isLoading, setIsLoading] = useState(false)

      const { walletAddress } = useParams()

      const loadSharedContractsData = async (_latestRevisionHash: string) => {
            try {
                  const url = `${backend_url}/contracts`
                  const response = await axios.get(url, {
                        params: {
                              sender: session?.address,
                              // genesis_hash: genesisHash,
                              latest: _latestRevisionHash,
                        },
                        headers: {
                              nonce: session?.nonce,
                        },
                  })
                  if (response.status === 200) {
                        // setSharedContracts(response.data?.contracts)
                        return response.data?.contracts
                  }
            } catch (error) {
                  console.error(error)
                  return []
            }
      }

      const loadAttestationData = async (_latestRevisionHash: string, _attestations: Array<ApiFileInfo>) => {

            try {
                  const processedAttestations: Array<IAttestationEntry> = []

                  for (let i = 0; i < _attestations.length; i++) {
                        const file: ApiFileInfo = _attestations[i]
                        const orderedAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
                        const revisionHashes = Object.keys(orderedAquaTree.revisions)
                        const firstRevisionHash = revisionHashes[0]
                        const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                        const identityClaimId = firstRevision.forms_identity_claim_id
                        if (identityClaimId === _latestRevisionHash) {
                              const attestationEntry: IAttestationEntry = {
                                    walletAddress: firstRevision.forms_wallet_address,
                                    context: firstRevision.forms_context,
                                    createdAt: firstRevision.local_timestamp,
                                    file: file,
                                    nonce: session!.nonce,
                              }
                              processedAttestations.push(attestationEntry)
                        }
                  }
                  return processedAttestations
            } catch (error) {
                  console.error('Error loading attestations:', error)
                  return []
            }
      }

      const getAllAttestations = () => {
            const aquaTemplates = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        // console.log('Error processing system file')
                        return ''
                  }
            })
            const _attestations: Array<ApiFileInfo> = []
            for (let i = 0; i < files.length; i++) {
                  const file: ApiFileInfo = files[i]
                  // const fileObject = getAquaTreeFileObject(file)

                  const { isWorkFlow, workFlow } = isWorkFlowData(file.aquaTree!, aquaTemplates)
                  if (isWorkFlow && workFlow === 'identity_attestation') {
                        _attestations.push(file)
                  }
            }
            // setAttestations(_attestations)
            return _attestations
      }

      const processAllAddressClaims = async () => {
            setIsLoading(true)
            if (!walletAddress) {
                  toast.info('Please select a wallet address')
                  console.log('Please select a wallet address')
                  setIsLoading(false)
                  return
            }
            setIsLoading(true)
            const claimTemplateNames = ["simple_claim", "identity_claim", "dns_claim", "domain_claim", "phone_number_claim", "email_claim", "user_signature"]

            const aquaTemplates = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        // console.log('Error processing system file')
                        return ''
                  }
            })

            const _attestations = getAllAttestations()

            const _claims: Array<{ file: ApiFileInfo; processedInfo: ClaimInformation, attestations: Array<IAttestationEntry>, sharedContracts: Contract[] }> = []

            // We loop through files to find claims that match the wallet address
            for (let i = 0; i < files.length; i++) {
                  const file: ApiFileInfo = files[i]
                  // const fileObject = getAquaTreeFileObject(file)

                  const { isWorkFlow, workFlow } = isWorkFlowData(file.aquaTree!, aquaTemplates)

                  if (isWorkFlow && claimTemplateNames.includes(workFlow)) {
                        const orderedAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
                        const revisionHashes = Object.keys(orderedAquaTree.revisions)
                        const firstRevisionHash = revisionHashes[0]
                        const lastRevisionHash = revisionHashes[revisionHashes.length - 1]
                        const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                        const _walletAddress = firstRevision.forms_wallet_address
                        if (_walletAddress === walletAddress) {
                              const processedClaimInfo = processSimpleWorkflowClaim(file)
                              let processedAttestations: Array<IAttestationEntry> = []
                              if (["simple_claim", "identity_claim", "dns_claim", "domain_claim", "phone_number_claim", "email_claim"].includes(processedClaimInfo.claimInformation.forms_type)) {
                                    processedAttestations = await loadAttestationData(processedClaimInfo.genesisHash!, _attestations)
                              }
                              const sharedContracts = await loadSharedContractsData(lastRevisionHash)
                              _claims.push({ file: file, processedInfo: processedClaimInfo, attestations: processedAttestations, sharedContracts: sharedContracts })
                        }
                  }
            }

            setClaims(_claims)
            setIsLoading(false)
      }

      const renderClaim = (claim: ICompleteClaimInformation) => {
            const claimInfo = claim.processedInfo.claimInformation

            if (claimInfo.forms_type === 'dns_claim') {
                  return (
                        <DNSClaim claimInfo={claimInfo} apiFileInfo={claim.file} nonce={session!.nonce} sessionAddress={session!.address} />
                  )
            }
            else if (claimInfo.forms_type === 'phone_number_claim') {
                  return (
                        <PhoneNumberClaim claim={claim} />
                  )
            }
            else if (claimInfo.forms_type === 'email_claim') {
                  return (
                        <EmailClaim claim={claim} />
                  )
            }
            else if (claimInfo.forms_type === 'user_signature') {
                  return (
                        <UserSignatureClaim claim={claim} />
                  )
            }
            else {
                  return (
                        <div className="grid lg:grid-cols-12 gap-4">
                              <div className='col-span-7 bg-gray-50 p-2'>
                                    <div className="flex flex-col gap-2">
                                          <SimpleClaim claimInfo={claimInfo} />
                                          {claim.processedInfo?.walletAddress?.trim().toLowerCase() === session?.address?.trim().toLowerCase() && (
                                                <ShareButton item={claim.file} nonce={session!.nonce} />
                                          )}
                                    </div>
                              </div>
                              <div className='col-span-5 p-2'>
                                    <div className="flex flex-col gap-2 h-full">
                                          {claim.attestations.length > 0 ? (
                                                <div className="flex flex-col gap-2">
                                                      <h3 className="text-lg font-bold text-center">Claim Attestations</h3>
                                                      <div className="flex flex-col gap-0 h-[300px] overflow-y-auto">
                                                            {claim.attestations.map((attestation, index) => (
                                                                  <AttestationEntry
                                                                        key={`attestation-${index}`}
                                                                        walletAddress={attestation.walletAddress}
                                                                        context={attestation.context}
                                                                        createdAt={timeToHumanFriendly(attestation.createdAt, true) ?? ''}
                                                                        nonce={session!.nonce}
                                                                        file={attestation.file}
                                                                  />
                                                            ))}
                                                      </div>
                                                </div>
                                          ) : (
                                                <div className="text-center py-8 flex flex-col gap-2 items-center justify-center h-full bg-gray-50">
                                                      <h3 className="text-lg font-bold text-center">Claim Attestations</h3>
                                                      <p className="text-gray-600">No attestations found for this claim.</p>
                                                      {claim.processedInfo?.walletAddress?.trim().toLowerCase() !== session?.address?.trim().toLowerCase() && (
                                                            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                                                                  Create Attestation
                                                            </button>
                                                      )}
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </div>
                  )
            }
      }

      useEffect(() => {
            processAllAddressClaims()
      }, [walletAddress, JSON.stringify(files)])

      return (
            <div className='py-6 flex flex-col gap-4'>

                  {/* <div className='flex items-center gap-2 flex-col text-center'>
                        <h2 className="text-2xl font-bold">Wallet Address Profile</h2>
                        <h3 className="text-lg">{walletAddress}</h3>
                  </div> */}

                  <div className="bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 rounded-lg">
                        <div className="max-w-2xl mx-auto">
                              <div className="text-center mb-8">
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Identity Profile</h1>
                                    <p className="text-gray-600">Manage your verified claims and digital identity</p>
                              </div>

                              <AddressView
                                    address={`${walletAddress}`}
                                    className="max-w-full"
                              />

                        </div>
                  </div>

                  {isLoading ? (
                        <div className="flex items-center justify-center flex-col align-center py-8">
                              <ClipLoader color={'blue'} loading={true} size={150} aria-label="Loading Spinner" data-testid="loader" />
                              <span className="text-center font-500 text-2xl">Processing claim...</span>
                        </div>
                  ) : null}

                  {
                        claims.length === 0 ? (
                              <div className="flex items-center justify-center flex-col align-center py-8">
                                    <span className="text-center font-500 text-2xl">No claims found</span>
                              </div>
                        ) : null
                  }

                  <div className="container mx-auto py-4 bg-white rounded-lg">
                        <WalletAddressProfile walletAddress={walletAddress} hideOpenProfileButton={true} />
                  </div>

                  <div className="flex flex-col gap-4">
                        {
                              claims.filter(item => ["simple_claim", "identity_claim"].includes(item.processedInfo.claimInformation.forms_type)).map((claim, index) => (
                                    <div key={`claim_${index}`} className="container mx-auto py-4 px-1 md:px-4 bg-gray-50 rounded-lg">
                                          {renderClaim(claim)}
                                          <Collapsible className='mt-4 bg-gray-50 p-2 rounded-lg'>
                                                <CollapsibleTrigger className='cursor-pointer w-full p-2 border-2 border-gray-200 rounded-lg flex justify-between items-center'>
                                                      <div className="flex flex-col text-start">
                                                            <p className='font-bold text-gray-700'>Sharing Information</p>
                                                            <p className='text-gray-600'>Who have you shared the claim with</p>
                                                      </div>
                                                      <div className='flex flex-col gap-0 h-fit'>
                                                            <ChevronDown />
                                                            <ChevronUp />
                                                      </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                      <div className="flex flex-col gap-2 p-2">
                                                            {
                                                                  claim.sharedContracts?.map((contract, index) => (
                                                                        <div key={`shared_contract_${index}`}>
                                                                              <SharedContract
                                                                                    key={`${contract.hash}`}
                                                                                    contract={contract}
                                                                                    index={index}
                                                                                    contractDeleted={hash => {
                                                                                          let newState = claim.sharedContracts?.filter(e => e.hash != hash)
                                                                                          claim.sharedContracts = newState
                                                                                    }}
                                                                              />
                                                                        </div>
                                                                  ))
                                                            }
                                                      </div>
                                                      {
                                                            claim.sharedContracts?.length === 0 ? (
                                                                  <div className="flex flex-col gap-2 p-4 text-center">
                                                                        <p>No shared contracts found</p>
                                                                  </div>
                                                            ) : null
                                                      }
                                                </CollapsibleContent>
                                          </Collapsible>
                                    </div>
                              ))
                        }
                        {
                              claims.filter(item => !["simple_claim", "identity_claim"].includes(item.processedInfo.claimInformation.forms_type)).map((claim, index) => (
                                    <div key={`claim_${index}`} className="container mx-auto py-4 px-1 md:px-4 bg-gray-50 rounded-lg">
                                          {renderClaim(claim)}
                                          <Collapsible className='mt-4 bg-gray-50 p-2 rounded-lg'>
                                                <CollapsibleTrigger className='cursor-pointer w-full p-2 border-2 border-gray-200 rounded-lg flex justify-between items-center'>
                                                      <div className="flex flex-col text-start">
                                                            <p className='font-bold text-gray-700'>Sharing Information</p>
                                                            <p className='text-gray-600'>Who have you shared the claim with</p>
                                                      </div>
                                                      <div className='flex flex-col gap-0 h-fit'>
                                                            <ChevronDown />
                                                            <ChevronUp />
                                                      </div>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                      <div className="flex flex-col gap-2 p-2">
                                                            {
                                                                  claim.sharedContracts?.map((contract, index) => (
                                                                        <div key={`shared_contract_${index}`}>
                                                                              <SharedContract
                                                                                    key={`${contract.hash}`}
                                                                                    contract={contract}
                                                                                    index={index}
                                                                                    contractDeleted={hash => {
                                                                                          let newState = claim.sharedContracts?.filter(e => e.hash != hash)
                                                                                          claim.sharedContracts = newState
                                                                                    }}
                                                                              />
                                                                        </div>
                                                                  ))
                                                            }
                                                      </div>
                                                      {
                                                            claim.sharedContracts?.length === 0 ? (
                                                                  <div className="flex flex-col gap-2 p-4 text-center">
                                                                        <p>No shared contracts found</p>
                                                                  </div>
                                                            ) : null
                                                      }
                                                </CollapsibleContent>
                                          </Collapsible>
                                    </div>
                              ))
                        }
                  </div>
            </div>
      )
}
