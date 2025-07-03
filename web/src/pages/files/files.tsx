import { useEffect, useState } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
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
    Grid3X3,
    List,
    FileText,
    
} from 'lucide-react';

const FilesPage = () => {


     const { files, backend_url, session, setSelectedFileInfo, selectedFileInfo, systemFileInfo } = useStore(appStore)
   
    return (
        <>
           {/* Action Bar */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    className="flex items-center space-x-2 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                                    style={{ backgroundColor: '#E55B1F' }}
                                >
                                    <Upload className="w-4 h-4" />
                                    <span>Upload or drop</span>
                                </button>
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

        {
            files.length == 0 ? <FileDropZone/> :   <FilesList />
        }

        

        </>
    );
};

export default FilesPage;