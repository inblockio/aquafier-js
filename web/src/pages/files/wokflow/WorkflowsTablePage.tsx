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
import { Avatar, AvatarFallback } from '@/components/shadcn/ui/avatar';
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
  Edit,
  Trash2,
  Download,
  Send,
} from 'lucide-react';
import appStore from '@/store';
import { useStore } from 'zustand';
import { displayTime, getAquaTreeFileName, getAquaTreeFileObject, getGenesisHash, isWorkFlowData } from '@/utils/functions';
import { file } from 'jszip';
import { ApiFileInfo } from '@/models/FileInfo';
import { FileObject } from 'aqua-js-sdk';

interface DocumentWorkflow {
  id: string;
  documentName: string;
  totalSigners: number;
  remainingSigners: number;
  status: 'pending' | 'completed' | 'overdue' | 'draft';
  createdDate: string;
  dueDate: string;
  signers: Array<{
    name: string;
    email: string;
    status: 'signed' | 'pending' | 'viewed';
  }>;
}

const mockWorkflows: DocumentWorkflow[] = [
  {
    id: '1',
    documentName: 'Employment Agreement - John Smith',
    totalSigners: 3,
    remainingSigners: 1,
    status: 'pending',
    createdDate: '2024-01-15',
    dueDate: '2024-01-25',
    signers: [
      { name: 'John Smith', email: 'john@example.com', status: 'signed' },
      { name: 'HR Manager', email: 'hr@company.com', status: 'signed' },
      { name: 'Legal Team', email: 'legal@company.com', status: 'pending' },
    ],
  },
  {
    id: '2',
    documentName: 'NDA - Project Phoenix',
    totalSigners: 5,
    remainingSigners: 0,
    status: 'completed',
    createdDate: '2024-01-10',
    dueDate: '2024-01-20',
    signers: [
      { name: 'Alice Johnson', email: 'alice@example.com', status: 'signed' },
      { name: 'Bob Wilson', email: 'bob@example.com', status: 'signed' },
      { name: 'Carol Davis', email: 'carol@example.com', status: 'signed' },
      { name: 'David Brown', email: 'david@example.com', status: 'signed' },
      { name: 'Eve Miller', email: 'eve@example.com', status: 'signed' },
    ],
  },
  // {
  //   id: '3',
  //   documentName: 'Vendor Agreement - TechCorp Solutions',
  //   totalSigners: 2,
  //   remainingSigners: 2,
  //   status: 'overdue',
  //   createdDate: '2024-01-05',
  //   dueDate: '2024-01-15',
  //   signers: [
  //     { name: 'TechCorp CEO', email: 'ceo@techcorp.com', status: 'viewed' },
  //     { name: 'Legal Advisor', email: 'legal@techcorp.com', status: 'pending' },
  //   ],
  // },
  {
    id: '4',
    documentName: 'Partnership Agreement - StartupXYZ',
    totalSigners: 4,
    remainingSigners: 4,
    status: 'draft',
    createdDate: '2024-01-18',
    dueDate: '2024-01-28',
    signers: [
      { name: 'CEO StartupXYZ', email: 'ceo@startupxyz.com', status: 'pending' },
      { name: 'CTO StartupXYZ', email: 'cto@startupxyz.com', status: 'pending' },
      { name: 'Legal Team', email: 'legal@ourcompany.com', status: 'pending' },
      { name: 'Business Dev', email: 'bizdev@ourcompany.com', status: 'pending' },
    ],
  },
  {
    id: '5',
    documentName: 'Service Agreement - ClientCorp',
    totalSigners: 2,
    remainingSigners: 1,
    status: 'pending',
    createdDate: '2024-01-12',
    dueDate: '2024-01-22',
    signers: [
      { name: 'Client Manager', email: 'manager@clientcorp.com', status: 'signed' },
      { name: 'Project Lead', email: 'lead@ourcompany.com', status: 'pending' },
    ],
  },
];

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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

  const getRemainingSigners = () => {
    return 0
  }

  const signers = getSigners();
  const remainingSigners = getRemainingSigners();

  useEffect(() => {
    getCurrentFileObject();
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
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {signers?.slice(0, 3).map((signer: string, index: number) => (
              <Avatar
                key={index}
                className="h-8 w-8 border-2 border-background"
              >
                <AvatarFallback className="text-xs">
                  {getInitials(signer)}
                </AvatarFallback>
              </Avatar>
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
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>
              {signers?.length - remainingSigners}/{signers?.length}
            </span>
            <span className="text-muted-foreground">
              {Math.round(getProgressPercentage(signers?.length, remainingSigners))}%
            </span>
          </div>
          <Progress
            value={getProgressPercentage(signers?.length, remainingSigners)}
            className="h-2"
          />
          {remainingSigners > 0 && (
            <div className="text-xs text-muted-foreground">
              {remainingSigners} remaining
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={`${getStatusColor("pending")} capitalize`}
        >
          {getStatusIcon("pending")}
          <span className="ml-1">{"pending"}</span>
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
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
              <Edit className="mr-2 h-4 w-4" />
              Edit
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
  const { files, systemFileInfo } = useStore(appStore)

  const [workflows] = useState<DocumentWorkflow[]>(mockWorkflows);

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
    files.forEach(file => {
      // const fileObject = getAquaTreeFileObject(file);
      const { workFlow, isWorkFlow } = isWorkFlowData(file.aquaTree!!, someData);
      if (isWorkFlow) {
        console.log(isWorkFlow, workFlow);
        setWorkflows((prev) => [...prev, { workflowName: workFlow, apiFileInfo: file }])
      }
    })

  }

  useEffect(() => {
    processFilesToGetWorkflows();
  }, [files]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Document Workflow Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] max-w-[300px] min-w-[300px] break-words overflow-hidden">Document</TableHead>
                  <TableHead>Signers</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Due Date</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                  _workflows.map((workflow) => (
                    <WorkflowTableItem key={workflow.index} workflowName={workflow.workflowName} apiFileInfo={workflow.apiFileInfo} index={workflow.index} />
                  ))
                }
                {/* {workflows.map((workflow) => (
                  <TableRow key={workflow.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {workflow.documentName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Created {formatDate(workflow.createdDate)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {workflow.signers.slice(0, 3).map((signer, index) => (
                            <Avatar
                              key={index}
                              className="h-8 w-8 border-2 border-background"
                            >
                              <AvatarFallback className="text-xs">
                                {getInitials(signer.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {workflow.signers.length > 3 && (
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarFallback className="text-xs">
                                +{workflow.signers.length - 3}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {workflow.totalSigners}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {workflow.totalSigners - workflow.remainingSigners}/{workflow.totalSigners}
                          </span>
                          <span className="text-muted-foreground">
                            {Math.round(getProgressPercentage(workflow.totalSigners, workflow.remainingSigners))}%
                          </span>
                        </div>
                        <Progress
                          value={getProgressPercentage(workflow.totalSigners, workflow.remainingSigners)}
                          className="h-2"
                        />
                        {workflow.remainingSigners > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {workflow.remainingSigners} remaining
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(workflow.status)} capitalize`}
                      >
                        {getStatusIcon(workflow.status)}
                        <span className="ml-1">{workflow.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(workflow.dueDate)}
                      </div>
                      {workflow.status === 'overdue' && (
                        <div className="text-xs text-red-600 font-medium">
                          Overdue
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
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
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
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
                ))} */}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}