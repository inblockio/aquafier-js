import { useEffect, useState } from 'react'
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
      Send,
      Trash2,
      Users
} from 'lucide-react'
import appStore from '@/store'
import { useStore } from 'zustand'
import {
      displayTime,
      fetchFiles,
      getAquaTreeFileName,
      getAquaTreeFileObject,
      getGenesisHash,
      isWorkFlowData,
      processContractInformation
} from '@/utils/functions'
import { FileObject } from 'aqua-js-sdk'
import { IContractInformation } from '@/types/contract_workflow'
import { DownloadAquaChain } from '../../components/aqua_chain_actions/download_aqua_chain'
import { OpenAquaSignWorkFlowButton } from '../../components/aqua_chain_actions/open_aqua_sign_workflow'
import { DeleteAquaChain } from '../../components/aqua_chain_actions/delete_aqua_chain'
import { IWorkflowItem } from '@/types/types'
import WalletAdrressClaim from '../v2_claims_workflow/WalletAdrressClaim'
import { ApiFileInfo } from '@/models/FileInfo'
import { set } from 'date-fns'

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
      const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined)
      const [contractInformation, setContractInformation] = useState<IContractInformation | undefined>(undefined)
      const { session, backend_url } = useStore(appStore)

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

      useEffect(() => {
            getCurrentFileObject()
            const contractInformation = processContractInformation(apiFileInfo)
            setContractInformation(contractInformation)
      }, [apiFileInfo])

      return (
            <TableRow key={`${workflowName}-${index}`} className="hover:bg-muted/50">
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
                  {/* <TableCell className="w-[200px]">
        <p className="text-sm capitalize">{workflowName.split("_").join(" ").trim()}</p>
      </TableCell> */}
                  <TableCell className="w-[200px]">
                        <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                    {signers?.slice(0, 3).map((signer: string, index: number) => (
                                          <WalletAdrressClaim key={index} avatarOnly={true} walletAddress={signer} />
                                    ))}
                                    {signers?.length > 3 && (
                                          <Avatar className="h-8 w-8 border-2 border-background">
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
                                    <Button variant="outline" className="h-8 w-8 p-0 cursor-pointer">
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
                                    <DropdownMenuItem disabled>
                                          <Send className="mr-2 h-4 w-4" />
                                          Send Reminder
                                    </DropdownMenuItem>
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

export default function WorkflowsTablePage() {
      const {  session, setWorkflows, backend_url, systemFileInfo, setOpenDialog } = useStore(appStore)

      // const [workflows] = useState<DocumentWorkflow[]>(mockWorkflows);

      const [workflowsUi, setWorkflowsUi] = useState<IWorkflowItem[]>([])
      const [isLoading, setIsLoading] = useState<boolean>(false)

      const processFilesToGetWorkflows = (files: ApiFileInfo[]) => {
            const someData = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        return ''
                  }
            })

            const newData: IWorkflowItem[] = []
            files.forEach(file => {
                  // const fileObject = getAquaTreeFileObject(file);
                  const { workFlow, isWorkFlow } = isWorkFlowData(file.aquaTree!, someData)
                  if (isWorkFlow && workFlow === 'aqua_sign') {
                        // setWorkflows((prev : IWorkflowItem[]) => {

                        const currentName = getAquaTreeFileName(file.aquaTree!)
                        const containsCurrentName: IWorkflowItem | undefined = newData.find((e: IWorkflowItem) => {
                              if (e && e.apiFileInfo && e.apiFileInfo.aquaTree) {
                                    const nameItem: string = getAquaTreeFileName(e.apiFileInfo.aquaTree)
                                    return nameItem === currentName
                              }
                        })
                        if (!containsCurrentName) {
                              newData.push({ workflowName: workFlow, apiFileInfo: file })
                        }

                        //   [...prev, { workflowName: workFlow, apiFileInfo: file }]
                        // })
                  }
            })

            setWorkflowsUi(newData)
      }

      useEffect(() => {
            setIsLoading(true);
            (async () => {

                  const filesApi = await fetchFiles(session!.address, `${backend_url}/workflows`, session!.nonce)
                  setWorkflows({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })


                  processFilesToGetWorkflows(filesApi.files)
            })()

             setIsLoading(false);
      },[])
      // useEffect(() => {
      //       processFilesToGetWorkflows()
      // }, [files.fileData.map(e => Object.keys(e?.aquaTree?.file_index ?? {})).join(','), systemFileInfo.map(e => Object.keys(e?.aquaTree?.file_index??{})).join(',')])



      if (isLoading) {
            // return <div>Loading...</div>
            return    <div className="flex items-center gap-2">
                        {/* Circular Loading Spinner */}
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Loading Aqua Sign Workflows</span>
                  </div>
      }
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
                                                <span>Aqua Sign Workflows.</span>
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
                                    <div className="overflow-x-auto">
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
                                                      {workflowsUi.length === 0 && (
                                                            <TableRow>
                                                                  <TableCell colSpan={6} className="h-24 text-center">
                                                                        No workflows found
                                                                  </TableCell>
                                                            </TableRow>
                                                      )}
                                                      {workflowsUi.map((workflow, index: number) => (
                                                            <WorkflowTableItem key={`${index}-workflow`} workflowName={workflow.workflowName} apiFileInfo={workflow.apiFileInfo} index={index} />
                                                      ))}
                                                </TableBody>
                                          </Table>
                                    </div>
                              </CardContent>
                        </Card>
                  </div>
            </>
      )
}
