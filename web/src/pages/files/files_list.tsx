import { useState } from 'react';
import {
    Grid3X3,
    List,
    FileText,
    
} from 'lucide-react';

import { LuDelete, LuDownload, LuEye, LuGlasses, LuLink2, LuShare2, LuSignature } from 'react-icons/lu';


export default function FilesList() {

    const [view, setView] = useState('list');
    const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);


    const files = Array(1000).fill(0).map((_, index) => ({
        id: index,
        name: `File ${index}`,
        type: 'pdf',
        modified: '1/7/2025 12:00 pm',
        //   access: 'Only you',
        starred: false
    }));

    const handleFileSelect = (fileId: number) => {
        setSelectedFiles(prev =>
            prev.includes(fileId)
                ? prev.filter(id => id !== fileId)
                : [...prev, fileId]
        );
    };

    return (
        <div>

         

            {/* File Content */}
            <div className="flex-1 bg-white px-6 py-4">
                {/* File Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold text-gray-900">All files</h1>
                        <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs text-gray-600">8</span>
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
                    <div className="w-32">Uploaded At</div>
                    <div className="w-24">Files Size</div>
                    <div className="w-96">Actions</div> {/* Fixed width for actions column */}
                </div>

                {/* File List */}
                <div className="space-y-1">
                    {files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center py-3 hover:bg-gray-50 rounded-md cursor-pointer group"
                            onClick={() => handleFileSelect(file.id)}
                        >
                            <div className="flex-1 flex items-center space-x-3">
                                <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <span className="text-md text-gray-900">{file.name}</span>
                            </div>

                            {/* Type Column */}
                            <div className="w-24 text-sm text-gray-500">PDF</div>

                            {/* Uploaded At Column */}
                            <div className="w-32 text-sm text-gray-500">1/7/2025</div>

                            {/* File Size Column */}
                            <div className="w-24 text-sm text-gray-500">2.4 MB</div>

                            {/* Actions Column - 3-3-1 Layout */}
                            <div className="w-96 flex flex-col gap-1">
                                {/* First row - 3 buttons */}
                                <div className="flex gap-1">
                                    {/* Details Button */}
                                    <button className="flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-2 rounded-md hover:bg-green-200 transition-colors text-xs">
                                        <LuEye className="w-3 h-3" />
                                        <span>Details</span>
                                    </button>

                                    {/* Sign Button */}
                                    <button className="flex items-center space-x-1 bg-blue-100 text-blue-700  px-3 py-2 rounded-md hover:bg-blue-200 transition-colors text-xs">
                                        <LuSignature className="w-3 h-3" />
                                        <span>Sign</span>
                                    </button>

                                    {/* Witness Button */}
                                    <button className="flex items-center space-x-1 bg-gray-800 text-white  px-3 py-2 rounded-md hover:bg-gray-900 transition-colors text-xs">
                                        <LuGlasses className="w-3 h-3" />
                                        <span>Witness</span>
                                    </button>

                                    {/* Link Button */}
                                    <button className="flex items-center space-x-1 bg-yellow-100 text-yellow-700  px-3 py-2 rounded-md hover:bg-yellow-200 transition-colors text-xs">
                                        <LuLink2 className="w-3 h-3" />
                                        <span>Link</span>
                                    </button>
                                </div>

                                {/* Second row - 3 buttons */}
                                <div className="flex gap-1">


                                    {/* Share Button */}
                                    <button className="flex items-center space-x-1 bg-red-100 text-red-700  px-3 py-2 rounded-md hover:bg-red-200 transition-colors text-xs">
                                        <LuShare2 className="w-3 h-3" />
                                        <span>Share</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button className="flex items-center space-x-1 bg-pink-100 text-pink-700  px-3 py-2 rounded-md hover:bg-pink-200 transition-colors text-xs">
                                        <LuDelete className="w-3 h-3" />
                                        <span>Delete</span>
                                    </button>

                                    {/* Download Button - Smaller width */}
                                    <button className="flex items-center justify-center space-x-1 bg-purple-100 text-purple-700  px-3 py-2 rounded-md hover:bg-purple-200 transition-colors text-xs w-20">
                                        <LuDownload className="w-3 h-3" />
                                        <span>Download</span>
                                    </button>
                                </div>

                                {/* Third row - 1 smaller button */}
                                {/* <div className="flex">
                        
                    </div> */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}