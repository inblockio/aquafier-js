import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import appStore from '../../store'
import { useStore } from 'zustand'
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain'
import { getGenesisHash, isWorkFlowData, processSimpleWorkflowClaim, timeToHumanFriendly } from '@/utils/functions'
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
import { ChevronDown, Activity, Shield, FileText, Share2, CheckCircle2, LayoutDashboard } from 'lucide-react'
import WalletAddressProfile from './WalletAddressProfile'
import UserSignatureClaim from './UserSignatureClaim'
import { AddressView } from './AddressView'
import { AttestAquaClaim } from '@/components/aqua_chain_actions/attest_aqua_claim'
import { GlobalPagination } from '@/types'
import { API_ENDPOINTS, IDENTITY_CLAIMS } from '@/utils/constants'
import { useReloadWatcher } from '@/hooks/useReloadWatcher'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'


export default function ClaimsWorkflowPage() {
      const { session, backend_url } = useStore(appStore)

      const [claims, setClaims] = useState<Array<{ file: ApiFileInfo, processedInfo: ClaimInformation, attestations: Array<IAttestationEntry>, sharedContracts: Contract[] }>>([])
      const [isLoading, setIsLoading] = useState(true)
      const [, setIsProcessingClaims] = useState(true)

      const [currentPage, _setCurrentPage] = useState(1)
      const [_pagination, setPagination] = useState<GlobalPagination | null>(null)
      const [files, setFiles] = useState<Array<ApiFileInfo>>([])

      const { walletAddress } = useParams()
      const urlHash = useLocation().hash

      // Statistics for Dashboard
      const stats = useMemo(() => {
            const totalClaims = claims.length
            const verifiedClaims = claims.filter(c => c.attestations.length > 0).length
            const totalAttestations = claims.reduce((acc, curr) => acc + curr.attestations.length, 0)
            const sharedContractsCount = claims.reduce((acc, curr) => acc + (curr.sharedContracts?.length || 0), 0)
            const verificationScore = totalClaims > 0 ? Math.round((verifiedClaims / totalClaims) * 100) : 0
            
            return {
                  totalClaims,
                  verifiedClaims,
                  totalAttestations,
                  sharedContractsCount,
                  verificationScore
            }
      }, [claims])

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
            const aquaSystemNamesService = AquaSystemNamesService.getInstance();
            const systemNames = await aquaSystemNamesService.getSystemNames();
            return systemNames;
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
                              if (["simple_claim", "identity_claim", "dns_claim", "domain_claim", "phone_number_claim", "email_claim", "user_signature"].includes(processedClaimInfo.claimInformation.forms_type)) {
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
            const genesisRevisionHash = getGenesisHash(claim.file.aquaTree!) || ''

            let ClaimComponent;
            if (claimInfo.forms_type === 'dns_claim') {
                  ClaimComponent = <DNSClaim claimInfo={claimInfo} apiFileInfo={claim.file} nonce={session!.nonce} sessionAddress={session!.address} />
            } else if (claimInfo.forms_type === 'user_signature') {
                  ClaimComponent = <UserSignatureClaim claim={claim} />
            } else {
                  ClaimComponent = <SimpleClaim claimInfo={claimInfo} />
            }

            const isSelected = urlHash?.replace("#", "") === genesisRevisionHash;

            return (
                  <Card key={`${genesisRevisionHash}`} id={`${genesisRevisionHash}`} className={`mb-4 transition-all duration-200 border-l-4 ${isSelected ? 'border-l-blue-500 shadow-md' : 'border-l-transparent hover:border-l-gray-300'}`}>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                              <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                          <Badge variant="outline" className="capitalize bg-slate-50">
                                                {claimInfo.forms_type.replace('_', ' ')}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">{timeToHumanFriendly(claim.file.aquaTree?.revisions[genesisRevisionHash]?.local_timestamp || '', true)}</span>
                                    </div>
                                    <CardTitle className="text-lg font-medium">
                                          {claimInfo.forms_name || claimInfo.forms_domain || "Untitled Claim"}
                                    </CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                    {claim.attestations.length > 0 ? (
                                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                                                <CheckCircle2 size={12} /> Verified
                                          </Badge>
                                    ) : (
                                          <Badge variant="secondary" className="gap-1 text-gray-500">
                                                Unverified
                                          </Badge>
                                    )}
                                    {claim.processedInfo?.walletAddress?.trim().toLowerCase() === session?.address?.trim().toLowerCase() && (
                                           <div className="scale-75 origin-right">
                                                <ShareButton item={claim.file} nonce={session!.nonce} />
                                           </div>
                                    )}
                              </div>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-12 gap-6">
                              <div className="md:col-span-7 space-y-4">
                                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                                        {ClaimComponent}
                                    </div>
                                    
                                    <Collapsible>
                                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                                                <Share2 size={14} />
                                                <span>Shared with {claim.sharedContracts?.length || 0} entities</span>
                                                <ChevronDown size={14} />
                                          </CollapsibleTrigger>
                                          <CollapsibleContent className="pt-4 space-y-2">
                                                {claim.sharedContracts?.map((contract, index) => (
                                                      <SharedContract
                                                            type='outgoing'
                                                            key={`${contract.hash}`}
                                                            contract={contract}
                                                            index={index}
                                                            contractDeleted={hash => {
                                                                  let newState = claim.sharedContracts?.filter(e => e.hash != hash)
                                                                  claim.sharedContracts = newState
                                                                  // Force re-render if needed or update local state
                                                                  setClaims(prev => prev.map(c => c === claim ? {...c, sharedContracts: newState} : c))
                                                            }}
                                                      />
                                                ))}
                                                {claim.sharedContracts?.length === 0 && (
                                                      <p className="text-xs text-muted-foreground italic pl-6">Not shared with anyone yet.</p>
                                                )}
                                          </CollapsibleContent>
                                    </Collapsible>
                              </div>

                              <div className="md:col-span-5 border-l pl-0 md:pl-6 border-dashed">
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                          <Shield size={14} className="text-blue-500" /> 
                                          Attestations
                                    </h4>
                                    
                                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                          {claim.attestations.length > 0 ? (
                                                claim.attestations.map((attestation, index) => (
                                                      <div key={`att-${index}`} className="text-sm bg-slate-50 p-3 rounded-md border border-slate-100">
                                                           <AttestationEntry
                                                                  key={`attestation-${index}_${genesisRevisionHash}`}
                                                                  walletAddress={attestation.walletAddress}
                                                                  context={attestation.context}
                                                                  createdAt={timeToHumanFriendly(attestation.createdAt, true) ?? ''}
                                                                  nonce={session!.nonce}
                                                                  file={attestation.file}
                                                            />
                                                      </div>
                                                ))
                                          ) : (
                                                <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-dashed">
                                                      <p className="text-xs text-muted-foreground mb-3">No attestations yet.</p>
                                                      {claim.processedInfo?.walletAddress?.trim().toLowerCase() !== session?.address?.trim().toLowerCase() && (
                                                            <AttestAquaClaim file={claim.file!!} index={1} />
                                                      )}
                                                </div>
                                          )}
                                    </div>
                              </div>
                        </CardContent>
                  </Card>
            )
      }

      async function loadClaimsFileData() {
            setFiles([])
            setClaims([])
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
            }
      }

      useReloadWatcher({
            key: RELOAD_KEYS.user_profile,
            onReload: () => {
                  loadClaimsFileData()
            }
      })

      useEffect(() => {
            loadClaimsFileData()
      }, [walletAddress]);

      return (
            <div className='min-h-screen bg-slate-50/30 pb-12'>
                  <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                        
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                                          <LayoutDashboard className="h-8 w-8 text-blue-600" />
                                          Identity Dashboard
                                    </h1>
                                    <p className="text-muted-foreground mt-1">Manage and verify identity claims for this account.</p>
                              </div>
                              <AddressView
                                    address={`${walletAddress}`}
                                    className="w-auto"
                              />
                        </div>

                        <Separator />

                        {isLoading ? (
                              <div className="h-[60vh] flex flex-col items-center justify-center">
                                    <ClipLoader color="#2563EB" loading={isLoading} size={50} />
                                    <p className="text-sm text-muted-foreground mt-4">Loading identity profile...</p>
                              </div>
                        ) : (
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    
                                    {/* Left Sidebar - Profile Card */}
                                    <div className="lg:col-span-3 space-y-6">
                                          <Card className="border-t-4 border-t-blue-500 shadow-md">
                                                <CardHeader>
                                                      <CardTitle>Profile Overview</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                      <WalletAddressProfile walletAddress={walletAddress} hideOpenProfileButton={true} files={files} noBg={true} />
                                                </CardContent>
                                          </Card>

                                          {/* Trust Score Card (Visual only for now) */}
                                          <Card>
                                                <CardHeader className="pb-2">
                                                      <CardTitle className="text-sm font-medium text-muted-foreground">Identity Strength</CardTitle>
                                                      <div className="text-2xl font-bold">{stats.verificationScore}%</div>
                                                </CardHeader>
                                                <CardContent>
                                                      <Progress value={stats.verificationScore} className="h-2" />
                                                      <p className="text-xs text-muted-foreground mt-2">
                                                            Based on verified claims ratio.
                                                      </p>
                                                </CardContent>
                                          </Card>
                                    </div>

                                    {/* Main Content Area */}
                                    <div className="lg:col-span-9 space-y-6">
                                          
                                          {/* Stats Row */}
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <Card>
                                                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                      </CardHeader>
                                                      <CardContent>
                                                            <div className="text-2xl font-bold">{stats.totalClaims}</div>
                                                      </CardContent>
                                                </Card>
                                                <Card>
                                                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                            <CardTitle className="text-sm font-medium">Verified</CardTitle>
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                      </CardHeader>
                                                      <CardContent>
                                                            <div className="text-2xl font-bold">{stats.verifiedClaims}</div>
                                                      </CardContent>
                                                </Card>
                                                <Card>
                                                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                            <CardTitle className="text-sm font-medium">Attestations</CardTitle>
                                                            <Shield className="h-4 w-4 text-blue-500" />
                                                      </CardHeader>
                                                      <CardContent>
                                                            <div className="text-2xl font-bold">{stats.totalAttestations}</div>
                                                      </CardContent>
                                                </Card>
                                                <Card>
                                                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                            <CardTitle className="text-sm font-medium">Shared</CardTitle>
                                                            <Share2 className="h-4 w-4 text-purple-500" />
                                                      </CardHeader>
                                                      <CardContent>
                                                            <div className="text-2xl font-bold">{stats.sharedContractsCount}</div>
                                                      </CardContent>
                                                </Card>
                                          </div>

                                          {/* Tabs for Claims */}
                                          <Tabs defaultValue="all" className="w-full">
                                                <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                                                      <TabsTrigger value="all">All Claims</TabsTrigger>
                                                      <TabsTrigger value="identity">Identity</TabsTrigger>
                                                      <TabsTrigger value="documents">Documents</TabsTrigger>
                                                </TabsList>
                                                
                                                <TabsContent value="all" className="mt-6 space-y-4">
                                                      {claims.length === 0 ? (
                                                             <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-lg border border-dashed">
                                                                  <div className="bg-blue-50 p-4 rounded-full mb-4">
                                                                        <Activity className="h-8 w-8 text-blue-500" />
                                                                  </div>
                                                                  <h3 className="text-lg font-semibold text-gray-900">No Claims Found</h3>
                                                                  <p className="text-gray-500 max-w-sm mt-2">There are no claims associated with this identity profile yet.</p>
                                                            </div>
                                                      ) : (
                                                            claims.map((claim) => renderClaim(claim))
                                                      )}
                                                </TabsContent>
                                                
                                                <TabsContent value="identity" className="mt-6 space-y-4">
                                                      {claims.filter(item => ["simple_claim", "identity_claim", "user_signature", "phone_number_claim", "email_claim"].includes(item.processedInfo.claimInformation.forms_type)).length === 0 ? (
                                                            <div className="p-8 text-center text-muted-foreground bg-white rounded-lg border border-dashed">No identity claims found.</div>
                                                      ) : (
                                                            claims.filter(item => ["simple_claim", "identity_claim", "user_signature", "phone_number_claim", "email_claim"].includes(item.processedInfo.claimInformation.forms_type)).map((claim) => renderClaim(claim))
                                                      )}
                                                </TabsContent>
                                                
                                                <TabsContent value="documents" className="mt-6 space-y-4">
                                                      {claims.filter(item => !["simple_claim", "identity_claim", "user_signature", "phone_number_claim", "email_claim"].includes(item.processedInfo.claimInformation.forms_type)).length === 0 ? (
                                                            <div className="p-8 text-center text-muted-foreground bg-white rounded-lg border border-dashed">No document claims found.</div>
                                                      ) : (
                                                            claims.filter(item => !["simple_claim", "identity_claim", "user_signature", "phone_number_claim", "email_claim"].includes(item.processedInfo.claimInformation.forms_type)).map((claim) => renderClaim(claim))
                                                      )}
                                                </TabsContent>
                                          </Tabs>
                                    </div>
                              </div>
                        )}
                  </div>
            </div>
      )
}
