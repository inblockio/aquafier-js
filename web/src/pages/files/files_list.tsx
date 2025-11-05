import { useEffect, useState } from 'react'
import { Filter, Grid3X3, List, X } from 'lucide-react'
import { getAquaTreeFileName, isWorkFlowData } from '@/utils/functions'

import { useStore } from 'zustand'
import appStore from '../../store'
import { ApiFileInfo } from '@/models/FileInfo'
import { emptyUserStats, FilesListProps, IUserStats } from '@/types/types'
import axios from 'axios'
import { API_ENDPOINTS } from '@/utils/constants'
import WorkflowSpecificTable from './WorkflowSpecificTable'
import { useReloadWatcher } from '@/hooks/useReloadWatcher'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'

export default function FilesList(filesListProps: FilesListProps) {
      const [view, setView] = useState<'table' | 'card'>('table')
      const [isSmallScreen, setIsSmallScreen] = useState(false)
      const [uniqueWorkflows, setUniqueWorkflows] = useState<{ name: string, count: number }[]>([])
      const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all') //aqua_files
      const [stats, setStats] = useState<IUserStats>(emptyUserStats)

      const [systemAquaFileNames, setSystemAquaFileNames] = useState<string[]>([])

      // Filter states
      const [showFilterModal, setShowFilterModal] = useState(false)
      const [selectedFilters, setSelectedFilters] = useState<string[]>(['all'])
      const [tempSelectedFilters, setTempSelectedFilters] = useState<string[]>(['all'])

      const { files, systemFileInfo, backend_url, session } = useStore(appStore)

      const loadSystemAquaFileNames = async () => {
            if (!session?.nonce) return
            try {
                  const response = await axios.get(`${backend_url}/${API_ENDPOINTS.SYSTEM_AQUA_FILES_NAMES}`, {
                        headers: {
                              'nonce': session.nonce,
                              'metamask_address': session.address
                        }
                  })
                  setSystemAquaFileNames(response.data.data)
            } catch (error) {
                  console.log("Error getting system aqua file names", error)
            }
      }

      // Add screen size detector
      useEffect(() => {
            const checkScreenSize = () => {
                  setIsSmallScreen(window.matchMedia('(max-width: 768px)').matches)
            }

            checkScreenSize()
            window.addEventListener('resize', checkScreenSize)

            return () => {
                  window.removeEventListener('resize', checkScreenSize)
            }
      }, [])

      const getUserStats = async () => {
            if (session) {
                  try {
                        let result = await axios.get(`${backend_url}/${API_ENDPOINTS.USER_STATS}`, {
                              headers: {
                                    'nonce': session.nonce,
                                    'metamask_address': session.address
                              }
                        })
                        setStats(result.data)
                        let uniqueWorkflows = new Set<{ name: string; count: number }>()
                        let claimTypeCounts = result.data.claimTypeCounts
                        const claimTypes = Object.keys(claimTypeCounts)
                        for (let i = 0; i < claimTypes.length; i++) {
                              let claimType = claimTypes[i]
                              if (parseInt(claimTypeCounts[claimType]) > 0) {
                                    uniqueWorkflows.add({ name: claimType, count: parseInt(claimTypeCounts[claimType]) })
                              }
                        }
                        setUniqueWorkflows(Array.from(uniqueWorkflows))
                  } catch (error) {
                        console.log("Error getting stats", error)
                  }
            }
      }


      // Upgraded way of identifying different workflows based on user stats endpoint
      useEffect(() => {
            if (session?.nonce) {
                  getUserStats()
                  loadSystemAquaFileNames()
            }
      }, [session?.address, session?.nonce])

      // Watch for stats reload triggers
      useReloadWatcher({
            key: RELOAD_KEYS.user_stats,
            onReload: () => {
                  console.log('Reloading user stats...');
                  getUserStats();
            }
      });

      // Filter files based on selected filters AND selected workflow
      const getFilteredFiles = (): ApiFileInfo[] => {
            let filteredByFilters = files.fileData;

            if (!selectedFilters.includes('all')) {
                  const someData = systemFileInfo.map(e => {
                        try {
                              return getAquaTreeFileName(e.aquaTree!)
                        } catch (e) {
                              return ''
                        }
                  })

                  filteredByFilters = files.fileData.filter(file => {
                        try {
                              const workFlow = isWorkFlowData(file.aquaTree!, someData)

                              if (workFlow.isWorkFlow && workFlow.workFlow) {
                                    return selectedFilters.includes(workFlow.workFlow)
                              } else {
                                    return selectedFilters.includes('aqua_files')
                              }
                        } catch (e) {
                              return false
                        }
                  })
            }

            if (selectedFilters.includes('all') && selectedWorkflow !== 'all') {
                  const someData = systemFileInfo.map(e => {
                        try {
                              return getAquaTreeFileName(e.aquaTree!)
                        } catch (e) {
                              return ''
                        }
                  })

                  filteredByFilters = filteredByFilters.filter(file => {
                        try {
                              const workFlow = isWorkFlowData(file.aquaTree!, someData)

                              if (selectedWorkflow === 'aqua_files') {
                                    return !workFlow.isWorkFlow
                              }

                              return workFlow.isWorkFlow && workFlow.workFlow === selectedWorkflow
                        } catch (e) {
                              return false
                        }
                  })
            }

            return filteredByFilters
      }

      const filteredFiles = getFilteredFiles()

      const capitalizeWords = (str: string): string => {
            return str.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
      }

      const getFilterOptions = () => {
            const options = [
                  { value: 'all', label: 'All Files .', count: files.pagination?.totalItems || 0 },
                  { value: 'aqua_files', label: 'Aqua Files (Non worklows)', count: 0 }
            ]

            const someData = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        console.error('systemFileInfo : Error processing system file:', e);
                        return ''
                  }
            })

            let nonWorkflowCount = 0
            const workflowCounts: { [key: string]: number } = {}

            files.fileData.forEach(file => {
                  try {
                        const workFlow = isWorkFlowData(file.aquaTree!, someData)
                        if (workFlow.isWorkFlow && workFlow.workFlow) {
                              workflowCounts[workFlow.workFlow] = (workflowCounts[workFlow.workFlow] || 0) + 1
                        } else {
                              nonWorkflowCount++
                        }
                  } catch (e) {
                        console.error('files : Error processing system file:', e);
                  }
            })

            options[1].count = nonWorkflowCount

            uniqueWorkflows.forEach(workflow => {
                  options.push({
                        value: workflow.name,
                        label: capitalizeWords(workflow.name.replace(/_/g, ' ')),
                        count: workflow.count ?? 0
                  })
            })

            return options
      }

      const handleFilterChange = (filterValue: string) => {
            if (filterValue === 'all') {
                  setTempSelectedFilters(['all'])
            } else {
                  let newFilters = tempSelectedFilters.filter(f => f !== 'all')

                  if (newFilters.includes(filterValue)) {
                        newFilters = newFilters.filter(f => f !== filterValue)
                  } else {
                        newFilters.push(filterValue)
                  }

                  if (newFilters.length === 0) {
                        newFilters = ['all']
                  }

                  setTempSelectedFilters(newFilters)
            }
      }

      const applyFilters = () => {
            setSelectedFilters(tempSelectedFilters)
            setShowFilterModal(false)
            setSelectedWorkflow('all')
      }

      const resetFilters = () => {
            setTempSelectedFilters(['all'])
            setSelectedFilters(['all'])
            setShowFilterModal(false)
      }

      const getFilteredTitle = () => {
            if (selectedFilters.includes('all')) {
                  return selectedWorkflow === 'all' ? 'All Files ' : capitalizeWords(selectedWorkflow.replace(/_/g, ' '))
            }

            if (selectedFilters.length === 1) {
                  const filter = selectedFilters[0]
                  if (filter === 'aqua_files') {
                        return 'Aqua Files (Non workflow)'
                  }
                  return `${capitalizeWords(filter.replace(/_/g, ' '))} Files`
            }

            return 'Filtered Items'
      }



      const renderWorkflowTabs = () => {
            if (uniqueWorkflows.length === 0 || !selectedFilters.includes('all')) return null

            return (
                  <div className="mb-6">
                        <div className="border-b border-gray-200">
                              <nav className="-mb-px flex space-x-8 overflow-x-auto">

                                    <button
                                          onClick={() => setSelectedWorkflow('all')}
                                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${selectedWorkflow === 'all'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                    >
                                          All Files ({stats.filesCount})
                                    </button>

                                   

                                    {
                                          view === 'table' && uniqueWorkflows.sort((a, b) => a.name.localeCompare(b.name)).map((workflow) => {

                                                return (
                                                      <button
                                                            key={workflow.name}
                                                            onClick={() => setSelectedWorkflow(workflow.name)}
                                                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${selectedWorkflow === workflow.name
                                                                  ? 'border-blue-500 text-blue-600'
                                                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                                  }`}
                                                      >
                                                            {capitalizeWords(workflow.name.replace(/_/g, ' '))} ({workflow.count ?? 0})
                                                      </button>
                                                )
                                          })
                                    }
                              </nav>
                        </div>
                  </div>
            )
      }

      const renderFilterModal = () => {
            if (!showFilterModal) return null

            return (
                  <div className="fixed inset-0 bg-[#00000080] bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-0 md:p-6 w-full max-w-md mx-4">
                              <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Filter Files</h3>
                                    <button
                                          onClick={() => setShowFilterModal(false)}
                                          className="text-gray-400 hover:text-gray-600"
                                    >
                                          <X className="w-5 h-5" />
                                    </button>
                              </div>

                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {getFilterOptions().map((option) => (
                                          <label
                                                key={option.value}
                                                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                          >
                                                <input
                                                      type="checkbox"
                                                      checked={tempSelectedFilters.includes(option.value)}
                                                      onChange={() => handleFilterChange(option.value)}
                                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <span className="flex-1 text-sm text-gray-900">
                                                      {option.label}
                                                </span>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                      {option.count}
                                                </span>
                                          </label>
                                    ))}
                              </div>

                              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                    <button
                                          onClick={resetFilters}
                                          className="text-sm text-gray-600 hover:text-gray-800"
                                    >
                                          Reset
                                    </button>
                                    <div className="flex space-x-3">
                                          <button
                                                onClick={() => setShowFilterModal(false)}
                                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                          >
                                                Cancel
                                          </button>
                                          <button
                                                onClick={applyFilters}
                                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                          >
                                                Apply Filters
                                          </button>
                                    </div>
                              </div>
                        </div>
                  </div>
            )
      }

      return (
            <div>
                  <div className="flex-1">
                        {
                              filesListProps.showHeader == true ? (
                                    <div className="flex items-center justify-between mb-6">
                                          <div className="flex items-center space-x-4">
                                                <h1 className="text-xl font-semibold text-gray-900">
                                                      {getFilteredTitle()}
                                                </h1>
                                                {selectedFilters.includes('all') ? (
                                                      <div className="flex items-center space-x-2">
                                                            <div className="px-3 py-1 bg-gray-100 rounded-full">
                                                                  <span className="text-sm text-gray-600">
                                                                        {files.pagination?.startIndex && files.pagination?.endIndex
                                                                              ? `${files.pagination.startIndex}-${files.pagination.endIndex} of ${files.pagination.totalItems}`
                                                                              : `${files.pagination?.totalItems || 0} items`}
                                                                  </span>
                                                            </div>
                                                      </div>
                                                ) : (
                                                      <div className="px-3 py-1 bg-blue-50 rounded-full">
                                                            <span className="text-sm text-blue-700">
                                                                  {filteredFiles.length} filtered
                                                            </span>
                                                      </div>
                                                )}

                                          </div>
                                          {!isSmallScreen && (
                                                <div className="flex items-center space-x-2">
                                                      <button
                                                            onClick={() => {
                                                                  setTempSelectedFilters(selectedFilters)
                                                                  setShowFilterModal(true)
                                                            }}
                                                            className={`p-2 rounded-md border ${!selectedFilters.includes('all')
                                                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                                  }`}
                                                            title="Filter files"
                                                      >
                                                            <Filter className="w-4 h-4" />
                                                      </button>

                                                      <div className="flex bg-gray-100 rounded-md">
                                                            <button onClick={() => setView('card')} className={`p-2 rounded-md ${view === 'card' ? 'bg-white shadow-sm' : ''}`}>
                                                                  <Grid3X3 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setView('table')} className={`p-2 rounded-md ${view === 'table' ? 'bg-white shadow-sm' : ''}`}>
                                                                  <List className="w-4 h-4" />
                                                            </button>
                                                      </div>
                                                </div>
                                          )}
                                    </div>
                              ) : <div className='mb-6'></div>
                        }

                        {renderWorkflowTabs()}

                        <WorkflowSpecificTable
                              workflowName={selectedWorkflow}
                              view={view}
                              filesListProps={filesListProps}
                              isSmallScreen={isSmallScreen}
                              systemAquaFileNames={systemAquaFileNames}
                        />

                  </div>

                  {renderFilterModal()}
            </div>
      )
}