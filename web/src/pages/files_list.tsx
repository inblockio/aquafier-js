import { useEffect, useState } from 'react';
import { Grid3X3, List } from "lucide-react";
import FileListItem from "./files_list_item";
import { isWorkFlowData } from "@/utils/functions";

import { useStore } from 'zustand';
import appStore from '../store';

export default function FilesList() {

    const [showWorkFlowsOnly, setShowWorkFlowsOnly] = useState(false);
    const [view, setView] = useState('list');

    const { files, systemFileInfo, backend_url, session } = useStore(appStore)


    useEffect(() => {
        if (location.pathname.endsWith('files_workflows')) {
            // Add your logic here
            // console.log('URL ends with files_workflows');
            setShowWorkFlowsOnly(true)
        }
    }, []);

    useEffect(() => {
        // console.log("FilesPage mounted");
        // Check if the url ends with files_workflows
        if (location.pathname.endsWith('files_workflows')) {
            // Add your logic here
            // console.log('URL ends with files_workflows');
            setShowWorkFlowsOnly(true)
        }
        return () => {
            // console.log("FilesPage unmounted");
            setShowWorkFlowsOnly(false)
        };
    }, [location.pathname]);



    return (
        <div>
            {/* File Content */}
            <div className="flex-1">
                {/* File Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold text-gray-900">All files</h1>
                        <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">{files.length}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* <span className="text-sm text-gray-500">Only you</span> */}
                        <div className="flex bg-gray-100 rounded-md">
                            <button
                                onClick={() => setView('grid')}
                                className={`p-2 rounded-md ${view === 'grid' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Grid3X3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className={`p-2 rounded-md ${view === 'list' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Responsive Table */}
                <div className="hidden md:block"> {/* Table view for medium screens and up */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        <div className="p-1">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/3 rounded-tl-md">Name</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-24">Type</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-40">Uploaded At</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-24">File Size</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/4 rounded-tr-md">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {files.map((file, index) => {
                                        if ((showWorkFlowsOnly && file.aquaTree && isWorkFlowData(file.aquaTree, [""])?.isWorkFlow) || !showWorkFlowsOnly) {
                                            return (
                                                <FileListItem
                                                    showWorkFlowsOnly={showWorkFlowsOnly}
                                                    key={index}
                                                    index={index}
                                                    file={file}
                                                    systemFileInfo={systemFileInfo}
                                                    backendUrl={backend_url}
                                                    nonce={session?.nonce ?? ""}
                                                    viewMode="table"
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Card view for small screens */}
                <div className="md:hidden space-y-4">
                    {files.map((file, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                            <FileListItem
                                showWorkFlowsOnly={showWorkFlowsOnly}
                                key={index}
                                index={index}
                                file={file}
                                systemFileInfo={systemFileInfo}
                                backendUrl={backend_url}
                                nonce={session?.nonce ?? ""}
                                viewMode="card"
                            />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}