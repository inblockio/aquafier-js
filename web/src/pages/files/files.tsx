import { useEffect, useState } from 'react';
import {
    Plus,
    Share2,
    Star,
    FileText,
    Settings,
    LayoutTemplate,
    Workflow,
    Signature,
    Link,
    Bell,
    Users
} from 'lucide-react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import FilesList from './files_list';
import FilesSettings from './files_settings';

const FilesPage = () => {

    const [activeTab, setActiveTab] = useState('all_files');

    const location = useLocation();
    const usedStorage = 3.3; // GB
    const totalStorage = 5; // GB
    const usagePercentage = (usedStorage / totalStorage) * 100;

    let pathname = location.pathname.replace('/', '');
    const activeTabCheck = () => {
        let activeTab = "all_files";


        // Determine the active tab based on the pathname
        if (pathname === 'files_all' || pathname === 'files') {
            activeTab = "files";
        } else if (pathname === "files_workflows") {
            activeTab = "files_workflows";
        } else if (pathname === "files_templates") {
            activeTab = "files_templates";
        } else if (pathname === "files_shared") {
            activeTab = "files_shared";
        } else if (pathname === "files_info") {
            activeTab = "files_info";
        } else if (pathname === "files_settings") {
            activeTab = "files_settings";
        } else if (pathname === "files_document_signature") {
            activeTab = "files_document_signature";
        } else if (pathname === "files_domain_attestation") {
            activeTab = "files_domain_attestation";
        }

        console.log("pathname is", pathname);
        console.log("activeTab is", activeTab);
        setActiveTab(activeTab);
    }

    useEffect(() => {
        activeTabCheck()
    }, [location]);


    useEffect(() => {
        // Check if Tailwind is already loaded
        if (!document.querySelector('link[href*="tailwind"]')) {
            const link = document.createElement('link');
            link.href = "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }

        activeTabCheck()

        return () => {
            // Remove the stylesheet when component unmounts (optional)
            const link = document.querySelector('link[href*="tailwind"]');
            if (link) document.head.removeChild(link);
        };
    }, []);

    const sidebarItems = [
        { icon: FileText, label: 'All files', id: "files" },
        { icon: Workflow, label: 'Workflows', id: "files_workflows" },
        { icon: LayoutTemplate, label: 'Templates', id: "files_templates" },
        { icon: Share2, label: 'Shared files', id: "files_shared" },
    ];

    const quickAccessItems = [
        { label: 'Info', icon: Star, id: "files_info" },
        { label: 'Settings', icon: Settings, id: "files_settings" }
    ];

    const applicationsItems = [
        { label: 'Document Signature', icon: Signature, id: "files_document_signature" },
        { label: 'Domain Attestation', icon: Link, id: "files_domain_attestation" }
    ];



    const mainContent = () => {
        if (pathname == "files") {
            return <FilesList />
        } else if (pathname == "files_settings") {
            return <FilesSettings />
        } else {
            return <>404</>
        }
    }

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
                            <RouterLink
                                key={index}
                                to={"/" + item.id}
                                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm ${item.id.trim() == activeTab.trim()
                                    ? 'text-white font-medium'   // White text for better contrast
                                    : 'text-gray-700 hover:bg-gray-100'          // Default state (unchanged)
                                    }`}
                                style={item.id.trim() == activeTab.trim() ? { backgroundColor: '#E55B1F' } : {}}
                                onMouseEnter={(e) => {
                                    // let element = 
                                    if (item.id.trim() == activeTab.trim()) {
                                        // (e.target as HTMLElement).style.backgroundColor = '#f3f4f6'; // Default hover color
                                    } else {
                                        // (e.target as HTMLElement).style.backgroundColor = '#f59367'; // Lighter orange on hover 
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (item.id.trim() == activeTab.trim()) {
                                        // (e.target as HTMLElement).style.backgroundColor = '#E55B1F'; // Back to original orange
                                    } else {
                                        // (e.target as HTMLElement).style.backgroundColor = ''; // Back to grey

                                    }
                                }}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label} </span>
                            </RouterLink>
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
                                <RouterLink
                                    key={index}
                                    to={"/" + item.id}
                                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm ${item.id.trim() == activeTab.trim()
                                        ? 'text-white font-medium'   // White text for better contrast
                                        : 'text-gray-700 hover:bg-gray-100'          // Default state (unchanged)
                                        }`}
                                    style={item.id.trim() == activeTab.trim() ? { backgroundColor: '#E55B1F' } : {}}
                                >
                                    {item.icon && <item.icon className="w-4 h-4" />}
                                    <span>{item.label}</span>
                                </RouterLink>
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
                                <RouterLink
                                    key={index}
                                    to={"/" + item.id}
                                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm ${item.id.trim() == activeTab.trim()
                                        ? 'text-white font-medium'   // White text for better contrast
                                        : 'text-gray-700 hover:bg-gray-100'          // Default state (unchanged)
                                        }`}
                                    style={item.id.trim() == activeTab.trim() ? { backgroundColor: '#E55B1F' } : {}}
                                >
                                    {item.icon && <item.icon className="w-4 h-4" />}
                                    <span>{item.label}</span>
                                </RouterLink>
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

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Search */}
                            {/* <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search"
                    className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div> */}
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
                {/* Main Content */}
                {mainContent()}

            </div>

        </div>
    );
};

export default FilesPage;