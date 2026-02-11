import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Download, Eye, FileText, MoreHorizontal, Send, Trash2 } from 'lucide-react'
import appStore from '@/store'
import { useStore } from 'zustand'
import {
      displayTime,
      ensureDomainUrlHasSSL,
      getAquaTreeFileName,
      getAquaTreeFileObject,
      getGenesisHash
} from '@/utils/functions'
import { FileObject } from 'aqua-js-sdk'
import { DownloadAquaChain } from '../components/aqua_chain_actions/download_aqua_chain'
import { DeleteAquaChain } from '../components/aqua_chain_actions/delete_aqua_chain'
import { Contract, IWorkflowItem } from '@/types/types'
import apiClient from '@/api/axiosInstance'
import { OpenClaimsWorkFlowButton } from '@/components/aqua_chain_actions/open_identity_claim_workflow'
import { useNavigate } from 'react-router-dom'
import { ApiFileInfo } from '@/models/FileInfo'
import ClaimTypesDropdownButton from '@/components/button_claim_dropdown'
import { toast } from 'sonner'
import { GlobalPagination } from '@/types'
import { API_ENDPOINTS, IDENTITY_CLAIMS } from '@/utils/constants'
import CustomPagination from '@/components/common/CustomPagination'
import { useReloadWatcher } from '@/hooks/useReloadWatcher'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'
import { LuShare2 } from 'react-icons/lu'
import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain'


const WorkflowTableItem = ({ workflowName, apiFileInfo, index = 0 }: IWorkflowItem) => {
      const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined)
      const navigate = useNavigate()

      const { session, backend_url, files } = useStore(appStore)

      const [claimName, setClaimName] = useState<string>('')
      const [attestorsCount, setAttestorsCount] = useState<number>(0)
      const [sharedContracts, setSharedContracts] = useState<Contract[] | null>(null)

      const getCurrentFileObject = () => {
            const fileObject = getAquaTreeFileObject(apiFileInfo)
            setCurrentFileObject(fileObject)
      }

      const getTimeInfo = () => {
            const genRevision = getGenesisHash(apiFileInfo.aquaTree!)
            if (genRevision) {
                  const timestamp = apiFileInfo.aquaTree?.revisions?.[genRevision]?.local_timestamp
                  if (timestamp) {
                        return displayTime(timestamp)
                  }
            } else {
                  return 'Not available'
            }
      }

      // const signers = getSigners()
      // const signersStatus = getSignersStatus()

      const loadSharedContractsData = async (_latestRevisionHash: string, _genesisHash: string) => {
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/contracts`)
                  const response = await apiClient.get(url, {
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
                        setSharedContracts(response.data?.contracts)
                  }
            } catch (error) {
                  console.error(error)
            }
      }

      useEffect(() => {
            getCurrentFileObject()
            let allHahshes = Object.keys(apiFileInfo.aquaTree?.revisions || {})
            const latestRevisionHash = allHahshes[allHahshes.length - 1]
            const genesisHash = allHahshes[0]

                  ; (async () => {
                        await loadSharedContractsData(latestRevisionHash, genesisHash)
                  })()

            let claimGenHash = getGenesisHash(apiFileInfo.aquaTree!)
            if (!claimGenHash) {
                  return
            }

            // claims name
            let allHashes = Object.keys(apiFileInfo.aquaTree?.revisions || {})
            const firstRevsion = apiFileInfo.aquaTree?.revisions[allHashes[0]]
            if (firstRevsion) {
                  let formName = firstRevsion[`forms_name`] || firstRevsion[`forms_email`]
                  if (formName) {
                        setClaimName(formName)
                  }
            }

            let attestationsCount = 0
            for (const file of files.fileData) {
                  let allHashes = Object.keys(file.aquaTree?.revisions || {})
                  if (allHashes.length >= 2) {
                        if (allHashes[0] === claimGenHash) {
                              continue
                        }
                        const firstRevsion = file.aquaTree?.revisions[allHashes[0]]
                        if (!firstRevsion) {
                              continue
                        }

                        const secondRevsion = file.aquaTree?.revisions[allHashes[1]]
                        if (secondRevsion && secondRevsion.revision_type === 'link') {
                              const linkVerificationHash = secondRevsion.link_verification_hashes![0]
                              if (!linkVerificationHash) {
                                    continue
                              }
                              let fileIndexName = file.aquaTree?.file_index[linkVerificationHash]
                              if (fileIndexName && fileIndexName == `identity_attestation.json`) {
                                    let claimId = firstRevsion[`forms_identity_claim_id`]
                                    if (claimId.trim() === claimGenHash.trim()) {
                                          attestationsCount += 1
                                    }
                              }
                        }
                  }
            }
            setAttestorsCount(attestationsCount)
      }, [apiFileInfo])

      const openClaimsInforPage = (item: ApiFileInfo) => {
            // setSelectedFileInfo(item)
            // navigate('/app/claims/workflow')
            if (item) {
                  const genesisHash = getGenesisHash(item.aquaTree!)

                  if (genesisHash) {
                        const genesisRevision = item.aquaTree?.revisions[genesisHash!]
                        let walletAddress = genesisRevision?.forms_wallet_address
                        if (genesisHash) {
                              navigate(`/app/claims/workflow/${walletAddress}#${genesisHash}`)
                        }
                  }
            }
      }
      return (
            <TableRow key={`${workflowName}-${index}`} className="hover:bg-muted/50">
                  <TableCell
                        onClick={() => {
                              openClaimsInforPage(apiFileInfo!!)
                        }}
                        className="font-medium w-[300px] max-w-[300px] min-w-[300px]"
                  >
                        <div className="w-full flex items-center gap-3">
                              <div className="shrink-0">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                          <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                              </div>
                              <div className="flex-grow min-w-0">
                                    <div className="font-medium text-sm break-words whitespace-normal">File Name : {currentFileObject?.fileName}</div>
                                    <div className="font-medium text-sm break-words whitespace-normal">Claim Name : {claimName}</div>
                                    <div className="text-xs text-muted-foreground">Created at {getTimeInfo()}</div>
                              </div>
                        </div>
                  </TableCell>

                  <TableCell
                        onClick={() => {
                              openClaimsInforPage(apiFileInfo!!)
                        }}
                        className="w-[200px]"
                  >
                        {attestorsCount}
                  </TableCell>
                  <TableCell
                        onClick={() => {
                              openClaimsInforPage(apiFileInfo!!)
                        }}
                        className="w-[150px]"
                  >
                        {sharedContracts?.length}
                  </TableCell>

                  <TableCell className="text-right w-[100px]">
                        <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-8 w-8 p-0 cursor-pointer">
                                          <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <OpenClaimsWorkFlowButton item={apiFileInfo} nonce={session?.nonce ?? ''}>
                                          <DropdownMenuItem>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Claim
                                          </DropdownMenuItem>
                                    </OpenClaimsWorkFlowButton>
                                    {/* <DropdownMenuItem disabled>
                                          <Send className="mr-2 h-4 w-4" />
                                          Send Reminder
                                    </DropdownMenuItem> */}
                                    <ShareButton item={apiFileInfo} index={index}>
                                          <DropdownMenuItem className='cursor-pointer'>
                                                <LuShare2 className="mr-2 h-4 w-4" />
                                                Share
                                          </DropdownMenuItem>
                                    </ShareButton>
                                    <DownloadAquaChain file={apiFileInfo} index={index}>
                                          <DropdownMenuItem>
                                                <Download className="mr-2 h-4 w-4" />
                                                Download
                                          </DropdownMenuItem>
                                    </DownloadAquaChain>
                                    <DropdownMenuSeparator />
                                    <DeleteAquaChain apiFileInfo={apiFileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ''} revision="" index={index}>
                                          <DropdownMenuItem className="text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                          </DropdownMenuItem>
                                    </DeleteAquaChain>
                              </DropdownMenuContent>
                        </DropdownMenu>
                  </TableCell>
            </TableRow>
      )
}

const ClaimsAndAttestationPage = () => {
      const { session, backend_url } = useStore(appStore)

      // const [totalClaims, setTotalClaims] = useState<number>(0)
      // const [_totolAttestors, setTotolAttestors] = useState<number>(0)
      // const [myAttestions, setMyAttestionss] = useState<number>(0)
      const [isLoading, setIsLoading] = useState<boolean>(false)

      const [workflowsUi, setWorkflowsUi] = useState<IWorkflowItem[]>([])
      const [currentPage, setCurrentPage] = useState(1)
      const [pagination, setPagination] = useState<GlobalPagination | null>(null)

      const processFilesToWorkflowUi = (_files: ApiFileInfo[]) => {
            const newData: IWorkflowItem[] = []
            _files.forEach(file => {
                  const nameItem: string = getAquaTreeFileName(file.aquaTree!)
                  newData.push({ workflowName: nameItem, apiFileInfo: file })
            })
            setWorkflowsUi(newData)
      }

      async function loadWorkflowsData() {
            try {
                  setIsLoading(true)
                  const params = {
                        page: currentPage,
                        limit: 10,
                        claim_types: JSON.stringify(IDENTITY_CLAIMS),
                        wallet_address: session?.address
                  }
                  const filesDataQuery = await apiClient.get(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`), {
                        headers: {
                              'Content-Type': 'application/json',
                              'nonce': `${session!.nonce}`
                        },
                        params
                  })
                  const response = filesDataQuery.data
                  const aquaTrees = response.aquaTrees
                  setPagination(response.pagination)
                  processFilesToWorkflowUi(aquaTrees)

            } catch (error) {
                  console.error('Error fetching workflows:', error)
                  toast.error('Failed to load claims and attestations')
            } finally {
                  setIsLoading(false);
            }
      }

      // Watch for reload triggers
      useReloadWatcher({
            key: RELOAD_KEYS.claims_and_attestations,
            onReload: () => {
                  // console.log('Reloading claims and attestations...');
                  loadWorkflowsData();
            }
      });

      useEffect(() => {
            loadWorkflowsData()
      }, [currentPage])

      return (
            <>
                  <div className="space-y-6 mt-5">
                        <Card className="py-6">
                              <CardHeader>
                                    <CardTitle className="flex items-center gap-2 justify-between align-center">
                                          <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                      <FileText className="h-5 w-5" />
                                                      <span>AquaID - Claims & Attestation</span>
                                                </div>
                                                <label className="text-sm font-medium text-gray-900  text-left">
                                                      Your claims & attestations
                                                </label>
                                                <label className="text-sm font-medium text-gray-900  text-left">
                                                      {/* TODO: Fix the counts here */}
                                                      {/* Total claims you have attested {0} */}
                                                </label>
                                                <label className="text-sm font-medium text-gray-900 mb-4 text-left">
                                                      {/* TODO: Fix the counts here */}
                                                      {/* Total claims imported {0 - workflowsUi.length}. Claims created by you {workflowsUi.length} */}
                                                </label>
                                          </div>

                                          <div className='ml-auto flex items-center gap-2'>
                                                <ClaimTypesDropdownButton />
                                                <div className='ml-4'></div>
                                          </div>
                                    </CardTitle>
                              </CardHeader>
                              <CardContent className="px-1">
                                    {/* <div className="rounded-md border"> */}
                                    <div className="overflow-x-auto md:h-[calc(100vh-300px)] overflow-y-auto">
                                          <Table>
                                                <TableHeader>
                                                      <TableRow>
                                                            <TableHead className="w-[300px] max-w-[300px] min-w-[300px] break-words overflow-hidden">Claim</TableHead>
                                                            {/* <TableHead>Workflow Type</TableHead> */}
                                                            <TableHead>Attestors</TableHead>
                                                            <TableHead>Share Contracts created</TableHead>
                                                            {/* <TableHead>Status</TableHead> */}
                                                            <TableHead className="text-right">Actions</TableHead>
                                                      </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                      {isLoading ? (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-[400px] text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                                                              <span>Loading Identity claims...</span>
                                                                        </div>
                                                                  </TableCell>
                                                            </TableRow>
                                                      ) : workflowsUi.length === 0 ? (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-[400px] text-center">
                                                                        No claims found
                                                                  </TableCell>
                                                            </TableRow>
                                                      ) : (
                                                            workflowsUi.map((workflow, index: number) => (
                                                                  <WorkflowTableItem key={`${index}-workflow`} workflowName={workflow.workflowName} apiFileInfo={workflow.apiFileInfo} index={index} />
                                                            ))
                                                      )}
                                                </TableBody>
                                          </Table>
                                    </div>
                                    <CustomPagination
                                          currentPage={currentPage}
                                          totalPages={pagination?.totalPages ?? 1}
                                          onPageChange={setCurrentPage}
                                    />
                              </CardContent>
                        </Card>
                  </div>
            </>
      )
}

export default ClaimsAndAttestationPage
