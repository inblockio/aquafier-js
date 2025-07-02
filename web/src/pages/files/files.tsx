import { useEffect, useState } from 'react';
import {
    Search,
    Upload,
    Plus,
    FolderPlus,
    Download,
    Share2,
    Copy,
    Grid3X3,
    List,
    Star,
    Clock,
    CopyrightIcon,
    FileText,
    Users,
    Bell,
    Settings,
    LayoutTemplate,
    Workflow,
    Signature,
    Link
} from 'lucide-react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { LuDelete, LuDownload, LuEye, LuGlasses, LuLink2, LuShare2, LuSignature } from 'react-icons/lu';

const FilesPage = () => {
    const [view, setView] = useState('list');
    const [activeTab, setActiveTab] = useState('all_files');
    const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);

    const location = useLocation();

    const usedStorage = 3.3; // GB
    const totalStorage = 5; // GB
    const usagePercentage = (usedStorage / totalStorage) * 100;

    useEffect(() => {
        // Check if Tailwind is already loaded
        if (!document.querySelector('link[href*="tailwind"]')) {
            const link = document.createElement('link');
            link.href = "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }

        let activeTab = "all_files";

        let pathname = location.pathname.replace('/', '');

        // Determine the active tab based on the pathname
        if (pathname === 'files_all' || pathname === 'files') {
            activeTab = "all_files";
        }

        console.log("pathname is", pathname);
        console.log("activeTab is", activeTab);
        setActiveTab(activeTab);



        return () => {
            // Remove the stylesheet when component unmounts (optional)
            const link = document.querySelector('link[href*="tailwind"]');
            if (link) document.head.removeChild(link);
        };
    }, []);

    const sidebarItems = [
        { icon: FileText, label: 'All files', id: "all_files" },
        { icon: Workflow, label: 'Workflows', id: "workflows" },
        { icon: LayoutTemplate, label: 'Templates', id: "templates" },
        { icon: Share2, label: 'Shared files', id: "shared_files" },
    ];

    const quickAccessItems = [
        { label: 'Info', icon: Star },
        { label: 'Settings', icon: Settings }
    ];

    const applicationsItems = [
        { label: 'Document Signature', icon: Signature },
        { label: 'Domain Attestation', icon: Link }
    ];

    const files = [
        {
            id: 1,
            name: 'dummy.pdf',
            type: 'pdf',
            modified: '1/7/2025 12:00 pm',
            //   access: 'Only you',
            starred: false
        }
    ];

    const handleFileSelect = (fileId: number) => {
        setSelectedFiles(prev =>
            prev.includes(fileId)
                ? prev.filter(id => id !== fileId)
                : [...prev, fileId]
        );
    };

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                        {/* <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <span className="font-semibold text-gray-900">Home</span> */}

                        <a href="/" data-discover="true" style={{ height: '100%', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            <img className="chakra-image css-d2a5gt" src="/images/logo.png" />
                        </a>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-4">
                    <nav className="space-y-2">
                        {sidebarItems.map((item, index) => (
                            <a
                                key={index}
                                href="#"
                                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm ${item.id.trim() == activeTab.trim()
                                    ? 'bg-blue-50 text-blue-700 font-medium'   // Light orange background + darker text
                                    : 'text-gray-700 hover:bg-gray-100'          // Default state (unchanged)
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label} </span>
                            </a>
                        ))}
                    </nav>


                    {/* Applications */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Applications
                            </h3>
                            <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                        </div>
                        <div className="space-y-2">
                            {applicationsItems.map((item, index) => (
                                <a
                                    key={index}
                                    href="#"
                                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {item.icon && <item.icon className="w-4 h-4" />}
                                    <span>{item.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* General */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                General
                            </h3>
                            {/* <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" /> */}
                        </div>
                        <div className="space-y-2">
                            {quickAccessItems.map((item, index) => (
                                <a
                                    key={index}
                                    href="#"
                                    className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {item.icon && <item.icon className="w-4 h-4" />}
                                    <span>{item.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>



                    {/* Drag important items */}
                    {/* <div className="mt-8 p-3 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-600">
              Drag important items here.
            </p>
          </div> */}
                </div>

                {/* Bottom section */}
                <div className="p-4 border-t border-gray-200">

                    <div className="bg-gray-50 p-4 rounded-lg">
                        {/* Storage Header */}
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Storage</h3>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${usagePercentage}%` }}
                            ></div>
                        </div>

                        {/* Storage Details */}
                        <div className="text-sm text-gray-600">
                            <span className="text-blue-600 underline">{usedStorage} GB</span> used of {totalStorage} GB ({Math.round(usagePercentage)}%)
                        </div>
                    </div>

                    <div className="bg-gray-900 text-white p-3 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Get started</span>
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">25%</span>
                        </div>
                        <p className="text-xs text-gray-300">
                            Give it a try today
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-500 hover:text-gray-700">
                                <Bell className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-gray-500 hover:text-gray-700">
                                <Users className="w-5 h-5" />
                                {/* <span className="ml-1 text-sm">Invite members</span> */}
                            </button>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                Start free trial
                            </button>
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                A
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                <Upload className="w-4 h-4" />
                                <span>Upload or drop</span>
                            </button>
                            <button className="flex items-center space-x-2 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                                <Plus className="w-4 h-4" />
                                <span>Create</span>
                            </button>
                            <button className="flex items-center space-x-2 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                                <FolderPlus className="w-4 h-4" />
                                <span>Create folder</span>
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
                    <div className="flex space-x-6 mb-6 border-b">
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
                    </div>

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
                                        <FileText className="w-4 h-4 text-red-600" />
                                    </div>
                                    <span className="text-sm text-gray-900">{file.name}</span>
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
                                        <button className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1.8 rounded-md hover:bg-green-200 transition-colors text-xs">
                                            <LuEye className="w-3 h-3" />
                                            <span>Details</span>
                                        </button>

                                        {/* Sign Button */}
                                        <button className="flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors text-xs">
                                            <LuSignature className="w-3 h-3" />
                                            <span>Sign</span>
                                        </button>

                                        {/* Witness Button */}
                                        <button className="flex items-center space-x-1 bg-gray-800 text-white px-2 py-1 rounded-md hover:bg-gray-900 transition-colors text-xs">
                                            <LuGlasses className="w-3 h-3" />
                                            <span>Witness</span>
                                        </button>
                                    </div>

                                    {/* Second row - 3 buttons */}
                                    <div className="flex gap-1">
                                        {/* Link Button */}
                                        <button className="flex items-center space-x-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md hover:bg-yellow-200 transition-colors text-xs">
                                            <LuLink2 className="w-3 h-3" />
                                            <span>Link</span>
                                        </button>

                                        {/* Share Button */}
                                        <button className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200 transition-colors text-xs">
                                            <LuShare2 className="w-3 h-3" />
                                            <span>Share</span>
                                        </button>

                                        {/* Delete Button */}
                                        <button className="flex items-center space-x-1 bg-pink-100 text-pink-700 px-2 py-1 rounded-md hover:bg-pink-200 transition-colors text-xs">
                                            <LuDelete className="w-3 h-3" />
                                            <span>Delete</span>
                                        </button>
                                    </div>

                                    {/* Third row - 1 smaller button */}
                                    <div className="flex">
                                        {/* Download Button - Smaller width */}
                                        <button className="flex items-center justify-center space-x-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200 transition-colors text-xs w-20">
                                            <LuDownload className="w-3 h-3" />
                                            <span>Download</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-right">
                    <div className="text-sm text-gray-500">
                        <span className="font-medium">
                            {new Date().getFullYear()} <CopyrightIcon className="inline w-4 h-4 align-text-bottom" /> <RouterLink to={"https://inblock.io/"} >Inblock.io</RouterLink>
                        </span>
                        {/* <br />
                        Go to Settings to activate Windows. */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilesPage;