import React, { useEffect, useState } from 'react';
import appStore from "../store"
import { useStore } from "zustand"
import FilesList from './files_list';
import {
    Upload,
    Plus,
    FolderPlus,
    X,
    CheckCircle,
    AlertCircle,
    Loader2,
    FileText,
    Minimize2
} from 'lucide-react';
import { FileItemWrapper } from '@/types/types';
import { checkIfFileExistInUserFiles, fetchFiles, getAquaTreeFileName, isAquaTree, isJSONFile, isJSONKeyValueStringContent, isZipFile, readFileContent } from '@/utils/functions';
import { maxFileSizeForUpload } from '@/utils/constants';
import axios from 'axios';
import { ApiFileInfo } from '@/models/FileInfo';

// /components//ui components
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// import { CompleteChainView } from './components/files_chain_details';
import { IDrawerStatus } from '@/models/AquaTreeDetails';
import { CompleteChainView } from '@/components/files_chain_details';
import FileDropZone from '@/components/dropzone_file_actions';

interface UploadStatus {
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    error?: string;
    isJson?: boolean;
    isZip?: boolean;
    isJsonForm?: boolean;
    isJsonAquaTreeData?: boolean;
}

const FilesPage = () => {
    const { files, setFiles, session, backend_url, selectedFileInfo, setSelectedFileInfo, setOpenFileDetailsPopUp, openFilesDetailsPopUp, setOpenCreateAquaSignPopUp, setOpenCreateTemplatePopUp } = useStore(appStore)
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [filesList, _setFilesList] = useState<FileItemWrapper[]>([]);

    // Upload popup state
    const [uploadQueue, setUploadQueue] = useState<UploadStatus[]>([]);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const [_drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)
    const [isSelectedFileDialogOpen, setIsSelectedFileDialogOpen] = useState(false);




    useEffect(() => {

        if (openFilesDetailsPopUp) {
            setIsSelectedFileDialogOpen(true)
        } else {
            setIsSelectedFileDialogOpen(false)

        }
    }, [openFilesDetailsPopUp]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files ?? []);
        if (selectedFiles.length === 0) return;

        // Create upload queue with initial status
        const newUploads: UploadStatus[] = selectedFiles.map(file => ({
            file,
            status: 'pending',
            progress: 0,
            isJson: isJSONFile(file.name),
            isZip: isZipFile(file.name)
        }));

        setUploadQueue(newUploads);
        setIsUploadDialogOpen(true);
        setIsMinimized(false);

        // Start processing files
        processUploadQueue(newUploads);
    };

    const processUploadQueue = async (uploads: UploadStatus[]) => {
        for (let i = 0; i < uploads.length; i++) {
            const upload = uploads[i];

            // Update status to uploading
            setUploadQueue(prev => prev.map((item, index) =>
                index === i ? { ...item, status: 'uploading', progress: 10 } : item
            ));

            try {
                // Check file content first
                await checkFileContentForUpload(upload, i);

                // Simulate progress
                for (let progress = 20; progress <= 80; progress += 20) {
                    setUploadQueue(prev => prev.map((item, index) =>
                        index === i ? { ...item, progress } : item
                    ));
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                // Upload the file
                await uploadFileFromQueue(upload, i);

                // Mark as success
                setUploadQueue(prev => prev.map((item, index) =>
                    index === i ? { ...item, status: 'success', progress: 100 } : item
                ));

            } catch (error) {
                // Mark as error
                setUploadQueue(prev => prev.map((item, index) =>
                    index === i ? {
                        ...item,
                        status: 'error',
                        progress: 0,
                        error: error instanceof Error ? error.message : 'Upload failed'
                    } : item
                ));
            }
        }

        // fetch all files from the api
        const url2 = `${backend_url}/explorer_files`;
        const files = await fetchFiles(session?.address!, url2, session?.nonce!);
        setFiles(files)
    };

    const checkFileContentForUpload = async (upload: UploadStatus, index: number) => {
        if (upload.isJson) {
            try {
                let content = await readFileContent(upload.file);
                let contentStr = content as string;
                let isForm = isJSONKeyValueStringContent(contentStr);

                if (isForm) {
                    setUploadQueue(prev => prev.map((item, i) =>
                        i === index ? { ...item, isJsonForm: true, isJsonAquaTreeData: false } : item
                    ));
                    return;
                }

                let jsonData = JSON.parse(contentStr);
                let isAquaTreeData = isAquaTree(jsonData);

                if (isAquaTreeData) {
                    setUploadQueue(prev => prev.map((item, i) =>
                        i === index ? { ...item, isJsonForm: false, isJsonAquaTreeData: true } : item
                    ));
                    return;
                }
            } catch (error) {
                console.error("Error reading file content:", error);
                throw new Error("Failed to read file content");
            }
        }
    };

    const uploadFileFromQueue = async (upload: UploadStatus, _index: number) => {
        if (!upload.file) {
            throw new Error("No file selected");
        }

        let fileExist = await checkIfFileExistInUserFiles(upload.file, files);
        if (fileExist) {
            throw new Error("File already exists");
        }

        if (upload.file.size > maxFileSizeForUpload) {
            throw new Error("File size exceeds 200MB limit");
        }

        let metamaskAddress = session?.address ?? "";
        const formData = new FormData();
        formData.append('file', upload.file);
        formData.append('account', `${metamaskAddress}`);

        const url = `${backend_url}/explorer_files`;
        const _response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                "nonce": session?.nonce
            },
        });

        // const res = response.data;
        // const fileInfo: ApiFileInfo = {
        //     aquaTree: res.aquaTree,
        //     fileObject: [res.fileObject],
        //     linkedFileObjects: [],
        //     mode: "private",
        //     owner: metamaskAddress ?? ""
        // };

        // let newFilesData = [...files, fileInfo];
        // setFiles((prev)=>{});
    };

    const retryUpload = (index: number) => {
        const upload = uploadQueue[index];
        if (upload.status === 'error') {
            processUploadQueue([upload]);
        }
    };

    const removeFromQueue = (index: number) => {
        setUploadQueue(prev => prev.filter((_, i) => i !== index));
    };

    const clearCompletedUploads = () => {
        setUploadQueue(prev => prev.filter(upload => upload.status !== 'success'));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <FileText className="w-4 h-4 text-gray-500" />;
            case 'uploading':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'success':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return <FileText className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-gray-100 text-gray-800';
            case 'uploading':
                return 'bg-blue-100 text-blue-800';
            case 'success':
                return 'bg-green-100 text-green-800';
            case 'error':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Legacy effect for filesList (keeping for compatibility)
    useEffect(() => {
        console.log("Files updated:", filesList.length);
        // ... existing logic
    }, [filesList]);



    return (
        <div className="w-full max-w-full box-border overflow-x-hidden"    >
            {/* Action Bar */}
            <div className="border-b border-gray-100 px-2 sm:px-6 pt-2 overflow-hidden w-full max-w-full">
                <div className="w-full overflow-x-auto pb-2">
                    <div className="flex items-center gap-2 sm:gap-4 flex-nowrap min-w-max">
                        <Button
                            data-testid="file-upload-dropzone"
                            className="flex items-center gap-1 sm:gap-2 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium hover:brightness-90 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                            style={{ backgroundColor: '#E55B1F' }}
                            onClick={handleUploadClick}
                        >
                            <Upload className="w-4 h-4" />
                            <span>Upload a File</span>
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <Button
                            data-testid="create-document-signature"
                            className="flex items-center gap-1 sm:gap-2 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                            style={{ backgroundColor: '#394150' }}
                            onClick={() => {
                                //, 
                                setOpenCreateAquaSignPopUp(true)
                            }}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Document Signature </span>
                        </Button>
                        <Button className="flex items-center gap-1 sm:gap-2 text-gray-700 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                            onClick={() => {
                                setOpenCreateTemplatePopUp(true)
                            }}
                        >
                            <FolderPlus className="w-4 h-4" />
                            <span>Create Template</span>
                        </Button>
                        {/* <Button className="flex items-center gap-1 sm:gap-2 text-gray-700 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap shadow-sm">
                            <Download className="w-4 h-4" />
                            <span>Get the app</span>
                        </Button>
                        <Button className="flex items-center gap-1 sm:gap-2 text-gray-700 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap shadow-sm">
                            <Copy className="w-4 h-4" />
                            <span>Transfer a copy</span>
                        </Button>
                        <Button className="hiden flex items-center gap-1 sm:gap-2 text-gray-700 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap shadow-sm">
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                        </Button> */}
                    </div>
                </div>
            </div>

            <div className='w-full max-w-full box-border overflow-x-hidden bg-white p-6'>
                {files.length == 0 ? <FileDropZone /> : <FilesList />}
            </div>

            <Dialog open={isSelectedFileDialogOpen} onOpenChange={(openState) => {
                setIsSelectedFileDialogOpen(openState)
                if (!openState) {
                    setSelectedFileInfo(null)
                    setOpenFileDetailsPopUp(false)
                }
            }} >

                <DialogContent showCloseButton={false} className="!max-w-[90vw] !w-[90vw] !h-[95vh] max-h-[95vh] !p-0 gap-0 flex flex-col">
                    {/* Close Button */}
                    <div className="absolute top-4 right-4 z-10">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                            onClick={() => {
                                setIsSelectedFileDialogOpen(false)
                                setSelectedFileInfo(null)
                                setOpenFileDetailsPopUp(false)
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {
                        selectedFileInfo ? (
                            <div className='flex flex-col flex-1 h-[calc(100%-60px)]'>
                                {/* Header - fixed height */}
                                <DialogHeader className='!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center px-6'>
                                    <DialogTitle>{getAquaTreeFileName(selectedFileInfo.aquaTree!!)}</DialogTitle>
                                </DialogHeader>
                                {/* Content - takes all available space */}
                                <div className='h-[calc(100%-60px)]'>
                                    <CompleteChainView callBack={function (_drawerStatus: IDrawerStatus): void {
                                        setDrawerStatus(_drawerStatus)
                                    }} selectedFileInfo={selectedFileInfo} />
                                </div>
                            </div>
                        ) : null
                    }
                    {/* Footer - fixed height */}
                    <DialogFooter className="!h-[60px] !min-h-[60px] !max-h-[60px] !p-0 flex items-center justify-center !px-6 ">
                        <Button variant="outline"
                            className="bg-black text-white-500 hover:bg-black-700 text-white cursor-pointer"
                            style={{}} onClick={() => {
                                setSelectedFileInfo(null)
                                setOpenFileDetailsPopUp(false)
                            }}>Cancel</Button>
                        {/* <Button type="submit">Save changes</Button> */}
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Upload Progress Dialog */}
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogContent className="sm:max-w-md  [&>button]:hidden">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <DialogTitle className="text-lg font-semibold">
                            {isMinimized ? 'Upload Progress' : `Uploading ${uploadQueue.length} file${uploadQueue.length > 1 ? 's' : ''}`}
                        </DialogTitle>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="h-6 w-6"
                            >
                                <Minimize2 className="h-4 w-4" />
                            </Button>
                            <Button
                                data-testid="close-upload-dialog-button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsUploadDialogOpen(false)}
                                className="h-6 w-6"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>

                    {!isMinimized && (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {uploadQueue.map((upload, index) => (
                                <Card key={index} className="p-3">
                                    <CardContent className="p-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                {getStatusIcon(upload.status)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {upload.file.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatFileSize(upload.file.size)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="secondary" className={getStatusColor(upload.status)}>
                                                    {upload.status}
                                                </Badge>
                                                {upload.status === 'error' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => retryUpload(index)}
                                                        className="text-xs"
                                                    >
                                                        Retry
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFromQueue(index)}
                                                    className="h-6 w-6"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {upload.status === 'uploading' && (
                                            <div className="space-y-1">
                                                <Progress value={upload.progress} className="h-2" />
                                                <p className="text-xs text-gray-500">
                                                    {upload.progress}% complete
                                                </p>
                                            </div>
                                        )}

                                        {upload.status === 'error' && upload.error && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {upload.error}
                                            </p>
                                        )}

                                        {upload.status === 'success' && (
                                            <p className="text-xs text-green-600 mt-1">
                                                Upload completed successfully
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            {uploadQueue.some(upload => upload.status === 'success') && (
                                <div className="flex justify-end pt-2">
                                    <Button
                                        data-testid="clear-completed-button"
                                        variant="outline"
                                        size="sm"
                                        onClick={clearCompletedUploads}
                                    >
                                        Clear completed
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FilesPage;