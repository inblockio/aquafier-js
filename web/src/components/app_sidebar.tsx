import * as React from 'react'
import { useState } from 'react'

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from '@/components/ui/sidebar'
import CustomNavLink from './ui/CustomNavLink'
import { Contact, FileText, LayoutDashboard, LayoutTemplate, Link, Link2, Settings, Share2, Star, User, Workflow, CreditCard, Receipt, DollarSign, Shield, FileCheck } from 'lucide-react'
import { maxUserFileSizeForUpload } from '@/utils/constants'
import { formatBytes } from '@/utils/functions'
import { useStore } from 'zustand'
import appStore from '@/store'
import { WebConfig } from '@/types/types'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
      const { webConfig, session, filesStats, isAdmin } = useStore(appStore)

      const [webConfigData, setWebConfigData] = useState<WebConfig>(webConfig)
      const { toggleSidebar } = useSidebar()

      const { usage, limits, percentageUsed, setUsage } = useSubscriptionStore()

      // Load usage stats only when session with nonce is available
      React.useEffect(() => {
            if (!session?.nonce) return;
            const loadUsage = async () => {
                  try {
                        const { fetchUsageStats } = await import('@/api/subscriptionApi');
                        const data = await fetchUsageStats();
                        setUsage(data.usage, data.limits, data.percentage_used);
                  } catch (error) {
                        console.error('Failed to load usage stats for sidebar:', error);
                  }
            };
            loadUsage();
      }, [session?.nonce]);

      React.useEffect(() => {
            if (webConfig.BACKEND_URL) {
                  setWebConfigData(webConfig)
            }
      }, [webConfig.BACKEND_URL])

      // Derive values for the storage card
      const currentStorageUsed = usage?.storage_used_gb || 0;
      const currentStorageLimit = limits?.max_storage_gb || maxUserFileSizeForUpload;
      const currentUsagePercentage = percentageUsed?.storage || 0;

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
                  id: '/workflows/aqua_sign'
            },
            {
                  label: 'AquaCerts - Digital Certificates',
                  icon: FileCheck,
                  id: '/workflows/aqua_certificate'
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
                                                <CustomNavLink
                                                      item={{ label: 'Manage Plans', icon: CreditCard, id: '/app/admin/plans' }}
                                                      index={21}
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
                        <div className="p-4 border-t border-gray-200">
                              {/* Always show if we have limits loaded, otherwise fallback to filesStats > 0 check */}
                              {(limits || filesStats.filesCount > 0) && (
                                    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                                          <div className="mb-3 flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Storage</span>
                                                <span className="text-xs font-medium text-gray-900">{Math.round(currentUsagePercentage)}%</span>
                                          </div>

                                          <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                                <div
                                                      className={`h-full rounded-full transition-all duration-500 ease-out ${currentUsagePercentage < 60
                                                            ? 'bg-emerald-500'
                                                            : currentUsagePercentage < 85
                                                                  ? 'bg-amber-500'
                                                                  : 'bg-rose-500'
                                                            }`}
                                                      style={{ width: `${Math.min(currentUsagePercentage, 100)}%` }}
                                                />
                                          </div>

                                          <div className="flex items-end justify-between text-xs">
                                                <div className="flex flex-col">
                                                      <span className="font-semibold text-gray-900">
                                                            {formatBytes(currentStorageUsed * 1024 * 1024 * 1024, 2, true)}
                                                      </span>
                                                      <span className="text-xs text-gray-400">Used</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                      <span className="font-medium text-gray-600">
                                                            {formatBytes(currentStorageLimit * 1024 * 1024 * 1024, 2, true)}
                                                      </span>
                                                      <span className="text-xs text-gray-400">Limit</span>
                                                </div>
                                          </div>
                                    </div>
                              )}
                        </div>
                  </SidebarFooter>

                  <SidebarRail />
            </Sidebar>
      )
}
