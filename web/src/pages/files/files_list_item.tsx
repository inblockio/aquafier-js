import { ApiFileInfo } from '@/models/FileInfo'

import {
      capitalizeWords,
      displayTime,
      formatBytes,
      getAquaTreeFileName,
      getAquaTreeFileObject,
      getFileCategory,
      getFileExtension,
      getGenesisHash,
      isWorkFlowData
} from '@/utils/functions'
import { FileObject } from 'aqua-js-sdk'
import { FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '@/store'
import { FilesListProps } from '@/types/types'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import ClaimExtraInfo from './ClaimExtraInfo'
import WorkflowActions from './WorkflowActions'

export default function FilesListItem({
      showWorkFlowsOnly,
      file,
      index,
      systemAquaFileNames,
      backendUrl,
      nonce,
      viewMode = 'table',
      filesListProps
}: {
      showFileActions: boolean //diabled
      showWorkFlowsOnly: boolean
      file: ApiFileInfo
      index: number
      systemFileInfo: ApiFileInfo[]
      systemAquaFileNames: string[]
      backendUrl: string
      nonce: string
      viewMode?: 'table' | 'card' | 'actions-only'
      filesListProps: FilesListProps
}) {
      // const [_selectedFiles, setSelectedFiles] = useState<number[]>([]);
      const { setSelectedFileInfo, setOpenDialog } = useStore(appStore)
      const [currentFileObject, setCurrentFileObject] = useState<FileObject | undefined>(undefined)
      const [workflowInfo, setWorkFlowInfo] = useState<{ isWorkFlow: boolean; workFlow: string } | undefined>(undefined)

      const prepareAquaTreeForRendering = () => {
            if (systemAquaFileNames.length === 0) {
                  return
            }
            // console.log('systemAquaFileNames', systemAquaFileNames)
            const fileObject = getAquaTreeFileObject(file)
            setCurrentFileObject(fileObject)
            const workFlow = isWorkFlowData(file.aquaTree!, systemAquaFileNames)
            // console.log('workFlow', workFlow)
            setWorkFlowInfo(workFlow)
      }

      useEffect(() => {
            prepareAquaTreeForRendering()
      }, [systemAquaFileNames, file])

      const getFileInfo = () => {
            if (currentFileObject) {
                  return formatBytes(currentFileObject.fileSize ?? 0)
            } else {
                  return 'Not available'
            }
      }
      const getTimeInfo = () => {
            const genRevision = getGenesisHash(file.aquaTree!)
            if (genRevision) {
                  const timestamp = file.aquaTree?.revisions?.[genRevision]?.local_timestamp
                  if (timestamp) {
                        return displayTime(timestamp)
                  }
            } else {
                  return 'Not available'
            }
      }

      const renderTableView = () => {


            if (filesListProps.activeFile) {
                  if (getGenesisHash(filesListProps.activeFile.aquaTree!) == getGenesisHash(file.aquaTree!)) {
                        return null
                  }
            }
            return (
                  <tr key={index} onClick={(e) => {
                        if (filesListProps.showCheckbox != null && filesListProps.showCheckbox == true) {
                              // do nothing
                              e.stopPropagation();

                              let allGnesisHashes = filesListProps.selectedFiles.map(file => getGenesisHash(file.aquaTree!))
                              if (allGnesisHashes.includes(getGenesisHash(file.aquaTree!))) {
                                    // already selected, so deselect
                                    filesListProps.onFileDeSelected(file)
                              } else {
                                    // not selected, so select
                                    if (!showWorkFlowsOnly && workflowInfo?.isWorkFlow && workflowInfo.workFlow == 'aqua_sign') {

                                          toast.error("AquaSign - PDF Signature cannot be selected", {
                                                duration: 1500,
                                          })
                                          // do not allow selection of  AquaSign - PDF Signature
                                          return
                                    }
                                    filesListProps.onFileSelected(file)
                              }
                              return;
                        }
                  }} className="border-b border-gray-100 hover:bg-gray-50">
                        {filesListProps.showCheckbox != null && filesListProps.showCheckbox == true ? <td>

                              <div className="pt-0.5">
                                    <Checkbox
                                          id={`file-${index}`}
                                          checked={filesListProps.selectedFiles.map(file => getGenesisHash(file.aquaTree!)).includes(getGenesisHash(file.aquaTree!))}
                                          onCheckedChange={(checked: boolean) => {
                                                if (checked === true) {
                                                      // setLinkItem(itemLoop)
                                                      if (!showWorkFlowsOnly && workflowInfo?.isWorkFlow && workflowInfo.workFlow == 'aqua_sign') {
                                                            toast.error("AquaSign - PDF Signature cannot be selected")
                                                            // do not allow selection of  aqua sign workflows
                                                            return
                                                      } else {
                                                            filesListProps.onFileSelected(file)
                                                      }
                                                } else {
                                                      // setLinkItem(null)
                                                      filesListProps.onFileDeSelected(file)
                                                }
                                          }}
                                    />
                              </div>
                        </td> : null

                        }
                        <td className="py-3 flex items-center px-4" onClick={(e) => {
                              e.preventDefault()
                              console.log(`view mode ${viewMode}  ==  filesListProps.showCheckbox ${filesListProps.showCheckbox}`)
                              if (viewMode === "table" && (filesListProps.showCheckbox == null || filesListProps.showCheckbox == false)) {
                                    setSelectedFileInfo(file)
                                    setOpenDialog({ dialogType: 'aqua_file_details', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                              }
                        }}>
                              {/* <FileText className="w-5 h-5 text-blue-500" /> */}
                              <div className="flex flex-col">
                                    <span className="font-medium text-sm">{getAquaTreeFileName(file.aquaTree!)}</span>
                                    {!showWorkFlowsOnly && workflowInfo?.isWorkFlow ? (
                                          <div className='mt-1'>
                                                <span className="text-xs text-gray-500">Workflow : {capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' '))}</span>
                                                <ClaimExtraInfo file={file} workflowInfo={workflowInfo} />
                                          </div>
                                    ) : null}
                              </div>
                        </td>

                        {showWorkFlowsOnly ? <td className="py-3 px-3 text-sm text-gray-500" onClick={(e) => {
                              e.preventDefault()


                              if (viewMode === "table" && (filesListProps.showCheckbox == null || filesListProps.showCheckbox == false)) {
                                    setSelectedFileInfo(file)
                                    setOpenDialog({ dialogType: 'aqua_file_details', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                              }

                        }}>{workflowInfo?.workFlow || 'Not a workflow'}</td> : null}
                        <td className="py-3 text-sm text-gray-500" onClick={(e) => {
                              e.preventDefault()
                              if (viewMode === "table" && (filesListProps.showCheckbox == null || filesListProps.showCheckbox == false)) {
                                    setSelectedFileInfo(file)
                                    setOpenDialog({ dialogType: 'aqua_file_details', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                              }
                        }}>{getFileCategory(getFileExtension(getAquaTreeFileName(file.aquaTree!)))}</td>
                        <td className="py-3 text-sm text-gray-500" onClick={(e) => {
                              e.preventDefault()
                              if (viewMode === "table" && (filesListProps.showCheckbox == null || filesListProps.showCheckbox == false)) {
                                    setSelectedFileInfo(file)
                                    setOpenDialog({ dialogType: 'aqua_file_details', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                              }
                        }}>
                              {(() => {
                                    const genRevision = getGenesisHash(file.aquaTree!)
                                    if (genRevision) {
                                          const timestamp = file.aquaTree?.revisions?.[genRevision]?.local_timestamp
                                          if (timestamp) {
                                                return displayTime(timestamp)
                                          }
                                    }
                                    return 'Not available'
                              })()}
                        </td>
                        <td className="py-3 text-sm text-gray-500" onClick={(e) => {
                              e.preventDefault()
                              if (viewMode === "table" && (filesListProps.showCheckbox == null || filesListProps.showCheckbox == false)) {
                                    setSelectedFileInfo(file)
                                    setOpenDialog({ dialogType: 'aqua_file_details', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                              }
                        }}>
                              {(() => {
                                    const fileObject = getAquaTreeFileObject(file)
                                    if (fileObject) {
                                          return formatBytes(fileObject.fileSize ?? 0)
                                    }
                                    return 'Not available'
                              })()}
                        </td>
                        <td className="py-3 align-center justify-center flex">
                              <WorkflowActions
                                    file={file}
                                    index={index}
                                    backendUrl={backendUrl}
                                    nonce={nonce}
                                    workflowInfo={workflowInfo}
                                    filesListProps={filesListProps}
                              />
                        </td>
                  </tr>
            )
      }

      const renderCardView = () => {
            return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                        {/* Header with file icon and name */}
                        <div className="flex items-start space-x-3 mb-4">
                              <div className="shrink-0">
                                    <FileText className="w-8 h-8 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">
                                          {getAquaTreeFileName(file.aquaTree!)}
                                    </h3>
                                    {!showWorkFlowsOnly && workflowInfo?.isWorkFlow && (


                                          <>
                                                <p className="text-sm text-blue-600 mt-1">
                                                      Workflow: {capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' '))}
                                                </p>


                                          </>
                                    )}
                              </div>
                        </div>

                        {/* File details grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
                                    <p className="text-sm text-gray-900 font-medium">
                                          {getFileCategory(getFileExtension(getAquaTreeFileName(file.aquaTree!)))}
                                    </p>
                              </div>
                              <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Size</p>
                                    <p className="text-sm text-gray-900 font-medium">{getFileInfo()}</p>
                              </div>
                              <div className="col-span-2 space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded</p>
                                    <p className="text-sm text-gray-900">{getTimeInfo()}</p>
                              </div>
                              {showWorkFlowsOnly && (
                                    <div className="col-span-2 space-y-1">
                                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workflow Type</p>
                                          <p className="text-sm text-gray-900 font-medium">
                                                {workflowInfo?.workFlow ? capitalizeWords(workflowInfo.workFlow.replace(/_/g, ' ')) : 'Not a workflow'}
                                          </p>
                                    </div>
                              )}
                        </div>

                        {/* Actions section */}
                        <div className="border-t border-gray-100 pt-4">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Actions</p>
                              <div className="flex flex-wrap gap-2">
                                    <WorkflowActions
                                          file={file}
                                          index={index}
                                          backendUrl={backendUrl}
                                          nonce={nonce}
                                          workflowInfo={workflowInfo}
                                          filesListProps={filesListProps}
                                    />
                              </div>
                        </div>
                  </div>
            )
      }

      if (workflowInfo === undefined) {
            return null
      }
      if (showWorkFlowsOnly && !workflowInfo?.isWorkFlow) {
            return null
      }

      // Then handle different view modes
      if (viewMode === 'table') {
            return renderTableView()
      } else if (viewMode === 'card') {
            return renderCardView()
      } else if (viewMode === 'actions-only') {
            return <WorkflowActions
                  file={file}
                  index={index}
                  backendUrl={backendUrl}
                  nonce={nonce}
                  workflowInfo={undefined}
                  filesListProps={{ ...filesListProps, showFileActions: true }}
            />
      }

      return null

}
