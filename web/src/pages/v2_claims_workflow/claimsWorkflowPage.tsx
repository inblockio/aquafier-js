import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import appStore from '../../store'
import { useStore } from 'zustand'
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain'
import { cleanEthAddress, getGenesisHash, isWorkFlowData, processSimpleWorkflowClaim, timeToHumanFriendly } from '@/utils/functions'
import { ClipLoader } from 'react-spinners'
import { ApiFileInfo, ClaimInformation, IAttestationEntry } from '@/models/FileInfo'
import axios from 'axios'
import { Contract, ICompleteClaimInformation } from '@/types/types'
import { SharedContract } from '../files_share/files_shared_contracts_item'
import AttestationEntry from './AttestationEntry'
import { OrderRevisionInAquaTree } from 'aqua-js-sdk'
import SimpleClaim from './SimpleClaim'
import DNSClaim from './DNSClaim'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import WalletAddressProfile from './WalletAddressProfile'
import UserSignatureClaim from './UserSignatureClaim'
import { AddressView } from './AddressView'
import { AttestAquaClaim } from '@/components/aqua_chain_actions/attest_aqua_claim'
import { GlobalPagination } from '@/types'
import { API_ENDPOINTS, IDENTITY_CLAIMS } from '@/utils/constants'


export default function ClaimsWorkflowPage() {
      const { session, backend_url } = useStore(appStore)

      const [claims, setClaims] = useState<Array<{ file: ApiFileInfo, processedInfo: ClaimInformation, attestations: Array<IAttestationEntry>, sharedContracts: Contract[] }>>([])
      const [isLoading, setIsLoading] = useState(true)
      const [isProcessingClaims, setIsProcessingClaims] = useState(true)

      const [currentPage, _setCurrentPage] = useState(1)
      const [_pagination, setPagination] = useState<GlobalPagination | null>(null)
      const [files, setFiles] = useState<Array<ApiFileInfo>>([])

      const { walletAddress } = useParams()
      const urlHash = useLocation().hash

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

      const loadSystemAquaFileNames = async () => {
            if (!session?.nonce) return []
            try {
                  const response = await axios.get(`${backend_url}/${API_ENDPOINTS.SYSTEM_AQUA_FILES_NAMES}`, {
                        headers: {
                              'nonce': session.nonce,
                              'metamask_address': session.address
                        }
                  })
                  // setSystemAquaFileNames(response.data.data)
                  return response.data.data
            } catch (error) {
                  console.log("Error getting system aqua file names", error)
                  return []
            }
      }


      const getAllAttestations = (files: ApiFileInfo[], aquaSystemFileNames: string[]) => {
            const _attestations: Array<ApiFileInfo> = []
            for (let i = 0; i < files?.length; i++) {
                  const file: ApiFileInfo = files[i]
                  // const fileObject = getAquaTreeFileObject(file)

                  const { isWorkFlow, workFlow } = isWorkFlowData(file.aquaTree!, aquaSystemFileNames)
                  if (isWorkFlow && workFlow === 'identity_attestation') {
                        _attestations.push(file)
                  }
            }
            return _attestations
      }

      const processAllAddressClaims = async (files: ApiFileInfo[]) => {
            setIsProcessingClaims(true)
            if (!walletAddress) {
                  toast.info('Please select a wallet address')
                  setIsProcessingClaims(false)
                  return
            }
            const claimTemplateNames = ["simple_claim", "identity_claim", "dns_claim", "domain_claim", "phone_number_claim", "email_claim", "user_signature"]

            const aquaSystemFileNames = await loadSystemAquaFileNames()

            const _attestations = getAllAttestations(files, aquaSystemFileNames)

            const _claims: Array<{ file: ApiFileInfo; processedInfo: ClaimInformation, attestations: Array<IAttestationEntry>, sharedContracts: Contract[] }> = []

            // We loop through files to find claims that match the wallet address
            for (let i = 0; i < files.length; i++) {
                  const file: ApiFileInfo = files[i]
                  // const fileObject = getAquaTreeFileObject(file)

                  const { isWorkFlow, workFlow } = isWorkFlowData(file.aquaTree!, aquaSystemFileNames)

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
            setIsProcessingClaims(false)
      }

      const renderClaim = (claim: ICompleteClaimInformation) => {
            const claimInfo = claim.processedInfo.claimInformation
            const genesisRevisionHash = getGenesisHash(claim.file.aquaTree!)

            if (claimInfo.forms_type === 'dns_claim') {
                  return (
                        <DNSClaim claimInfo={claimInfo} apiFileInfo={claim.file} nonce={session!.nonce} sessionAddress={session!.address} />
                  )
            }
            // else if (claimInfo.forms_type === 'phone_number_claim') {
            //       return (
            //             <PhoneNumberClaim claim={claim} />
            //       )
            // }
            // else if (claimInfo.forms_type === 'email_claim') {
            //       return (
            //             <EmailClaim claim={claim} />
            //       )
            // }
            else if (claimInfo.forms_type === 'user_signature') {
                  return (
                        <UserSignatureClaim claim={claim} />
                  )
            }
            else {
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
                                                      <div className="flex flex-col gap-0 max-h-[300px] overflow-y-auto">
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
                                                            <AttestAquaClaim file={claim.file!!} index={1} />
                                                      )}
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </div>
                  )
            }
      }

      async function loadClaimsFileData() {
            setFiles([])
            setClaims([])
            let isGood = cleanEthAddress(walletAddress)
            if (!isGood) {
                  toast.warning("Invalid wallet address", {
                        position: "top-center"
                  })
                  return
            }
            setIsLoading(true);
            try {
                  const params = {
                        page: currentPage,
                        limit: 100,
                        claim_types: JSON.stringify(IDENTITY_CLAIMS),
                        wallet_address: walletAddress,
                        use_wallet: session?.address,
                  }
                  const filesDataQuery = await axios.get(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`, {
                        headers: {
                              'Content-Type': 'application/json',
                              'nonce': `${session!.nonce}`
                        },
                        params
                  })
                  const response = filesDataQuery.data
                  const aquaTrees = response.aquaTrees
                  setPagination(response.pagination)
                  setFiles(aquaTrees)

                  // Process claims after setting files
                  await processAllAddressClaims(aquaTrees)
            } catch (error) {
                  console.error('Error loading claims:', error);
                  toast.error('Failed to load claims');
                  setIsProcessingClaims(false)
            } finally {
                  setIsLoading(false);
                  // setIsProcessingClaims(false)
            }
      }

      // const watchFilesChange = useMemo(() => {
      //       if (!files?.length) return '0';

      //       let totalRevisions = 0;
      //       let aquaTreeHashes: string[] = [];

      //       for (const file of files) {
      //             if (file.aquaTree?.revisions) {
      //                   const revisionCount = Object.keys(file.aquaTree.revisions).length;
      //                   totalRevisions += revisionCount;

      //                   // Create a stable identifier for this aquaTree based on its revisions
      //                   const revisionKeys = Object.keys(file.aquaTree.revisions).sort();
      //                   const aquaTreeHash = `${revisionCount}-${revisionKeys.join(',')}`;
      //                   aquaTreeHashes.push(aquaTreeHash);
      //             }
      //       }
      //       // Create a stable watch value based on total revisions and aquaTree structure
      //       return `${totalRevisions}-${aquaTreeHashes.sort().join('|')}`;
      // }, [files]);


      useEffect(() => {
            loadClaimsFileData()
      }, [walletAddress]);

      return (
            <div className='py-6 flex flex-col gap-4'>

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

                  {(isLoading) ? (
                        <>
                              <div className="py-6 flex flex-col items-center justify-center h-full w-full">
                                    <ClipLoader color="#000" loading={isLoading} size={50} />
                                    <p className="text-sm">Loading...</p>
                              </div>
                        </>
                  ) : null}

                  {
                        (claims.length === 0 && !isLoading && !isProcessingClaims) ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mx-auto max-w-md">
                                    <div className="flex items-center justify-center flex-col gap-3">
                                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                          </div>
                                          <div className="text-center">
                                                <h3 className="text-lg font-semibold text-blue-900 mb-1">No Claims Found</h3>
                                                <p className="text-sm text-blue-700">This wallet address doesn't have any verified claims yet.</p>
                                          </div>
                                    </div>
                              </div>
                        ) : null
                  }

                  {
                        (!isLoading && !isProcessingClaims && claims.length > 0) ? (
                              <div className="container mx-auto py-4 bg-white rounded-lg">
                                    <WalletAddressProfile walletAddress={walletAddress} hideOpenProfileButton={true} files={files} />
                              </div>
                        ) : null
                  }

                  <div className="flex flex-col gap-4">
                        {
                              claims.filter(item => ["simple_claim", "identity_claim"].includes(item.processedInfo.claimInformation.forms_type)).map((claim, index) => (
                                    <div key={`claim_${index}`} className="container mx-auto py-4 px-1 md:px-4 bg-gray-50 rounded-lg border-[2px] border-gray-400">
                                          {renderClaim(claim)}
                                          <Collapsible className=' bg-gray-50 p-2 rounded-lg'>
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
                                                                                    type='outgoing'
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
                                    <div key={`claim_${index}`} className="container mx-auto py-4 px-1 md:px-4 bg-gray-50 rounded-lg border-[2px] border-gray-400">
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
                                                                                    type='outgoing'
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
