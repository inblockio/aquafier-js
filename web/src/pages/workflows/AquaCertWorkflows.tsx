import { useEffect, useState, useRef } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
      Download,
      Eye,
      FileText,
      MoreHorizontal,
      Plus,
      Trash2,
      Users
} from 'lucide-react'
import appStore from '@/store'
import { useStore } from 'zustand'
import {
      displayTime,
      ensureDomainUrlHasSSL,
      getAquaTreeFileName,
      getAquaTreeFileObject,
      getGenesisHash} from '@/utils/functions'
import { FileObject } from 'aqua-js-sdk'
import { DownloadAquaChain } from '../../components/aqua_chain_actions/download_aqua_chain'
import { DeleteAquaChain, DeleteAquaChainDialog } from '../../components/aqua_chain_actions/delete_aqua_chain'
import { IAquaCertWorkflowDrawer, ICertificateAttestor, IWorkflowItem } from '@/types/types'
import WalletAdrressClaim from '../v2_claims_workflow/WalletAdrressClaim'
import { ApiFileInfo } from '@/models/FileInfo'
import { toast } from 'sonner'
import axios from 'axios'
import { API_ENDPOINTS } from '@/utils/constants'
import { GlobalPagination } from '@/types'
import CustomPagination from '@/components/common/CustomPagination'
import { useParams } from 'react-router-dom'
import { useReloadWatcher } from '@/hooks/useReloadWatcher'
import { OpenSelectedFileDetailsButton } from '@/components/aqua_chain_actions/details_button'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'
import AquaCertWorkflowDrawer from './AquaCertWorkflowDrawer'

const CertificateTableItem = ({ workflowName, apiFileInfo, index = 0, openDrawer }: IWorkflowItem) => {
     
      const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined)
      // const [attestations, setAttestations] = useState<ApiFileInfo[]>([])
      const [attesters, setAttesters] = useState<ICertificateAttestor[]>([])
      const { session, backend_url } = useStore(appStore)
      const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
      const [isDeleting, setIsDeleting] = useState(false)
      const dropdownTriggerRef = useRef<HTMLButtonElement>(null)

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

      const getCertType = () => {
            const genRevision = getGenesisHash(apiFileInfo.aquaTree!)
            if (genRevision) {
                  const certType = apiFileInfo.aquaTree?.revisions?.[genRevision]?.forms_cert_type
                  const cleanedUpType = certType.split("_").join(" ")
                  return cleanedUpType
            } else {
                  return 'UNKNOWN'
            }
      }

      const getCreator = () => {
            const genRevision = getGenesisHash(apiFileInfo.aquaTree!)
            if (genRevision) {
                  const creator = apiFileInfo.aquaTree?.revisions?.[genRevision]?.forms_creator

                  return creator
            } else {
                  return null
            }
      }

      const loadCertAttestations = async () => {
            setIsDeleting(true)
            try {
                  // const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!)
                  // const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
                  const certGenRevisionHash = getGenesisHash(apiFileInfo.aquaTree!)
                  const params = {
                        page: 1,
                        limit: 200,
                        claim_types: JSON.stringify(["identity_attestation"]) //default to aqua_sign if no type provided
                  }
                  const filesDataQuery = await axios.get(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`), {
                        headers: {
                              'Content-Type': 'application/json',
                              'nonce': `${session!.nonce}`
                        },
                        params
                  })
                  const response = filesDataQuery.data
                  const apiFileInfos: ApiFileInfo[] = response.aquaTrees

                  // We track attestors wallet addresses
                  let foundAttestors: ICertificateAttestor[] = []

                  // setAttestations(apiFileInfos)
                  // Get attesters
                  for (let i = 0; i < apiFileInfos.length; i++) {
                        const apiFileInfo = apiFileInfos[i];
                        const aquaTree = apiFileInfo.aquaTree
                        const genesisHash = getGenesisHash(aquaTree!)
                        const genesisRevision = aquaTree!.revisions[genesisHash!]
                        // Check if the genesis revision claim_id matches the current certificate genesis revision hash
                        if (genesisRevision.forms_identity_claim_id === certGenRevisionHash) {
                              const attestor = genesisRevision.forms_wallet_address
                              const context = genesisRevision.forms_context
                              foundAttestors.push({ walletAddress: attestor, context })
                        }
                  }
                  setAttesters(foundAttestors)
            } catch (e) {
                  console.log("Error: ", e)
                  setDeleteDialogOpen(false)
            }
            setIsDeleting(false)
      }

      const certType = getCertType()
      const creator = getCreator()
      const handleDeleteFile = async () => {
            setIsDeleting(true)
            try {
                  const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!)
                  const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
                  const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_delete_file`)
                  const response = await axios.post(
                        url,
                        { revisionHash: lastRevisionHash },
                        { headers: { nonce: session?.nonce } }
                  )

                  if (response.status === 200) {
                        setDeleteDialogOpen(false)
                        toast.success('File deleted successfully')
                        // Trigger reload - you may need to add this reload logic
                        window.location.reload()
                  }
            } catch (e) {
                  toast.error('File deletion error')
                  setDeleteDialogOpen(false)
            }
            setIsDeleting(false)
      }

      useEffect(() => {
            getCurrentFileObject()
            // const contractInformation = processContractInformation(apiFileInfo)
            // setContractInformation(contractInformation)
            loadCertAttestations()
      }, [apiFileInfo])

      return (
            <>
                  <TableRow key={`${workflowName}-${index}`} className="hover:bg-muted/50 h-fit cursor-pointer" onClick={e => {
                        e.preventDefault()
                        // setSelectedFileInfo(apiFileInfo)
                        // navigate('/app/pdf/workflow')
                  }}>
                        <TableCell className="font-medium w-75 max-w-75 min-w-75">
                              <div className='space-y-1'>
                                    <div className="w-full flex items-center gap-3">
                                          <div className="shrink-0">
                                                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                      <FileText className="h-5 w-5 text-blue-600" />
                                                </div>
                                          </div>
                                          <div className="grow min-w-0">
                                                <div className="font-medium text-sm wrap-break-word whitespace-normal">{currentFileObject?.fileName}</div>
                                                <div className="text-xs text-muted-foreground">Created at {getTimeInfo()}</div>
                                          </div>
                                    </div>
                                    <div>
                                          {
                                                creator ? (
                                                      <WalletAdrressClaim walletAddress={creator} />
                                                ) : null
                                          }
                                    </div>
                              </div>
                        </TableCell>
                        <TableCell className="w-50">
                              <div className="flex items-center gap-2 w-fit capitalize" onClick={e => {
                                    e.stopPropagation()
                              }}>
                                    {certType}
                              </div>
                        </TableCell>
                        <TableCell className="w-37.5">
                              <div className="space-y-1">
                                    {/* attestations/attesters */}
                                    <div className="flex items-center gap-2 w-fit" onClick={e => {
                                          e.stopPropagation()
                                    }}>
                                          <div className="flex -space-x-2">
                                                {attesters?.slice(0, 3).map((attester, index: number) => (
                                                      <WalletAdrressClaim key={index} avatarOnly={true} walletAddress={attester.walletAddress} />
                                                ))}
                                                {attesters?.length > 3 && (
                                                      <Avatar className="h-8 w-8 border-2 border-background" onClick={e => {
                                                            e.preventDefault()
                                                      }}>
                                                            <AvatarFallback className="text-xs">+{attesters?.length - 3}</AvatarFallback>
                                                      </Avatar>
                                                )}
                                          </div>
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Users className="h-3 w-3" />
                                                {attesters?.length}
                                          </div>
                                    </div>
                              </div>
                        </TableCell>
                        <TableCell className="text-right w-25">
                              <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                          <Button
                                                ref={dropdownTriggerRef}
                                                variant="outline"
                                                className="h-8 w-8 p-0 cursor-pointer"
                                          >
                                                <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem className='cursor-pointer' onClick={() => {
                                                openDrawer && openDrawer(apiFileInfo, attesters)
                                          }}>
                                                <FileText className="mr-2 h-4 w-4" />
                                                View Attestations
                                          </DropdownMenuItem>
                                          <OpenSelectedFileDetailsButton file={apiFileInfo} index={index}>
                                                <DropdownMenuItem className='cursor-pointer'>
                                                      <Eye className="mr-2 h-4 w-4" />
                                                      Details
                                                </DropdownMenuItem>
                                          </OpenSelectedFileDetailsButton>
                                          <DownloadAquaChain file={apiFileInfo} index={index}>
                                                <DropdownMenuItem className='cursor-pointer'>
                                                      <Download className="mr-2 h-4 w-4" />
                                                      Download
                                                </DropdownMenuItem>
                                          </DownloadAquaChain>
                                          <DropdownMenuSeparator />
                                          <DeleteAquaChain
                                                apiFileInfo={apiFileInfo}
                                                backendUrl={backend_url}
                                                nonce={session?.nonce ?? ''}
                                                revision=""
                                                index={index}
                                                onDeleteClick={() => {
                                                      // Remove focus from dropdown button before opening dialog
                                                      dropdownTriggerRef.current?.blur()
                                                      // Small delay to ensure focus is properly removed before dialog opens
                                                      setTimeout(() => setDeleteDialogOpen(true), 10)
                                                }}
                                          >
                                                <DropdownMenuItem variant='destructive' className="cursor-pointer">
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      Delete
                                                </DropdownMenuItem>
                                          </DeleteAquaChain>
                                    </DropdownMenuContent>
                              </DropdownMenu>
                        </TableCell>
                  </TableRow>

                  {/* Delete Dialog - Outside the dropdown to prevent DOM detachment */}
                  <DeleteAquaChainDialog
                        open={deleteDialogOpen}
                        onOpenChange={setDeleteDialogOpen}
                        onConfirm={handleDeleteFile}
                        isLoading={isDeleting}
                  />
            </>
      )
}

export default function AquaCertWorkflows() {
      const { workflowType } = useParams<{ workflowType: string }>();
      const { session, backend_url, setOpenDialog } = useStore(appStore)
      const [pagination, setPagination] = useState<GlobalPagination | null>(null)

      const [workflowsUi, setWorkflowsUi] = useState<IWorkflowItem[]>([])
      const [isLoading, setIsLoading] = useState<boolean>(false)
      const [currentPage, setCurrentPage] = useState(1)

      const [drawerInfo, setDrawerInfo] = useState<IAquaCertWorkflowDrawer>({
            open: false,
            attestors: []
      })

      const processFilesToWorkflowUi = (_files: ApiFileInfo[]) => {
            const newData: IWorkflowItem[] = []
            _files.forEach(file => {
                  const nameItem: string = getAquaTreeFileName(file.aquaTree!)
                  newData.push({ workflowName: nameItem, apiFileInfo: file })
            })
            setWorkflowsUi(newData)
      }

      // Extract data loading logic into a separate function
      const loadWorkflowsData = async (page: number = currentPage) => {
            if (!session || !backend_url) return;

            setIsLoading(true);
            try {
                  const params = {
                        page,
                        limit: 10,
                        claim_types: workflowType ? JSON.stringify([workflowType]) : JSON.stringify(['aqua_certificate']) //default to aqua_sign if no type provided
                  }
                  const filesDataQuery = await axios.get(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_PER_TYPE}`), {
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
                  toast.error('Error fetching workflows')
                  console.log(error)
            } finally {
                  setIsLoading(false);
            }
      }

      // Watch for reload triggers
      useReloadWatcher({
            key: RELOAD_KEYS.aqua_sign,
            onReload: () => {
                  loadWorkflowsData();
            }
      });

      useEffect(() => {
            loadWorkflowsData(currentPage);
      }, [currentPage])

      console.log("Drawerinfo: ", drawerInfo)


      return (
            <>
                  {/* Action Bar */}
                  <div className="bg-white border-b border-gray-200 px-6 py-4 hidden">
                        <div className="flex items-center justify-between">
                              <div /> {/* Empty div to push the button right */}
                              <div className="flex items-center space-x-4">
                                    <button
                                          className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
                                          style={{ backgroundColor: '#394150' }}
                                          onClick={() => {
                                                // setOpenCreateAquaSignPopUp(true)
                                                setOpenDialog({
                                                      dialogType: 'aqua_sign',
                                                      isOpen: true,
                                                      onClose: () => setOpenDialog(null),
                                                      onConfirm: () => {
                                                            // Handle confirmation logic here
                                                      }
                                                })
                                          }}
                                    >
                                          <Plus className="w-4 h-4" />
                                          <span>Create New Certificate </span>
                                    </button>
                              </div>
                        </div>
                  </div>

                  <div className="space-y-6 mt-5">
                        <Card className="py-6">
                              <CardHeader>
                                    <CardTitle className="flex items-center gap-2 justify-between">
                                          <div className="flex items-center gap-2">
                                                <FileText className="h-5 w-5" />
                                                <span>AquaCerts - Digital Certificates</span>
                                          </div>
                                          <button
                                                className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
                                                style={{ backgroundColor: '#394150' }}
                                                onClick={() => {
                                                      // setOpenCreateAquaSignPopUp(true)
                                                      setOpenDialog({
                                                            dialogType: 'aqua_certificate',
                                                            isOpen: true,
                                                            onClose: () => setOpenDialog(null),
                                                            onConfirm: () => {
                                                                  // Handle confirmation logic here
                                                            }
                                                      })
                                                }}
                                          >
                                                <Plus className="w-4 h-4" />
                                                <span>New Cert</span>
                                          </button>
                                    </CardTitle>
                              </CardHeader>
                              <CardContent className="px-1">
                                    {/* <div className="rounded-md border"> */}
                                    <div className="overflow-x-auto md:h-[calc(100vh-300px)] overflow-y-auto">
                                          <Table>
                                                <TableHeader>
                                                      <TableRow>
                                                            <TableHead className="w-75 max-w-75 min-w-75 wrap-break-word overflow-hidden">Document</TableHead>
                                                            <TableHead>Certificate Type</TableHead>
                                                            <TableHead>Attesters</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                      </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                      {isLoading ? (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-100 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                                                              <span>Loading Certificates...</span>
                                                                        </div>
                                                                  </TableCell>
                                                            </TableRow>
                                                      ) : workflowsUi.length === 0 ? (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-100 text-center">
                                                                        No certificates found
                                                                  </TableCell>
                                                            </TableRow>
                                                      ) : (
                                                            workflowsUi.map((workflow, index: number) => (
                                                                  <CertificateTableItem key={`${index}-workflow`}
                                                                        workflowName={workflow.workflowName}
                                                                        apiFileInfo={workflow.apiFileInfo}
                                                                        index={index}
                                                                        openDrawer={(fileInfo: ApiFileInfo, attestors: ICertificateAttestor[]) => {
                                                                              console.log("Attestors: ", attestors)
                                                                              let info: IAquaCertWorkflowDrawer = {
                                                                                    open: true,
                                                                                    attestors: attestors,
                                                                                    fileInfo: fileInfo,
                                                                              }
                                                                              setDrawerInfo(info)
                                                                        }}
                                                                  />
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

                  {/* Dialog to show active certificate with the rest of the information like attestation */}
                  {
                        drawerInfo.fileInfo ? (
                              <AquaCertWorkflowDrawer
                                    open={drawerInfo.open}
                                    attestors={drawerInfo.attestors}
                                    fileInfo={drawerInfo.fileInfo}
                                    onClose={() => {
                                          const resetStatusOfdrawerInfo: IAquaCertWorkflowDrawer = {
                                                open: false,
                                                attestors: []
                                          }
                                          setDrawerInfo(resetStatusOfdrawerInfo)
                                    }}

                              />
                        ) : null
                  }
            </>
      )
}
