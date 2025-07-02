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


    // useEffect(() => {
    //     // Check if Tailwind is already loaded
    //     if (!document.querySelector('link[href*="tailwind"]')) {
    //         const link = document.createElement('link');
    //         link.href = "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css";
    //         link.rel = "stylesheet";
    //         document.head.appendChild(link);
    //     }

    //     activeTabCheck()

    //     return () => {
    //         // Remove the stylesheet when component unmounts (optional)
    //         const link = document.querySelector('link[href*="tailwind"]');
    //         if (link) document.head.removeChild(link);
    //     };
    // }, []);

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
        <>
        <FilesList />
        </>
    );
};

export default FilesPage;