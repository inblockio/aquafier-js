import {useStore} from 'zustand'
import appStore from '../store'
import {useEffect, useState} from 'react'
import axios from 'axios'
import VersionDetails from '@/models/VersionDetails'
import {toast} from 'sonner'
import {LuCalendarClock, LuCode, LuExternalLink, LuGithub, LuGlobe, LuShieldCheck, LuTag} from 'react-icons/lu'
import {FaEthereum} from 'react-icons/fa6'
import versionInfo from '../version-info.json'
import {AlertTriangleIcon} from 'lucide-react'

const InfoPage = () => {
      const { backend_url } = useStore(appStore)

      // const [isOpen, setIsOpen] = useState(false);
      const [versionDetails, setVersionDetails] = useState<VersionDetails>({
            backend: '1.2.X',
            frontend: '1.2.X',
            aquifier: '1.2.X',
            protocol: '1.2.X',
      })

      const fetchVersionDetails = async () => {
            try {
                  const url = `${backend_url}/version`

                  const response = await axios.get(url)

                  const res: VersionDetails = await response.data

                  if (response.status === 200) {
                        setVersionDetails(res)
                  }
            } catch (e: unknown) {
                  toast('Error fetching version details')
            }
      }

      useEffect(() => {
            if (!backend_url.includes('0.0.0.0')) {
                  fetchVersionDetails()
            }
      }, [backend_url])

      return (
            <div className="container mx-auto py-3 px-2 sm:px-4">
                  <div className="flex flex-col gap-6">
                        <h3 className="scroll-m-20 text-xl sm:text-2xl font-semibold tracking-tight">Product Infomation</h3>
                        <div>
                              {/* Main content grid */}
                              <div className="grid grid-cols-12 md:grid-cols-6 gap-4 sm:gap-6">
                                    {/* Version info card */}
                                    <div className="col-span-12 md:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 sm:px-6 py-3 sm:py-4">
                                                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                                                      <LuTag className="h-5 w-5 text-primary" />
                                                      Version Information
                                                </h2>
                                          </div>

                                          <div className="p-3 sm:p-6 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      <div className="flex flex-col space-y-1">
                                                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Protocol Version</span>
                                                            <div className="flex items-center gap-2 font-mono bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                  <LuShieldCheck className="h-4 w-4 text-green-500" />
                                                                  <span className="text-xs sm:text-sm">{versionDetails.protocol || 'v1.0.0'}</span>
                                                            </div>
                                                      </div>

                                                      <div className="flex flex-col space-y-1">
                                                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Build Date</span>
                                                            <div className="flex items-center gap-2 font-mono bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                  <LuCalendarClock className="h-4 w-4 text-blue-500" />
                                                                  <span className="text-xs sm:text-sm">{versionInfo.buildDate || '2025-07-01'}</span>
                                                            </div>
                                                      </div>

                                                      <div className="flex flex-col space-y-1 md:col-span-2">
                                                            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Commit Hash</span>
                                                            <div className="flex items-center gap-2 font-mono bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto text-xs sm:text-sm">
                                                                  <LuCode className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                                  <span className="truncate text-xs sm:text-sm">{versionInfo?.commitHash || '8f7e9d6b3a1c5f2e0d4b8a7c6e9d2f1b5a3c8e7d'}</span>
                                                            </div>
                                                      </div>
                                                </div>
                                          </div>
                                    </div>

                                    {/* Network info card */}
                                    <div className="col-span-12 md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 sm:px-6 py-3 sm:py-4">
                                                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                                                      <FaEthereum className="h-5 w-5 text-primary" />
                                                      Network
                                                </h2>
                                          </div>

                                          <div className="p-3 sm:p-6 space-y-4">
                                                <div className="flex flex-col space-y-1">
                                                      <span className="text-sm text-gray-500 dark:text-gray-400">Connected Network</span>
                                                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm sm:text-base">
                                                            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                                                            <span className="font-medium">Ethereum Mainnet</span>
                                                      </div>
                                                </div>

                                                <div className="flex flex-col space-y-1">
                                                      <span className="text-sm text-gray-500 dark:text-gray-400">Chain ID</span>
                                                      <div className="font-mono bg-gray-50 dark:bg-gray-800/80 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm sm:text-base">1</div>
                                                </div>
                                          </div>
                                    </div>

                                    {/* Warning alert */}
                                    <div className="col-span-12 md:col-span-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3 max-w-full">
                                          <div className="bg-red-100/0 dark:bg-red-800/30 p-1 rounded">
                                                <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                                          </div>
                                          <div>
                                                <h3 className="font-medium text-red-800 dark:text-red-300 text-sm sm:text-base">Prototype Software</h3>
                                                <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 mt-1 break-words">
                                                      This is prototype software. Please use it with caution as it may contain bugs or security vulnerabilities.
                                                </p>
                                          </div>
                                    </div>

                                    {/* GitHub Issue Card */}
                                    <div className="col-span-12 md:col-span-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 sm:p-4">
                                          <div className="flex items-start gap-2 sm:gap-3">
                                                <div className="bg-blue-100 dark:bg-blue-800/30 p-1 rounded">
                                                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                      </svg>
                                                </div>
                                                <div className="flex-1">
                                                      <h3 className="font-medium text-blue-800 dark:text-blue-300 text-sm sm:text-base mb-2">Found an Issue?</h3>
                                                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 mb-3">
                                                            Help us improve by reporting bugs, suggesting features, or asking questions on GitHub.
                                                      </p>
                                                      <a
                                                            href="https://github.com/inblockio/aquafier-js/issues/new"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                                      >
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                                            </svg>
                                                            Open Issue in GitHub
                                                      </a>
                                                </div>
                                          </div>
                                    </div>

                                    {/* Company info */}
                                    <div className="col-span-12 md:col-span-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 sm:px-6 py-3 sm:py-4">
                                                <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                                                      <LuGlobe className="h-5 w-5 text-primary" />
                                                      About
                                                </h2>
                                          </div>

                                          <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                                                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                                                      This software is developed by{' '}
                                                      <a
                                                            href="https://inblock.io/"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-primary hover:text-primary/80 font-medium inline-flex items-center"
                                                      >
                                                            inblock.io <LuExternalLink className="ml-1 h-3 w-3" />
                                                      </a>{' '}
                                                      assets GmbH.
                                                </p>

                                                <div className="flex flex-wrap gap-2 sm:gap-4">
                                                      <a
                                                            href="https://github.com/inblockio"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 sm:gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors text-sm"
                                                      >
                                                            <LuGithub className="h-5 w-5" />
                                                            Source Code
                                                      </a>

                                                      <a
                                                            href="https://inblock.io/"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 sm:gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors text-sm"
                                                      >
                                                            <LuGlobe className="h-5 w-5" />
                                                            Website
                                                      </a>
<a
                                                            href="https://aqua-protocol.org/"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 sm:gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors text-sm"
                                                      >
                                                           <img className="h-[36px]" src="/images/ico.png" />
                                                            Powered by Aqua Protocol
                                                      </a>


                                                      
                                                </div>
                                          </div>
                                    </div>
                              </div>

                              {/* Footer */}
                              <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    &copy; {new Date().getFullYear()} inblock.io assets GmbH. All rights reserved.
                              </div>
                        </div>
                  </div>
            </div>
      )
}

export default InfoPage
