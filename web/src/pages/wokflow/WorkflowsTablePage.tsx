import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/ui/table';
import { Badge } from '@/components/shadcn/ui/badge';
import { Button } from '@/components/shadcn/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/ui/avatar';
import { Progress } from '@/components/shadcn/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/ui/dropdown-menu';
import {
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Trash2,
  Download,
  Send,
  Plus,
} from 'lucide-react';
import appStore from '@/store';
import { useStore } from 'zustand';
import { displayTime, generateAvatar, getAquaTreeFileName, getAquaTreeFileObject, getGenesisHash, isWorkFlowData, processContractInformation } from '@/utils/functions';
import { ApiFileInfo } from '@/models/FileInfo';
import { FileObject } from 'aqua-js-sdk';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/ui/tooltip';
import { IContractInformation } from '@/types/contract_workflow';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'overdue':
      return <AlertCircle className="h-4 w-4" />;
    case 'draft':
      return <FileText className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getProgressPercentage = (total: number, remaining: number) => {
  return ((total - remaining) / total) * 100;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase();
};

interface IWorkflowItem { workflowName: string, apiFileInfo: ApiFileInfo, index?: number }

const WorkflowTableItem = ({ workflowName, apiFileInfo, index = 0 }: IWorkflowItem) => {
  const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined);
  const [contractInformation, setContractInformation] = useState<IContractInformation | undefined>(undefined);

  const getCurrentFileObject = () => {
    const fileObject = getAquaTreeFileObject(apiFileInfo);
    setCurrentFileObject(fileObject);
  }

  const getTimeInfo = () => {

    let genRevision = getGenesisHash(apiFileInfo.aquaTree!);
    if (genRevision) {
      let timestamp = apiFileInfo.aquaTree?.revisions?.[genRevision]?.local_timestamp;
      if (timestamp) {
        return displayTime(timestamp);
      }
    } else {
      return "Not available";
    }
  }

  const getSigners = () => {
    let genRevision = getGenesisHash(apiFileInfo.aquaTree!);
    if (genRevision) {
      let signers = apiFileInfo.aquaTree?.revisions?.[genRevision]?.forms_signers;
      if (signers) {
        return signers.split(",");
      }
    } else {
      return "Not available";
    }
  }

  const getSignersStatus = () => {
    let signersStatus: Array<{ address: string; status: string }> = []
    if (contractInformation) {
      signersStatus = contractInformation.firstRevisionData?.forms_signers.split(",").map((signer: string) => {

        let item = contractInformation.signatureRevisionHashes.find((e) => e.walletAddress.toLowerCase().trim() == signer.toLowerCase().trim())

        if (item) {
          return ({
            address: signer,
            status: "signed"
          })
        } else {
          // if isWorkFlowComplete is empty show green check mark
          // this experiemntal,
          if (contractInformation.isWorkFlowComplete.length === 0) {
            return ({
              address: signer,
              status: "signed"
            })
          }
          return ({
            address: signer,
            status: "pending"
          })
        }
      })
    }
    return signersStatus
  }


  const signers = getSigners();
  const signersStatus = getSignersStatus();

  useEffect(() => {
    getCurrentFileObject();
    const contractInformation = processContractInformation(apiFileInfo);
    setContractInformation(contractInformation);
  }, [apiFileInfo]);

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
            <div className="font-medium text-sm break-words whitespace-normal">
              {currentFileObject?.fileName}
            </div>
            <div className="text-xs text-muted-foreground">
              Created at {getTimeInfo()}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[200px]">
        <p className="text-sm capitalize">{workflowName.split("_").join(" ").trim()}</p>
      </TableCell>
      <TableCell className="w-[200px]">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {signers?.slice(0, 3).map((signer: string, index: number) => (
              <Tooltip
                key={index}
              >
                <TooltipTrigger asChild>
                  <Avatar
                    key={index}
                    className="h-8 w-8 border-2 rounded-full border-blue-500"
                  >
                    <AvatarImage src={generateAvatar(signer)} alt="Avatar" />
                    <AvatarFallback className="text-xs">
                      {getInitials(signer)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{signer}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {signers?.length > 3 && (
              <Avatar className="h-8 w-8 border-2 border-background">
                <AvatarFallback className="text-xs">
                  +{signers?.length - 3}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            {signers?.length}
          </div>
        </div>
      </TableCell>
      <TableCell className='w-[150px]'>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>
              {signersStatus.filter((e) => e.status == "signed").length}/{signers?.length}
            </span>
            <span className="text-muted-foreground">
              {Math.round(getProgressPercentage(signersStatus.filter((e) => e.status == "signed").length, signersStatus.filter((e) => e.status == "pending").length))}%
            </span>
          </div>
          <Progress
            value={getProgressPercentage(signersStatus.filter((e) => e.status == "signed").length, signersStatus.filter((e) => e.status == "pending").length)}
            className="h-2"
          />
          {signersStatus.filter((e) => e.status == "pending").length > 0 && (
            <div className="text-xs text-muted-foreground">
              {signersStatus.filter((e) => e.status == "pending").length} remaining
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className='w-[100px]'>
        <Badge
          variant="outline"
          className={`${getStatusColor(signersStatus.filter((e) => e.status == "pending").length > 0 ? "pending" : "completed")} capitalize`}
        >
          {getStatusIcon(signersStatus.filter((e) => e.status == "pending").length > 0 ? "pending" : "completed")}
          <span className="ml-1">{signersStatus.filter((e) => e.status == "pending").length > 0 ? "pending" : "completed"}</span>
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
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Document
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Send className="mr-2 h-4 w-4" />
              Send Reminder
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export default function WorkflowsTablePage() {
  const { files, systemFileInfo, setOpenCreateAquaSignPopUp } = useStore(appStore)

  // const [workflows] = useState<DocumentWorkflow[]>(mockWorkflows);

  const [_workflows, setWorkflows] = useState<IWorkflowItem[]>([])

  const processFilesToGetWorkflows = () => {
    const someData = systemFileInfo.map((e) => {
      try {
        return getAquaTreeFileName(e.aquaTree!!);
      } catch (e) {
        console.log("Error processing system file"); // More descriptive
        return "";
      }
    });

    let newData: IWorkflowItem[] = [];
    files.forEach(file => {
      // const fileObject = getAquaTreeFileObject(file);
      const { workFlow, isWorkFlow } = isWorkFlowData(file.aquaTree!!, someData);
      if (isWorkFlow && workFlow === "aqua_sign") {
        // setWorkflows((prev : IWorkflowItem[]) => {


        let currentName = getAquaTreeFileName(file.aquaTree!!);
        let containsCurrentName: IWorkflowItem | undefined = newData.find((e: IWorkflowItem) => {
          if (e && e.apiFileInfo && e.apiFileInfo.aquaTree) {
            let nameItem: string = getAquaTreeFileName(e.apiFileInfo.aquaTree);
            return nameItem === currentName
          }
        });
        if (!containsCurrentName) {
          newData.push({ workflowName: workFlow, apiFileInfo: file })
        }

        //   [...prev, { workflowName: workFlow, apiFileInfo: file }]
        // })
      }
    })

    setWorkflows(newData)

  }

  useEffect(() => {
    processFilesToGetWorkflows();
  }, []);

  return (
    <>
      {/* Action Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div /> {/* Empty div to push the button right */}
          <div className="flex items-center space-x-4">

            <button className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
              style={{ backgroundColor: '#394150' }}
              onClick={() => {

                setOpenCreateAquaSignPopUp(true)
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Document Signature </span>
            </button>

          </div>
        </div>
      </div>


      <div className="space-y-6">
        {
          _workflows.length == 0 ? <>


          </> :

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Aqua Sign Workflows
                </CardTitle>
              </CardHeader>
              <CardContent>



                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px] max-w-[300px] min-w-[300px] break-words overflow-hidden">Document</TableHead>
                        <TableHead>Workflow Type</TableHead>
                        <TableHead>Signers</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {
                        _workflows.map((workflow, index: number) => (
                          <WorkflowTableItem key={`${index}-workflow`} workflowName={workflow.workflowName} apiFileInfo={workflow.apiFileInfo} index={index} />
                        ))
                      }
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

        }
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aqua Sign Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px] max-w-[300px] min-w-[300px] break-words overflow-hidden">Document</TableHead>
                    <TableHead>Workflow Type</TableHead>
                    <TableHead>Signers</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {
                    _workflows.length  === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No workflows found
                        </TableCell>
                      </TableRow>
                    )
                  }
                  {
                    _workflows.map((workflow, index: number) => (
                      <WorkflowTableItem key={`${index}-workflow`} workflowName={workflow.workflowName} apiFileInfo={workflow.apiFileInfo} index={index} />
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

    </>
  );
}