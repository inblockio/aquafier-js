import { useEffect, useState } from 'react'
import { Grid3X3, List } from 'lucide-react'
import FileListItem from './files_list_item'
import { getAquaTreeFileName, isWorkFlowData } from '@/utils/functions'

import { useStore } from 'zustand'
import appStore from '../store'

export default function FilesListBk() {
      // const [showWorkFlowsOnly, setShowWorkFlowsOnly] = useState(false)
      const [view, setView] = useState<'table' | 'card'>('table')
      const [isSmallScreen, setIsSmallScreen] = useState(false)
      const [uniqueWorkflows, setUniqueWorkflows] = useState<string[]>([])
      const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all')

      const { files, systemFileInfo, backend_url, session } = useStore(appStore)

      // useEffect(() => {
      //       if (location.pathname.endsWith('files_workflows')) {
      //             setShowWorkFlowsOnly(true)
      //       }
      // }, [])

      // useEffect(() => {
      //       if (location.pathname.endsWith('files_workflows')) {
      //             setShowWorkFlowsOnly(true)
      //       }
      //       return () => {
      //             setShowWorkFlowsOnly(false)
      //       }
      // }, [location.pathname])

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
            const someData = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        console.log('Error processing system file')
                        return ''
                  }
            })

            const workflows = new Set<string>()

            files.forEach(file => {
                  try {
                        const workFlow = isWorkFlowData(file.aquaTree!, someData)
                        if (workFlow.isWorkFlow && workFlow.workFlow) {
                              workflows.add(workFlow.workFlow)
                        }
                  } catch (e) {
                        console.log('Error processing workflow data for file:', file)
                  }
            })

            setUniqueWorkflows(Array.from(workflows).sort())
      }, [files, systemFileInfo])

      // Filter files based on selected workflow
      const getFilteredFiles = () => {
            if (selectedWorkflow === 'all') {
                  return files
            }

            const someData = systemFileInfo.map(e => {
                  try {
                        return getAquaTreeFileName(e.aquaTree!)
                  } catch (e) {
                        console.log('Error processing system file')
                        return ''
                  }
            })

            return files.filter(file => {
                  try {
                        const workFlow = isWorkFlowData(file.aquaTree!, someData)
                        return workFlow.isWorkFlow && workFlow.workFlow === selectedWorkflow
                  } catch (e) {
                        console.log('Error filtering file:', file)
                        return false
                  }
            })
      }

      const filteredFiles = getFilteredFiles()

      // Helper function to capitalize workflow names
      const capitalizeWords = (str: string): string => {
            return str.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
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
                                    />
                              )
                        })}
            </div>
      }

      const renderFilesList = () => {
            return <table className="w-full border-collapse">
                  <thead>
                        <tr className="bg-gray-50">
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/3 rounded-tl-md">Name</th>
                              {/* {showWorkFlowsOnly ? <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-24">Workflow Name</th> : null} */}
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-30">Type</th>
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-40">Uploaded At</th>
                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 w-24">File Size</th>
                              <th className="min-w-[370px] py-3 px-4 text-left text-sm font-medium text-gray-700 w-1/4 rounded-tr-md">Actions</th>
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
                                          />
                                    )
                              })}
                  </tbody>
            </table>
      }

      const renderWorkflowTabs = () => {
            if (uniqueWorkflows.length === 0) return null

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
                                          All Files ({files.length})
                                    </button>
                                    {
                                          view == 'table' && <>
                                                {uniqueWorkflows.map((workflow) => {
                                                      const workflowCount = files.filter(file => {
                                                            try {
                                                                  const someData = systemFileInfo.map(e => {
                                                                        try {
                                                                              return getAquaTreeFileName(e.aquaTree!)
                                                                        } catch (e) {
                                                                              return ''
                                                                        }
                                                                  })
                                                                  const workFlow = isWorkFlowData(file.aquaTree!, someData)
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
                                                })}
                                          </>
                                    }

                              </nav>
                        </div>
                  </div>
            )
      }

      return (
            <div>
                  {/* File Content */}
                  <div className="flex-1">
                        {/* File Header */}
                        <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center space-x-4">
                                    <h1 className="text-xl font-semibold text-gray-900">
                                          {selectedWorkflow === 'all'
                                                ? `All files ${view}`
                                                : `${capitalizeWords(selectedWorkflow.replace(/_/g, ' '))} Files`
                                          }
                                    </h1>
                                    <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                                          <span className="text-xs text-gray-600">{filteredFiles.length}</span>
                                    </div>
                              </div>
                              {!isSmallScreen && (
                                    <div className="flex items-center space-x-2">
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

                        {/* Workflow Tabs */}
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
                                                      />
                                                </div>
                                          ))}
                              </div>
                        ) : null}

                        {/* No results message */}
                        {filteredFiles.length === 0 && (
                              <div className="text-center py-12">
                                    <p className="text-gray-500 text-lg">
                                          {selectedWorkflow === 'all'
                                                ? 'No files found.'
                                                : `No files found for ${capitalizeWords(selectedWorkflow.replace(/_/g, ' '))} workflow.`
                                          }
                                    </p>
                              </div>
                        )}
                  </div>
            </div>
      )
}
