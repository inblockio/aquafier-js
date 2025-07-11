import { useEffect, useState } from 'react';
import {
    Grid3X3,
    List

} from 'lucide-react';


import { useStore } from 'zustand';
import appStore from '../store';
import FileListItem from './files_list_item';

export default function FilesList() {


    const [showWorkFlowsOnly, setShowWorkFlowsOnly] = useState(false);
    const [view, setView] = useState('list');

    const { files, systemFileInfo, backend_url, session } = useStore(appStore)


    useEffect(() => {
        if (location.pathname.endsWith('files_workflows')) {
            // Add your logic here
            console.log('URL ends with files_workflows');
            setShowWorkFlowsOnly(true)
        }
    }, []);

    useEffect(() => {
        console.log("FilesPage mounted");
        // Check if the url ends with files_workflows
        if (location.pathname.endsWith('files_workflows')) {
            // Add your logic here
            console.log('URL ends with files_workflows');
            setShowWorkFlowsOnly(true)
        }
        return () => {
            console.log("FilesPage unmounted");
            setShowWorkFlowsOnly(false)
        };
    }, [location.pathname]);



    return (
        <div>
            {/* File Content */}
            <div className="flex-1 bg-white px-6 py-4">
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

                {/* Tabs */}
                {/* <div className="flex space-x-6 mb-6 border-b">
        <button
            onClick={() => setActiveTab('recents')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'recents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            <Clock className="w-4 h-4 inline mr-2" />
            Recents
        </button>
        <button
            onClick={() => setActiveTab('starred')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'starred'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            <Star className="w-4 h-4 inline mr-2" />
            Starred
        </button>
    </div> */}

                {/* File List Header */}
                <div className="flex items-center py-3 border-b border-gray-200 text-sm font-medium text-gray-700">
                    <div className="flex-1">Name</div>
                    <div className="w-24">Type</div>
                    <div className="w-50">Uploaded At</div>
                    <div className="w-24">Files Size</div>
                    <div className="w-120">Actions</div> {/* Fixed width for actions column */}
                </div>

                {/* File List */}
                <div className="space-y-1">
                    {files.map((file, index) => <FileListItem showWorkFlowsOnly={showWorkFlowsOnly} key={index} index={index} file={file} systemFileInfo={systemFileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} />)}
                </div>
            </div>

        </div>
    )
}