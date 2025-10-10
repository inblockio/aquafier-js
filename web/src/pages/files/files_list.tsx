import { useEffect, useState } from 'react'
import { Filter, Grid3X3, List, X } from 'lucide-react'
import FileListItem from './files_list_item'
import { fetchSystemFiles, getAquaTreeFileName, isWorkFlowData } from '@/utils/functions'

import { useStore } from 'zustand'
import appStore from '../../store'
import { ApiFileInfo } from '@/models/FileInfo'
import { FilesListProps } from '@/types/types'

export default function FilesList(filesListProps: FilesListProps) {
      const [view, setView] = useState<'table' | 'card'>('table')
      const [hasFetchedSystemAquaTrees, setHasFetchedSystemAquaTrees] = useState(false)
      const [isSmallScreen, setIsSmallScreen] = useState(false)
      const [uniqueWorkflows, setUniqueWorkflows] = useState<string[]>([])
      const [selectedWorkflow, setSelectedWorkflow] = useState<string>('aqua_files')

      // Filter states
      const [showFilterModal, setShowFilterModal] = useState(false)
      const [selectedFilters, setSelectedFilters] = useState<string[]>(['all'])
      const [tempSelectedFilters, setTempSelectedFilters] = useState<string[]>(['all'])

      const { files, systemFileInfo, backend_url, session, setSystemFileInfo } = useStore(appStore)

      const systemAquaTreeFileNames = systemFileInfo.map(e => {
            try {
                  return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                  return ''
            }
      })

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

      // Extract unique workflows from files
      useEffect(() => {
            if (systemFileInfo.length == 0) {
                  if (!hasFetchedSystemAquaTrees) {
                        setHasFetchedSystemAquaTrees(true);
                        (async () => {
                              const url3 = `${backend_url}/system/aqua_tree`
                              const systemFiles = await fetchSystemFiles(url3, session?.address)
                              setSystemFileInfo(systemFiles)
                        })()
                  }
            } else {


                  const someData = systemFileInfo.map(e => {
                        try {
                              return getAquaTreeFileName(e.aquaTree!)
                        } catch (e) {
                              return ''
                        }
                  })

                  const workflows = new Set<string>()

                  files.fileData.forEach(file => {
                        try {
                              const workFlow = isWorkFlowData(file.aquaTree!, someData)
                              if (workFlow.isWorkFlow && workFlow.workFlow) {
                                    workflows.add(workFlow.workFlow)
                              }
                        } catch (e) {
                        }
                  })

                  setUniqueWorkflows(Array.from(workflows).sort())

            }

            // }, [files.length, systemFileInfo.length])
      }, [files.fileData.map(e => Object.keys(e?.aquaTree?.file_index ?? {})).join(','), systemFileInfo.map(e => Object.keys(e?.aquaTree?.file_index ?? {})).join(',')])




      // Filter files based on selected filters AND selected workflow
      const getFilteredFiles = (): ApiFileInfo[] => {
            // First filter by the modal filters
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

                              // Check if it's a workflow file
                              if (workFlow.isWorkFlow && workFlow.workFlow) {
                                    return selectedFilters.includes(workFlow.workFlow)
                              } else {
                                    // Non-workflow file
                                    return selectedFilters.includes('aqua_files')
                              }
                        } catch (e) {
                              return false
                        }
                  })
            }

            // Then filter by workflow tabs (only if "all" filters are selected)
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

                               // If "aqua_files" tab is selected, show only non-workflow files
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

      // Helper function to capitalize workflow names
      const capitalizeWords = (str: string): string => {
            return str.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
      }

      // Get available filter options
      const getFilterOptions = () => {
            const options = [
                  { value: 'all', label: 'All Files', count: files.fileData.length },
                  { value: 'aqua_files', label: 'Aqua Files (Non worklows)', count: 0 }
            ]

            // Count non-workflow files
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
                        // Handle error
                  }
            })

            options[1].count = nonWorkflowCount

            // Add workflow options
            uniqueWorkflows.forEach(workflow => {
                  options.push({
                        value: workflow,
                        label: capitalizeWords(workflow.replace(/_/g, ' ')),
                        count: workflowCounts[workflow] || 0
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
            setSelectedWorkflow('all') // Reset workflow tabs when using filters
      }

      const resetFilters = () => {
            setTempSelectedFilters(['all'])
            setSelectedFilters(['all'])
            setShowFilterModal(false)
      }

      const getFilteredTitle = () => {
            if (selectedFilters.includes('all')) {
                  // return `All files ${view}`
                  return selectedWorkflow === 'all' ? 'All Files' : capitalizeWords(selectedWorkflow.replace(/_/g, ' '))
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

      const renderFilesListCard = () => {
            return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFiles
                        .sort((a, b) => {
                              const filenameA = getAquaTreeFileName(a.aquaTree!)
                              const filenameB = getAquaTreeFileName(b.aquaTree!)
                              return filenameA.localeCompare(filenameB)
                        })
                        .map((file, index) => {
                              return (
                                    <FileListItem
                                          showWorkFlowsOnly={false}
                                          key={`card-${index}`}
                                          index={index}
                                          file={file}
                                          systemFileInfo={systemFileInfo}
                                          backendUrl={backend_url}
                                          nonce={session?.nonce ?? ''}
                                          viewMode={view}
                                          filesListProps={filesListProps}
                                    />
                              )
                        })}
            </div>
      }

      const renderFilesList = () => {

            let hasUndefined = false
            for (let i = 0; i < filteredFiles.length; i++) {
                  if (filteredFiles[i].aquaTree === undefined) {
                        hasUndefined = true
                        break
                  }
                  if (filteredFiles[i].aquaTree?.revisions === undefined) {
                        hasUndefined = true
                        break
                  }
            }
            if (hasUndefined) {
                  return <div>No files available.</div>

            }
            return <table className="w-full border-collapse">
                  <thead>
                        <tr className="bg-gray-50">
                              {filesListProps.showCheckbox == true ? <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-12 rounded-tl-md"> </th> : null}
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/3 rounded-tl-md">Name</th>
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-30">Type</th>
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-40">Uploaded At</th>
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-24">File Size</th>
                              {filesListProps.showFileActions == true ? <th className="min-w-[370px] py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/4 rounded-tr-md">Actions</th> : null}

                        </tr>
                  </thead>
                  <tbody>
                        {filteredFiles
                              .sort((a, b) => {
                                    const filenameA = getAquaTreeFileName(a.aquaTree!)
                                    const filenameB = getAquaTreeFileName(b.aquaTree!)
                                    return filenameA.localeCompare(filenameB)
                              })
                              .map((file, index) => {
                                    return (
                                          <FileListItem
                                                showWorkFlowsOnly={false}
                                                key={index}
                                                index={index}
                                                file={file}
                                                systemFileInfo={systemFileInfo}
                                                backendUrl={backend_url}
                                                nonce={session?.nonce ?? ''}
                                                viewMode={view}
                                                filesListProps={filesListProps}
                                          />
                                    )
                              })}
                  </tbody>
            </table>
      }

      const renderWorkflowTabs = () => {
            if (uniqueWorkflows.length === 0 || !selectedFilters.includes('all')) return null

            return (
                  <div className="mb-6">
                        <div className="border-b border-gray-200">
                              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                                    <button
                                          onClick={() => setSelectedWorkflow('aqua_files')}
                                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${selectedWorkflow === 'aqua_files'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                    >
                                          Aqua Files ({files.fileData.filter((file) => {
                                                const workFlow = isWorkFlowData(file.aquaTree!, systemAquaTreeFileNames)
                                                // return workFlow.isWorkFlow && workFlow.workFlow === workflow   
                                                if (workFlow && workFlow.isWorkFlow) {
                                                      return null
                                                }
                                                return file
                                          }).length})
                                    </button>


                                    <button
                                          onClick={() => setSelectedWorkflow('all')}
                                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${selectedWorkflow === 'all'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                }`}
                                    >
                                          All Files ({files.fileData.length})
                                    </button>
                                    {
                                          view === 'table' && uniqueWorkflows.map((workflow) => {
                                                const workflowCount = files.fileData.filter(file => {
                                                      try {

                                                            const workFlow = isWorkFlowData(file.aquaTree!, systemAquaTreeFileNames)
                                                            return workFlow.isWorkFlow && workFlow.workFlow === workflow
                                                      } catch (e) {
                                                            return false
                                                      }
                                                }).length

                                                return (
                                                      <button
                                                            key={workflow}
                                                            onClick={() => setSelectedWorkflow(workflow)}
                                                            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${selectedWorkflow === workflow
                                                                  ? 'border-blue-500 text-blue-600'
                                                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                                  }`}
                                                      >
                                                            {capitalizeWords(workflow.replace(/_/g, ' '))} ({workflowCount})
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
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
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
                  {/* File Content */}
                  <div className="flex-1">
                        {/* File Header */}
                        {
                              filesListProps.showHeader == true ? (
                                    <div className="flex items-center justify-between mb-6">
                                          <div className="flex items-center space-x-4">
                                                <h1 className="text-xl font-semibold text-gray-900">
                                                      {getFilteredTitle()}
                                                </h1>
                                                <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                                                      <span className="text-xs text-gray-600">{filteredFiles.length}</span>
                                                </div>
                                          </div>
                                          {!isSmallScreen && (
                                                <div className="flex items-center space-x-2">
                                                      {/* Filter Button */}
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

                                                      {/* View Toggle */}
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


                        {/* Workflow Tabs - Only show when "all" filter is selected */}
                        {renderWorkflowTabs()}

                        {/* Responsive Table */}
                        {!isSmallScreen ? (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="p-1">
                                          {view === 'table' ? renderFilesList() : renderFilesListCard()}
                                    </div>
                              </div>
                        ) : null}

                        {/* Card view for small screens */}
                        {isSmallScreen ? (
                              <div className="space-y-4">
                                    {filteredFiles
                                          .sort((a, b) => {
                                                const filenameA = getAquaTreeFileName(a.aquaTree!)
                                                const filenameB = getAquaTreeFileName(b.aquaTree!)
                                                return filenameA.localeCompare(filenameB)
                                          })
                                          .map((file, index) => (
                                                <div key={`mobile-${index}`} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                                                      <FileListItem
                                                            showWorkFlowsOnly={false}
                                                            key={`mobile-item-${index}`}
                                                            index={index}
                                                            file={file}
                                                            systemFileInfo={systemFileInfo}
                                                            backendUrl={backend_url}
                                                            nonce={session?.nonce ?? ''}
                                                            viewMode={'card'}
                                                            filesListProps={filesListProps}
                                                      />
                                                </div>
                                          ))}
                              </div>
                        ) : null}

                        {/* No results message */}
                        {filteredFiles.length === 0 && (
                              <div className="text-center py-12">
                                    <p className="text-gray-500 text-lg">
                                          No files found for the selected filters.
                                    </p>
                              </div>
                        )}
                  </div>

                  {/* Filter Modal */}
                  {renderFilterModal()}
            </div>
      )
}