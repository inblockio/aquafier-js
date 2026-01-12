import * as React from 'react'
import { useState } from 'react'

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from '@/components/ui/sidebar'
import CustomNavLink from './ui/CustomNavLink'
import { Contact, FileText, LayoutDashboard, LayoutTemplate, Link, Link2, Settings, Share2, Star, User, Workflow, CreditCard, Receipt, DollarSign, Shield } from 'lucide-react'
import { maxUserFileSizeForUpload } from '@/utils/constants'
import { formatBytes } from '@/utils/functions'
import { useStore } from 'zustand'
import appStore from '@/store'
import { WebConfig } from '@/types/types'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
      const { setOpenDialog, webConfig, session, filesStats, isAdmin } = useStore(appStore)

      const [webConfigData, setWebConfigData] = useState<WebConfig>(webConfig)
      // const [usedStorage, _setUsedStorage] = useState<number>(0)
      // const [totalStorage, _setTotalStorage] = useState<number>(maxUserFileSizeForUpload)
      const [usagePercentage, setUsagePercentage] = useState<number>(0)
      // let usedStorage =0; // GB
      // const totalStorage = maxUserFileSizeForUpload //5; // GB
      // const usagePercentage = (usedStorage / totalStorage) * 100;

      const { toggleSidebar } = useSidebar()

      // const calcukateStorage = () => {
      //       if (files.fileData.length == 0) {
      //             return
      //       }
      //       let usedStorageByUser = 0
      //       for (const item of files.fileData) {
      //             const mainFileObject = getAquaTreeFileObject(item)
      //             usedStorageByUser += mainFileObject?.fileSize ?? 0
      //       }
      //       setUsedStorage(usedStorageByUser)

      //       const usagePercentage = (usedStorageByUser / totalStorage) * 100
      //       setUsagePercentage(usagePercentage)
      // }
      // React.useEffect(() => {
      //       calcukateStorage()

      //       if (!webConfig.BACKEND_URL || webConfig.BACKEND_URL == "BACKEND_URL_PLACEHOLDER") {
      //             (async () => {
      //                   const config: WebConfig = await fetch('/config.json').then(res => res.json())
      //                   setWebConfig(config)
      //                   setWebConfigData(config)
      //             })()
      //       }
      // }, [])

      // React.useEffect(() => {
      //       calcukateStorage()
      // }, [files])

      React.useEffect(() => {
            if (webConfig.BACKEND_URL) {
                  setWebConfigData(webConfig)
            }

         
      }, [webConfig.BACKEND_URL])


         React.useEffect(() => {
           
            const totalStorage = maxUserFileSizeForUpload //5; // GB
      const usagePercentage = (filesStats.storageUsed / totalStorage) * 100;

      setUsagePercentage(usagePercentage)
      }, [filesStats.filesCount, JSON.stringify(filesStats)])

      const sidebarItems = [
            // { icon: FaHome, label: 'Home', id: "/home" },
            { icon: FileText, label: 'All files', id: '/' },
            // { icon: Workflow, label: 'Workflows', id: '/files_workflows' },
            { icon: LayoutTemplate, label: 'Templates', id: '/templates' },
            { icon: Share2, label: 'Shared files', id: '/shared-contracts' },
      ]

      const quickAccessItems = [
            { label: 'Info', icon: Star, id: '/info' },
            { label: 'Settings', icon: Settings, id: '/settings' },
      ]

      const billingItems = [
            { label: 'Subscription', icon: CreditCard, id: '/subscription' },
            { label: 'Payment History', icon: Receipt, id: '/billing/history' },
            { label: 'Pricing', icon: DollarSign, id: '/pricing' },
      ]

      const applicationsItems = [
            // { label: 'Create AquaSign', icon: Signature, id: "/form-instance/aqua_sign" },
            {
                  label: 'AquaSign - PDF Signature',
                  icon: Workflow,
                  id: '/workflows'
            },
            {
                  label: 'AquaID - Claims & Attestation',
                  icon: Link,
                  id: '/claims_and_attestation',
            },
            {
                  label: 'Contact List',
                  icon: Contact,
                  id: '/contact_list',
            },
            {
                  label: 'ENS Resolver',
                  icon: Link2,
                  id: '/ens_resolver',
            },
            {
                  label: 'User Dashboard',
                  icon: LayoutDashboard,
                  id: '/dashboard',
            },
      ]

      const getLogoUrl = (config: WebConfig): string | undefined => {
            if (typeof config.CUSTOM_LOGO_URL === 'string') {
                  // config.CUSTOM_LOGO_URL != "true"
                  if (config.CUSTOM_LOGO_URL.startsWith('http://') || config.CUSTOM_LOGO_URL.startsWith('https://') || config.CUSTOM_LOGO_URL.startsWith('/')) {
                        return config.CUSTOM_LOGO_URL;
                  }
                  if (config.CUSTOM_LOGO_URL === "true") {
                        return undefined;
                  }
                  return '/images/logo.png';
            }
            if (!config.CUSTOM_LOGO_URL) {
                  return '/images/logo.png';
            }
            return undefined; // when it's boolean
      };


      return (
            <Sidebar {...props}>
                  <SidebarHeader>
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
                                    {
                                          getLogoUrl(webConfigData) && (
                                                <img className="h-[36px]" src={getLogoUrl(webConfigData)} />
                                          )
                                    }

                              </a>
                        </div>
                  </SidebarHeader>
                  <SidebarContent className="gap-0">
                        <div className="flex-1 p-4">
                              <nav className="space-y-2">
                                    <div className='my-3' />
                                    {sidebarItems.map((item, index) => (
                                          <CustomNavLink
                                                key={`app_${index}`}
                                                item={{ ...item, id: `/app${item.id}` }}
                                                index={index}
                                                callBack={() => {
                                                      const isMobileView = window.innerWidth < 768 // md breakpoint is 768px
                                                      if (isMobileView) {
                                                            toggleSidebar()
                                                      }
                                                }}
                                          />
                                    ))}
                              </nav>

                              {/* Applications */}
                              <div className="mt-8">
                                    <div className="flex items-center justify-between mb-3">
                                          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</h3>
                                          {/* <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" /> */}
                                    </div>
                                    <div className="space-y-2">
                                          {applicationsItems.map((item, index) => (
                                                <CustomNavLink
                                                      key={`application_${index}`}
                                                      item={{ ...item, id: `/app${item.id}` }}
                                                      index={index}
                                                      callBack={() => {
                                                            const isMobileView = window.innerWidth < 768 // md breakpoint is 768px
                                                            if (isMobileView) {
                                                                  toggleSidebar()
                                                            }
                                                      }}
                                                />
                                          ))}
                                          <CustomNavLink
                                                item={{ label: 'Identity Profile', icon: User, id: `/app/claims/workflow/${session?.address}` }}
                                                index={10}
                                                callBack={() => {
                                                      const isMobileView = window.innerWidth < 768 // md breakpoint is 768px
                                                      if (isMobileView) {
                                                            toggleSidebar()
                                                      }
                                                }}
                                          />
                                    </div>
                              </div>

                              {/* Admin Section */}
                              {isAdmin && (
                                    <div className="mt-8">
                                          <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</h3>
                                          </div>
                                          <div className="space-y-2">
                                                <CustomNavLink
                                                      item={{ label: 'Admin Dashboard', icon: Shield, id: '/app/admin/dashboard' }}
                                                      index={20}
                                                      callBack={() => {
                                                            const isMobileView = window.innerWidth < 768
                                                            if (isMobileView) {
                                                                  toggleSidebar()
                                                            }
                                                      }}
                                                />
                                          </div>
                                    </div>
                              )}

                              {/* Billing & Subscription */}
                              <div className="mt-8">
                                    <div className="flex items-center justify-between mb-3">
                                          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</h3>
                                    </div>
                                    <div className="space-y-2">
                                          {billingItems.map((item, index) => (
                                                <CustomNavLink
                                                      key={`billing_${index}`}
                                                      item={{ ...item, id: `/app${item.id}` }}
                                                      index={index}
                                                      callBack={() => {
                                                            const isMobileView = window.innerWidth < 768 // md breakpoint is 768px
                                                            if (isMobileView) {
                                                                  toggleSidebar()
                                                            }
                                                      }}
                                                />
                                          ))}
                                    </div>
                              </div>

                              {/* General */}
                              <div className="mt-8">
                                    <div className="flex items-center justify-between mb-3">
                                          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">General</h3>
                                    </div>
                                    <div className="space-y-2">
                                          {quickAccessItems.map((item, index) => (
                                                <CustomNavLink
                                                      key={`general_${index}`}
                                                      item={{ ...item, id: `/app${item.id}` }}
                                                      index={index}
                                                      callBack={() => {
                                                            const isMobileView = window.innerWidth < 768 // md breakpoint is 768px
                                                            if (isMobileView) {
                                                                  toggleSidebar()
                                                            }
                                                      }}
                                                />
                                          ))}
                                    </div>
                              </div>
                        </div>
                  </SidebarContent>

                  {/* Bottom section */}
                  <SidebarFooter>
                        <div className="p-4 border-t border-gray-200" onClick={() => {
                              setOpenDialog({
                                    dialogType: 'early_bird_offer',
                                    isOpen: true,
                                    onClose: () => setOpenDialog(null),
                                    onConfirm: () => {
                                          // Handle confirmation logic here
                                    }
                              })
                        }}>
                              {filesStats.filesCount > 0 ? (
                                    <>
                                          <div className="bg-gray-50 p-4 rounded-lg">
                                                {/* Storage Header */}
                                                <h3 className="text-sm font-medium text-gray-900 mb-3">Storage</h3>

                                                {/* Progress Bar */}
                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                                      <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${usagePercentage}%` }}></div>
                                                </div>

                                                {/* Storage Details */}
                                                <div className="text-sm text-gray-600">
                                                      <span className="text-blue-600 underline">{formatBytes(filesStats.storageUsed, 2, true)} </span> used of {formatBytes(maxUserFileSizeForUpload, 2, true)} ({Math.round(usagePercentage)}%)
                                                </div>
                                          </div>
                                    </>
                              ) : (
                                    <></>
                              )}

                              {/* <div className="bg-gray-900 text-white p-3 rounded-md" >
                                    <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium">Get started</span>
                                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">25% off</span>
                                    </div>
                                    <p className="text-xs text-gray-300">Give it a try today,</p>
                              </div> */}
                        </div>
                  </SidebarFooter>

                  <SidebarRail />
            </Sidebar>
      )
}
