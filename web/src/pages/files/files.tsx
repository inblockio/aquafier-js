import React, { useEffect, useState } from 'react';
import FileDropZone from './components/dropzone_file_actions/dropzone_file_actions';
import appStore from "../../store"
import { useStore } from "zustand"
import FilesList from './files_list';
import {
    Upload,
    Plus,
    FolderPlus,
    Download,
    Share2,
    Copy,
    X,
    CheckCircle,
    AlertCircle,
    Loader2,
    FileText,
    Minimize2
} from 'lucide-react';
import { FileItemWrapper } from '@/types/types';
import { checkIfFileExistInUserFiles, getAquaTreeFileName, isAquaTree, isJSONFile, isJSONKeyValueStringContent, isZipFile, readFileContent } from '@/utils/functions';
import { maxFileSizeForUpload } from '@/utils/constants';
import axios from 'axios';
import { ApiFileInfo } from '@/models/FileInfo';

// shadcn/ui components
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/shadcn/ui/dialog";
import { Progress } from '@/components/shadcn/ui/progress';
import { Button } from '@/components/shadcn/ui/button';
import { Badge } from '@/components/shadcn/ui/badge';
import { Card, CardContent } from '@/components/shadcn/ui/card';

import { CompleteChainView } from './components/files_chain_details';
import { IDrawerStatus } from '@/models/AquaTreeDetails';

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
    const { files, setFiles, session, backend_url, selectedFileInfo, setSelectedFileInfo, setOpenDetailsPopUp ,openDetailsPopUp } = useStore(appStore)
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [filesList, _setFilesList] = useState<FileItemWrapper[]>([]);

    // Upload popup state
    const [uploadQueue, setUploadQueue] = useState<UploadStatus[]>([]);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)
    const [isSelectedFileDialogOpen, setIsSelectedFileDialogOpen] = useState(false);

 


    useEffect(() => {

        if (openDetailsPopUp) {
            setIsSelectedFileDialogOpen(true)
        } else {
            setIsSelectedFileDialogOpen(false)

        }
    }, [openDetailsPopUp]);

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
        const response = await axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                "nonce": session?.nonce
            },
        });

        const res = response.data;
        const fileInfo: ApiFileInfo = {
            aquaTree: res.aquaTree,
            fileObject: [res.fileObject],
            linkedFileObjects: [],
            mode: "private",
            owner: metamaskAddress ?? ""
        };

        let newFilesData = [...files, fileInfo];
        setFiles(newFilesData);
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
        <>
            {/* Action Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                            style={{ backgroundColor: '#E55B1F' }}
                            onClick={handleUploadClick}
                        >
                            <Upload className="w-4 h-4" />
                            <span>Upload or drop</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                            style={{ backgroundColor: '#394150' }}
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Document Signature </span>
                        </button>
                        <button className="flex items-center space-x-2 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                            <FolderPlus className="w-4 h-4" />
                            <span>Create Template</span>
                        </button>
                        <button className="flex items-center space-x-2 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                            <Download className="w-4 h-4" />
                            <span>Get the app</span>
                        </button>
                        <button className="flex items-center space-x-2 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                            <Copy className="w-4 h-4" />
                            <span>Transfer a copy</span>
                        </button>
                        <button className="flex items-center space-x-2 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                            <Share2 className="w-4 h-4" />
                            <span>Share</span>
                        </button>
                    </div>
                </div>
            </div>

            {files.length == 0 ? <FileDropZone /> : <FilesList />}

            <Dialog open={isSelectedFileDialogOpen} onOpenChange={setIsSelectedFileDialogOpen} >

                <DialogContent className="[&>button]:hidden !max-w-[95vw] !w-[95vw] h-[95vh] max-h-[95vh] flex flex-col">
                    <div className="absolute top-4 right-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                                setSelectedFileInfo(null)
                                setOpenDetailsPopUp(false)
                            }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {
                        selectedFileInfo ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle>{getAquaTreeFileName(selectedFileInfo.aquaTree!!)}</DialogTitle>
                                </DialogHeader>
                                <CompleteChainView callBack={function (_drawerStatus: IDrawerStatus): void {
                                    setDrawerStatus(_drawerStatus)
                                }} selectedFileInfo={selectedFileInfo} />
                            </>
                        ) : null
                    }
                    <DialogFooter className="mt-auto">
                        <Button variant="outline" onClick={() => {
                            setSelectedFileInfo(null)
                            setOpenDetailsPopUp(false)
                        }}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
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
        </>
    );
};

export default FilesPage;