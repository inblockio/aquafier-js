import { useEffect, useState, useRef } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuLabel,
      DropdownMenuSeparator,
      DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
      AlertCircle,
      CheckCircle,
      Clock,
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
      getAquaTreeFileName,
      getAquaTreeFileObject,
      getGenesisHash,
      processContractInformation
} from '@/utils/functions'
import { FileObject } from 'aqua-js-sdk'
import { IContractInformation } from '@/types/contract_workflow'
import { DownloadAquaChain } from '../../components/aqua_chain_actions/download_aqua_chain'
import { OpenAquaSignWorkFlowButton } from '../../components/aqua_chain_actions/open_aqua_sign_workflow'
import { DeleteAquaChain, DeleteAquaChainDialog } from '../../components/aqua_chain_actions/delete_aqua_chain'
import { IWorkflowItem } from '@/types/types'
import WalletAdrressClaim from '../v2_claims_workflow/WalletAdrressClaim'
import { ApiFileInfo } from '@/models/FileInfo'
import { toast } from 'sonner'
import axios from 'axios'
import { API_ENDPOINTS } from '@/utils/constants'
import { GlobalPagination } from '@/types'
import CustomPagination from '@/components/common/CustomPagination'
import { useNavigate } from 'react-router-dom'
import { useReloadWatcher } from '@/hooks/useReloadWatcher'

const getStatusIcon = (status: string) => {
      switch (status) {
            case 'completed':
                  return <CheckCircle className="h-4 w-4" />
            case 'pending':
                  return <Clock className="h-4 w-4" />
            case 'overdue':
                  return <AlertCircle className="h-4 w-4" />
            case 'draft':
                  return <FileText className="h-4 w-4" />
            default:
                  return <Clock className="h-4 w-4" />
      }
}

const getStatusColor = (status: string) => {
      switch (status) {
            case 'completed':
                  return 'bg-green-100 text-green-800 border-green-200'
            case 'pending':
                  return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'overdue':
                  return 'bg-red-100 text-red-800 border-red-200'
            case 'draft':
                  return 'bg-gray-100 text-gray-800 border-gray-200'
            default:
                  return 'bg-gray-100 text-gray-800 border-gray-200'
      }
}

const getProgressPercentage = (total: number, remaining: number) => {
      if (total === 0) return 0 // Avoid division by zero
      return ((total - remaining) / total) * 100
}

const WorkflowTableItem = ({ workflowName, apiFileInfo, index = 0 }: IWorkflowItem) => {
      const {setSelectedFileInfo} = useStore(appStore)
      const navigate = useNavigate()
      const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined)
      const [contractInformation, setContractInformation] = useState<IContractInformation | undefined>(undefined)
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

      const getSigners = () => {
            const genRevision = getGenesisHash(apiFileInfo.aquaTree!)
            if (genRevision) {
                  const signers = apiFileInfo.aquaTree?.revisions?.[genRevision]?.forms_signers
                  if (signers) {
                        return signers.split(',')
                  }
            } else {
                  return 'Not available'
            }
      }

      const getSignersStatus = () => {
            let signersStatus: Array<{ address: string; status: string }> = []
            if (contractInformation) {
                  signersStatus = contractInformation.firstRevisionData?.forms_signers.split(',').map((signer: string) => {
                        const item = contractInformation.signatureRevisionHashes.find(e => e.walletAddress.toLowerCase().trim() == signer.toLowerCase().trim())

                        if (item) {
                              return {
                                    address: signer,
                                    status: 'signed',
                              }
                        } else {
                              // if isWorkFlowComplete is empty show green check mark
                              // this experiemntal,
                              if (contractInformation.isWorkFlowComplete.length === 0) {
                                    return {
                                          address: signer,
                                          status: 'signed',
                                    }
                              }
                              return {
                                    address: signer,
                                    status: 'pending',
                              }
                        }
                  })
            }
            return signersStatus
      }

      const signers = getSigners()
      const signersStatus = getSignersStatus()

      const handleDeleteFile = async () => {
            setIsDeleting(true)
            try {
                  const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!)
                  const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
                  const url = `${backend_url}/explorer_delete_file`
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
            const contractInformation = processContractInformation(apiFileInfo)
            setContractInformation(contractInformation)
      }, [apiFileInfo])

      return (
            <>
                  <TableRow key={`${workflowName}-${index}`} className="hover:bg-muted/50 h-fit cursor-pointer" onClick={e => {
                  e.preventDefault()
                  setSelectedFileInfo(apiFileInfo)
                  navigate('/app/pdf/workflow')
            }}>
                  <TableCell className="font-medium w-[300px] max-w-[300px] min-w-[300px]">
                        <div className="w-full flex items-center gap-3">
                              <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                          <FileText className="h-5 w-5 text-blue-600" />
                                    </div>
                              </div>
                              <div className="flex-grow min-w-0">
                                    <div className="font-medium text-sm break-words whitespace-normal">{currentFileObject?.fileName}</div>
                                    <div className="text-xs text-muted-foreground">Created at {getTimeInfo()}</div>
                              </div>
                        </div>
                  </TableCell>
                  <TableCell className="w-[200px]">
                        <div className="flex items-center gap-2 w-fit" onClick={e => {
                        e.stopPropagation()
                  }}>
                              <div className="flex -space-x-2">
                                    {signers?.slice(0, 3).map((signer: string, index: number) => (
                                          <WalletAdrressClaim key={index} avatarOnly={true} walletAddress={signer} />
                                    ))}
                                    {signers?.length > 3 && (
                                          <Avatar className="h-8 w-8 border-2 border-background" onClick={e => {
                                                e.preventDefault()
                                          }}>
                                                <AvatarFallback className="text-xs">+{signers?.length - 3}</AvatarFallback>
                                          </Avatar>
                                    )}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Users className="h-3 w-3" />
                                    {signers?.length}
                              </div>
                        </div>
                  </TableCell>
                  <TableCell className="w-[150px]">
                        <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                    <span>
                                          {signersStatus.filter(e => e.status == 'signed').length}/{signers?.length}
                                    </span>
                                    <span className="text-muted-foreground">
                                          {Math.round(getProgressPercentage(signersStatus.length, signersStatus.filter(e => e.status == 'pending').length))}%
                                    </span>
                              </div>
                              <Progress
                                    value={getProgressPercentage(signersStatus.length, signersStatus.filter(e => e.status == 'pending').length)}
                                    className="h-2"
                              />
                              {signersStatus.filter(e => e.status == 'pending').length > 0 && (
                                    <div className="text-xs text-muted-foreground">{signersStatus.filter(e => e.status == 'pending').length} remaining</div>
                              )}
                        </div>
                  </TableCell>
                  <TableCell className="w-[100px]">
                        <Badge variant="outline" className={`${getStatusColor(signersStatus.filter(e => e.status == 'pending').length > 0 ? 'pending' : 'completed')} capitalize`}>
                              {getStatusIcon(signersStatus.filter(e => e.status == 'pending').length > 0 ? 'pending' : 'completed')}
                              <span className="ml-1">{signersStatus.filter(e => e.status == 'pending').length > 0 ? 'pending' : 'completed'}</span>
                        </Badge>
                  </TableCell>
                  <TableCell className="text-right w-[100px]">
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
                                    <OpenAquaSignWorkFlowButton item={apiFileInfo} nonce={session?.nonce ?? ''}>
                                          <DropdownMenuItem>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Document
                                          </DropdownMenuItem>
                                    </OpenAquaSignWorkFlowButton>
                                    {/* <DropdownMenuItem disabled>
                                          <Send className="mr-2 h-4 w-4" />
                                          Send Reminder
                                    </DropdownMenuItem> */}
                                    <DownloadAquaChain file={apiFileInfo} index={index}>
                                          <DropdownMenuItem>
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
                                          <DropdownMenuItem className="text-red-600">
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

export default function WorkflowsTablePage() {
      const { session, backend_url, setOpenDialog } = useStore(appStore)
      const [pagination, setPagination] = useState<GlobalPagination | null>(null)

      const [workflowsUi, setWorkflowsUi] = useState<IWorkflowItem[]>([])
      const [isLoading, setIsLoading] = useState<boolean>(false)
      const [currentPage, setCurrentPage] = useState(1)

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
                        claim_types: JSON.stringify(['aqua_sign'])
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
            key: 'aqua_sign',
            onReload: () => {
                  console.log('Reloading Aqua Sign workflows...');
                  loadWorkflowsData();
            }
      });

      useEffect(() => {
            loadWorkflowsData(currentPage);
      }, [currentPage])

    
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
                                          <span>Create Document Signature </span>
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
                                                <span>Aqua Sign Workflows</span>
                                          </div>
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
                                                <span>New</span>
                                          </button>
                                    </CardTitle>
                              </CardHeader>
                              <CardContent className="px-1">
                                    {/* <div className="rounded-md border"> */}
                                    <div className="overflow-x-auto md:h-[calc(100vh-300px)] overflow-y-auto">
                                          <Table>
                                                <TableHeader>
                                                      <TableRow>
                                                            <TableHead className="w-[300px] max-w-[300px] min-w-[300px] break-words overflow-hidden">Document</TableHead>
                                                            {/* <TableHead>Workflow Type</TableHead> */}
                                                            <TableHead>Signers</TableHead>
                                                            <TableHead>Progress</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Actions</TableHead>
                                                      </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                      {isLoading ? (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-[400px] text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                                                              <span>Loading Aqua Sign Workflows...</span>
                                                                        </div>
                                                                  </TableCell>
                                                            </TableRow>
                                                      ) : workflowsUi.length === 0 ? (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-[400px] text-center">
                                                                        No workflows found
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
