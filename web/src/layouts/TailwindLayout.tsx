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
    Users,
    CopyrightIcon,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import CustomNavLink from '@/components/ui/CustomNavLink'
import { Link as RouterLink } from 'react-router-dom'
import { useStore } from 'zustand'
import appStore from '@/store'
import { ConnectWallet } from '@/components/connect_wallet'
import { Toaster } from 'sonner'

const TailwindLayout = () => {
    const { session } = useStore(appStore)

    const usedStorage = 3.3 // GB
    const totalStorage = 5 // GB
    const usagePercentage = (usedStorage / totalStorage) * 100

    const sidebarItems = [
        { icon: FileText, label: 'All files', id: '/' },
        { icon: Workflow, label: 'Workflows', id: '/files_workflows' },
        { icon: LayoutTemplate, label: 'Templates', id: '/files_templates' },
        { icon: Share2, label: 'Shared files', id: '/files_shared' },
    ]

    const quickAccessItems = [
        { label: 'Info', icon: Star, id: '/files_info' },
        { label: 'Settings', icon: Settings, id: '/files_settings' },
    ]

    const applicationsItems = [
        {
            label: 'Document Signature',
            icon: Signature,
            id: '/form-instance/aqua_sign',
        },
        // { label: 'Domain Attestation', icon: Link, id: "/domain_attestation" }
        {
            label: 'Claim & Attestation',
            icon: Link,
            id: '/claims_and_attestation',
        },
    ]

    const uiView = () => {
        return (
            <div className="flex h-screen bg-white">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
                    {/* Logo */}
                    <div className="p-4 border-b border-gray-200 overflow-hidden">
                        <div className="flex items-center space-x-2">
                            <a
                                href="/"
                                data-discover="true"
                                style={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    textDecoration: 'none',
                                }}
                            >
                                <img
                                    className="h-[36px]"
                                    src="/images/logo.png"
                                />
                            </a>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 p-4">
                        <nav className="space-y-2">
                            {sidebarItems.map((item, index) => (
                                <CustomNavLink
                                    key={`app_${index}`}
                                    item={item}
                                    index={index}
                                />
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
                                    <CustomNavLink
                                        key={`application_${index}`}
                                        item={item}
                                        index={index}
                                    />
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
                                    <CustomNavLink
                                        key={`general_${index}`}
                                        item={item}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom section */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            {/* Storage Header */}
                            <h3 className="text-sm font-medium text-gray-900 mb-3">
                                Storage
                            </h3>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${usagePercentage}%` }}
                                ></div>
                            </div>

                            {/* Storage Details */}
                            <div className="text-sm text-gray-600">
                                <span className="text-blue-600 underline">
                                    {usedStorage} GB
                                </span>{' '}
                                used of {totalStorage} GB (
                                {Math.round(usagePercentage)}%)
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                    Get started
                                </span>
                                <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                    25% off
                                </span>
                            </div>
                            <p className="text-xs text-gray-300">
                                Give it a try today
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-screen bg-white relative">
                    {/* Header */}
                    <div className="bg-white border-b px-2 border-gray-200 h-[70px] min-h-[70px] max-h-[70px] overflow-hidden">
                        <div className="h-full flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* Search */}
                                {/* <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search"
                                        className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div> 
                            */}
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
                                {/* <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                A
                            </div> */}
                                <ConnectWallet dataTestId="sign-in-button-files-list" />
                            </div>
                        </div>
                    </div>
                    {/* Main Content - with flex-grow to push footer down */}
                    <div className="flex-grow" style={{ height: '100000px' }}>
                        <Outlet />
                    </div>

                    {/* Footer - fixed at bottom */}
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-right w-full">
                        <div className="text-sm text-gray-500">
                            <span className="font-medium">
                                {new Date().getFullYear()}{' '}
                                <CopyrightIcon className="inline w-4 h-4 align-text-bottom" />{' '}
                                <RouterLink to={'https://inblock.io/'}>
                                    Inblock.io
                                </RouterLink>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <Toaster position="top-right" richColors />
            {session?.address != undefined ? (
                uiView()
            ) : (
                <div className="flex items-center justify-center h-screen">
                    <ConnectWallet dataTestId="sign-in-button-files-list" />
                </div>
            )}
        </>
    )
}

export default TailwindLayout
