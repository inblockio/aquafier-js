import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/shadcn/ui/sidebar"
import CustomNavLink from "./shadcn/common/CustomNavLink"
import {
  Plus,
  Share2,
  Star,
  FileText,
  Settings,
  LayoutTemplate,
  Workflow,
  Signature,
  Link
} from 'lucide-react';
import { maxUserFileSizeForUpload } from "@/utils/constants";
import { formatBytes, getAquaTreeFileObject } from "@/utils/functions";
import { useStore } from "zustand";
import appStore from "@/store";
import { useState } from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { files } = useStore(appStore)

  const [usedStorage, setUsedStorage] = useState<number>(0)
  const [totalStorage, _setTotalStorage] = useState<number>(maxUserFileSizeForUpload)
  const [usagePercentage, setUsagePercentage] = useState<number>(0)
  // let usedStorage =0; // GB
  // const totalStorage = maxUserFileSizeForUpload //5; // GB
  // const usagePercentage = (usedStorage / totalStorage) * 100;

  const calcukateStorage = () => {
    if (files.length == 0) {
      return
    }
    let usedStorageByUser = 0
    for (let item of files) {
      let mainFileObject = getAquaTreeFileObject(item)
      usedStorageByUser += mainFileObject?.fileSize ?? 0
    }
    setUsedStorage(usedStorageByUser)

     const usagePercentage = (usedStorageByUser / totalStorage) * 100;
     setUsagePercentage(usagePercentage)
  }
  React.useEffect(() => {
    calcukateStorage()
  }, [])


  React.useEffect(() => {
    calcukateStorage()
  }, [files])

  const sidebarItems = [
    { icon: FileText, label: 'All files', id: "/files" },
    { icon: Workflow, label: 'Workflows', id: "/files/files_workflows" },
    { icon: LayoutTemplate, label: 'Templates', id: "/files/files_templates" },
    { icon: Share2, label: 'Shared files', id: "/files/files_shared" },
  ];

  const quickAccessItems = [
    { label: 'Info', icon: Star, id: "/files/files_info" },
    { label: 'Settings', icon: Settings, id: "/files/files_settings" }
  ];

  const applicationsItems = [
    { label: 'Document Signature', icon: Signature, id: "/files/form-instance/aqua_sign" },
    { label: 'Domain Attestation', icon: Link, id: "/files/domain_attestation/aqua_attest" }
  ];

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center space-x-2">
          <a href="/" data-discover="true" style={{ height: '100%', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img className="h-[36px]" src="/images/logo.png" />
          </a>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item, index) => (
              <CustomNavLink key={`app_${index}`} item={item} index={index} />
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
                <CustomNavLink key={`application_${index}`} item={item} index={index} />
              ))}
            </div>
          </div>

          {/* General */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                General
              </h3>
            </div>
            <div className="space-y-2">
              {quickAccessItems.map((item, index) => (
                <CustomNavLink key={`general_${index}`} item={item} index={index} />
              ))}
            </div>
          </div>
        </div>
      </SidebarContent>

      {/* Bottom section */}
      <SidebarFooter>
        <div className="p-4 border-t border-gray-200">

          {
            files.length > 0 ? <>

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
                  <span className="text-blue-600 underline">{formatBytes(usedStorage)} </span> used of {formatBytes(totalStorage)}  ({Math.round(usagePercentage)}%)
                </div>
              </div>
            </> : <></>
          }


          <div className="bg-gray-900 text-white p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Get started</span>
              <span className="text-xs bg-gray-700 px-2 py-1 rounded">25% off</span>
            </div>
            <p className="text-xs text-gray-300">
              Give it a try today
            </p>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
