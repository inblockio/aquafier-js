import React, { useEffect, useState } from 'react'
import appStore from '../../store'
import { useStore } from 'zustand'
import FilesList from './files_list'
import { AlertCircle, CheckCircle, FileText, FolderPlus, Loader2, Minimize2, Plus, Upload, X } from 'lucide-react'
import { emptyUserStats, FileItemWrapper, IUserStats, UploadStatus } from '@/types/types'
import {
      checkIfFileExistInUserFiles,
      fetchFiles,
      getAquaTreeFileName,
      isAquaTree,
      isJSONFile,
      isJSONKeyValueStringContent,
      isZipFile,
      readFileContent
} from '@/utils/functions'
import { API_ENDPOINTS, maxFileSizeForUpload } from '@/utils/constants'
import axios from 'axios'


import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

// import { CompleteChainView } from './components/files_chain_details';
import { IDrawerStatus } from '@/models/AquaTreeDetails'
import { CompleteChainView } from '@/components/files_chain_details'
import FileDropZone from '@/components/dropzone_file_actions'
import { LuTrash2, LuUpload } from 'react-icons/lu'
import { toast } from 'sonner'
import { ImportAquaTree } from '@/components/dropzone_file_actions/import_aqua_tree'
import { ImportAquaTreeZip } from '@/components/dropzone_file_actions/import_aqua_tree_zip'
import { FormRevisionFile } from '@/components/dropzone_file_actions/form_revision'

import ClaimTypesDropdownButton from '@/components/button_claim_dropdown'

const FilesPage = () => {
      const {
            files,
            setFiles,
            session,
            backend_url,
            selectedFileInfo,
            setSelectedFileInfo,
            setOpenDialog,
            openDialog,
      } = useStore(appStore)
      const fileInputRef = React.useRef<HTMLInputElement>(null)
      const [filesListForUpload, setFilesListForUpload] = useState<FileItemWrapper[]>([])

      // Upload popup state
      const [uploadQueue, setUploadQueue] = useState<UploadStatus[]>([])
      const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
      const [isMinimized, setIsMinimized] = useState(false)

      const [_drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)
      const [stats, setStats] = useState<IUserStats>(emptyUserStats)
      const [loading, setLoading] = useState(false)
      // const [isSelectedFileDialogOpen, setIsSelectedFileDialogOpen] = useState(false)

      // Helper function to clear file input
      const clearFileInput = () => {
            if (fileInputRef.current) {
                  fileInputRef.current.value = ''
            }
      }

      // const [showError, setShowError] = useState(false);

      // useEffect(() => {
      //       if (files.status === 'error') {
      //             const timer = setTimeout(() => {
      //                   setShowError(true);
      //             }, 2000); // Show error after 2 seconds

      //             return () => clearTimeout(timer);
      //       } else {
      //             setShowError(false);
      //       }
      // }, [files.status]);

      const getUserStats = async () => {
            if (!session?.nonce || !session?.address) return
            
            try {
                  setLoading(true)
                  const result = await axios.get(`${backend_url}/${API_ENDPOINTS.USER_STATS}`, {
                        headers: {
                              'nonce': session.nonce,
                              'metamask_address': session.address
                        }
                  })
                  setStats(result.data)
            } catch (error) {
                  console.log("Error getting stats", error)
            } finally {
                  setLoading(false)
            }
      }

      useEffect(() => {
            if(session?.address && session?.nonce && backend_url){
                  getUserStats()
            }
      }, [session?.address, session?.nonce, backend_url])


      const handleUploadClick = () => {
            fileInputRef.current?.click()
      }

      // Also fix the upload button logic - add this function to your component
      const handleDirectUpload = async (fileData: FileItemWrapper, index: number) => {
            if (fileData.isLoading) {
                  toast.info('File is already uploading, please wait')
                  return
            }

            // Set loading state for this specific file
            setFilesListForUpload(prev =>
                  prev.map((item, i) =>
                        i === index ? { ...item, isLoading: true } : item
                  )
            )

            try {
                  // Process the file upload
                  const fileExist = await checkIfFileExistInUserFiles(fileData.file, files.fileData)
                  if (fileExist) {
                        throw new Error('File already exists')
                  }

                  if (fileData.file.size > maxFileSizeForUpload) {
                        throw new Error('File size exceeds 200MB limit')
                  }

                  const metamaskAddress = session?.address ?? ''
                  const formData = new FormData()
                  formData.append('file', fileData.file)
                  formData.append('account', `${metamaskAddress}`)

                  const url = `${backend_url}/explorer_files`
                  await axios.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              nonce: session?.nonce,
                        },
                  })

                  // Remove from upload list after successful upload
                  setFilesListForUpload(prev => prev.filter((_, i) => i !== index))
                  clearFileInput()

                  // Refresh files list
                  // const url2 = `${backend_url}/explorer_files`
                  // const updatedFiles = await fetchFiles(session?.address!, url2, session?.nonce!)
                  // setFiles({ fileData: updatedFiles, status: 'loaded' })

                  const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                  setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })



                  toast.success('File uploaded successfully')
            } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Upload failed'
                  toast.error(errorMessage)

                  // Reset loading state
                  setFilesListForUpload(prev =>
                        prev.map((item, i) =>
                              i === index ? { ...item, isLoading: false } : item
                        )
                  )
            }
      }

      const filesForUpload = async (selectedFiles: File[]) => {
            const newUploads: UploadStatus[] = []
            for (const file of selectedFiles) {
                  const isJson = isJSONFile(file.name)
                  const isZip = isZipFile(file.name)
                  if (isJson || isZip) {
                        let isJsonForm = false
                        let isJsonAquaTreeData = false
                        if (isJson) {
                              try {
                                    const content = await readFileContent(file)
                                    const contentStr = content as string
                                    const isForm = isJSONKeyValueStringContent(contentStr)
                                    if (isForm) {
                                          isJsonForm = true
                                    }

                                    const jsonData = JSON.parse(contentStr)
                                    const isAquaTreeData = isAquaTree(jsonData)
                                    if (isAquaTreeData) {
                                          isJsonAquaTreeData = isAquaTreeData
                                    }
                              } catch (error) {
                                    console.error('Error reading file content:', error)
                              }
                        }

                        // Check if file already exists in the upload list
                        const fileExists = filesListForUpload.some(existingFile =>
                              existingFile.file.name === file.name &&
                              existingFile.file.size === file.size &&
                              existingFile.file.lastModified === file.lastModified
                        )

                        if (!fileExists) {
                              const fileItemWrapper: FileItemWrapper = {
                                    status: 'pending',
                                    file,
                                    isJson,
                                    isZip,
                                    isLoading: false,
                                    isJsonForm: isJsonForm,
                                    isJsonAquaTreeData: isJsonAquaTreeData,
                              }
                              setFilesListForUpload(prev => [...prev, fileItemWrapper])
                        } else {
                              toast.error(`1. Error file exist in upload list`)
                        }
                  } else {
                        // Check if file already exists in the upload queue
                        const fileExists = newUploads.some(existingFile =>
                              existingFile.file.name === file.name &&
                              existingFile.file.size === file.size &&
                              existingFile.file.lastModified === file.lastModified
                        )

                        if (!fileExists) {
                              newUploads.push({
                                    file,
                                    status: 'pending',
                                    progress: 0,
                                    isJson: isJson,
                                    isZip: isZip,
                              })
                        } else {
                              toast.error(`1. Error file exist in upload list`)
                        }
                  }
            }

            if (newUploads.length > 0) {
                  // Create upload queue with initial status
                  setUploadQueue(newUploads)
                  setIsUploadDialogOpen(true)
                  setIsMinimized(false)

                  // Start processing files
                  processUploadQueue(newUploads)
            }
      }

      const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = Array.from(e.target.files ?? [])
            if (selectedFiles.length === 0) {
                  return
            }
            await filesForUpload(selectedFiles)
            // Clear the file input immediately after processing
            clearFileInput()
      }

      const processUploadQueue = async (uploads: UploadStatus[]) => {
            for (let i = 0; i < uploads.length; i++) {
                  const upload = uploads[i]

                  // Update status to uploading
                  setUploadQueue(prev => prev.map((item, index) => (index === i ? { ...item, status: 'uploading', progress: 10 } : item)))

                  try {
                        // Check file content first
                        await checkFileContentForUpload(upload, i)

                        // Simulate progress
                        for (let progress = 20; progress <= 80; progress += 20) {
                              setUploadQueue(prev => prev.map((item, index) => (index === i ? { ...item, progress } : item)))
                              await new Promise(resolve => setTimeout(resolve, 200))
                        }

                        // Upload the file
                        await uploadFileFromQueue(upload, i)

                        // Mark as success
                        setUploadQueue(prev => prev.map((item, index) => (index === i ? { ...item, status: 'success', progress: 100 } : item)))
                  } catch (error) {
                        // Mark as error
                        setUploadQueue(prev =>
                              prev.map((item, index) =>
                                    index === i
                                          ? {
                                                ...item,
                                                status: 'error',
                                                progress: 0,
                                                error: error instanceof Error ? error.message : 'Upload failed',
                                          }
                                          : item
                              )
                        )
                  }
            }

            // fetch all files from the api
            // const url2 = `${backend_url}/explorer_files`
            // const files = await fetchFiles(session?.address!, url2, session?.nonce!)
            // setFiles({ fileData: files, status: 'loaded' })

            const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
            setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })


      }

      const checkFileContentForUpload = async (upload: UploadStatus, index: number) => {
            if (upload.isJson) {
                  try {
                        const content = await readFileContent(upload.file)
                        const contentStr = content as string
                        const isForm = isJSONKeyValueStringContent(contentStr)

                        if (isForm) {
                              setUploadQueue(prev =>
                                    prev.map((item, i) =>
                                          i === index
                                                ? {
                                                      ...item,
                                                      isJsonForm: true,
                                                      isJsonAquaTreeData: false,
                                                }
                                                : item
                                    )
                              )
                              return
                        }

                        const jsonData = JSON.parse(contentStr)
                        const isAquaTreeData = isAquaTree(jsonData)

                        if (isAquaTreeData) {
                              setUploadQueue(prev =>
                                    prev.map((item, i) =>
                                          i === index
                                                ? {
                                                      ...item,
                                                      isJsonForm: false,
                                                      isJsonAquaTreeData: true,
                                                }
                                                : item
                                    )
                              )
                              return
                        }
                  } catch (error) {
                        console.error('Error reading file content:', error)
                        throw new Error('Failed to read file content')
                  }
            }
      }

      const uploadFileFromQueue = async (upload: UploadStatus, _index: number) => {
            if (!upload.file) {
                  throw new Error('No file selected')
            }

            const fileExist = await checkIfFileExistInUserFiles(upload.file, files.fileData)
            if (fileExist) {
                  throw new Error('File already exists')
            }

            if (upload.file.size > maxFileSizeForUpload) {
                  throw new Error('File size exceeds 200MB limit')
            }

            const metamaskAddress = session?.address ?? ''
            const formData = new FormData()
            formData.append('file', upload.file)
            formData.append('account', `${metamaskAddress}`)

            const url = `${backend_url}/explorer_files`
            await axios.post(url, formData, {
                  headers: {
                        'Content-Type': 'multipart/form-data',
                        nonce: session?.nonce,
                  },
            })
      }

      const retryUpload = (index: number) => {
            const upload = uploadQueue[index]
            if (upload.status === 'error') {
                  processUploadQueue([upload])
            }
      }

      const removeFromQueue = (index: number) => {
            setUploadQueue(prev => prev.filter((_, i) => i !== index))
      }

      const clearCompletedUploads = () => {
            setUploadQueue(prev => prev.filter(upload => upload.status !== 'success'))
      }

      const getStatusIcon = (status: string) => {
            switch (status) {
                  case 'pending':
                        return <FileText className="w-4 h-4 text-gray-500" />
                  case 'uploading':
                        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  case 'success':
                        return <CheckCircle className="w-4 h-4 text-green-500" />
                  case 'error':
                        return <AlertCircle className="w-4 h-4 text-red-500" />
                  default:
                        return <FileText className="w-4 h-4 text-gray-500" />
            }
      }

      const getStatusColor = (status: string) => {
            switch (status) {
                  case 'pending':
                        return 'bg-gray-100 text-gray-800'
                  case 'uploading':
                        return 'bg-blue-100 text-blue-800'
                  case 'success':
                        return 'bg-green-100 text-green-800'
                  case 'error':
                        return 'bg-red-100 text-red-800'
                  default:
                        return 'bg-gray-100 text-gray-800'
            }
      }

      const formatFileSize = (bytes: number) => {
            if (bytes === 0) return '0 Bytes'
            const k = 1024
            const sizes = ['Bytes', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
      }


      const displayFileListItems = () => {
            if (loading) {

                  return (
                        <div className="flex justify-center items-center h-40">
                              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
                        </div>
                  )
            }

            if (stats.filesCount === 0 && !loading) {
                  return <FileDropZone
                        setFiles={(files: File[]) => {
                              filesForUpload(files)
                        }}
                  />
            }


            return (
                  <FilesList
                        selectedFiles={[]}
                        activeFile={null}
                        showFileActions={true}
                        showCheckbox={false}
                        showHeader={true}
                        onFileDeSelected={() => { }} onFileSelected={() => {
                        }}
                  />
            )
      }

      return (
            <div className="w-full max-w-full box-border overflow-x-hidden">
                  {/* Action Bar */}
                  <div className="border-b border-gray-100 px-0 sm:px-4 pt-2 max-w-full">
                        <div className="w-full">
                              <div className="pb-2 flex items-center gap-2 sm:gap-4 px-2 flex-nowrap w-full overflow-x-auto">
                                    <Button
                                          data-testid="file-upload-dropzone"
                                          className="flex items-center gap-1 sm:gap-2 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium hover:brightness-90 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                                          style={{ backgroundColor: '#E55B1F' }}
                                          onClick={handleUploadClick}
                                    >
                                          <Upload className="w-4 h-4" />
                                          <span>Upload a File</span>
                                    </Button>
                                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                                    <Button
                                          data-testid="create-document-signature"
                                          className="flex items-center gap-1 sm:gap-2 text-white px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                                          style={{ backgroundColor: '#394150' }}
                                          onClick={() => {
                                                //,
                                                // setOpenCreateAquaSignPopUp(true)
                                                setOpenDialog({ dialogType: 'aqua_sign', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                                          }}
                                    >
                                          <Plus className="w-4 h-4" />
                                          <span>Document Signature </span>
                                    </Button>
                                    <ClaimTypesDropdownButton />
                                    <Button
                                          className="flex items-center gap-1 sm:gap-2 text-gray-700 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-md text-xs sm:text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                                          onClick={() => {
                                                // setOpenCreateTemplatePopUp(true)
                                                setOpenDialog({ dialogType: 'form_template_editor', isOpen: true, onClose: () => setOpenDialog(null), onConfirm: () => { } })
                                          }}
                                    >
                                          <FolderPlus className="w-4 h-4" />
                                          <span>Create Template</span>
                                    </Button>


                              </div>
                        </div>
                  </div>

                  <div>
                        {/* File List */}
                        {filesListForUpload.length > 0 && (
                              <div className="mt-6 mb-6 pb-5 pt-4 border-b border-b-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900 mb-3">Files for upload</h3>
                                    <div className="space-y-2">
                                          {filesListForUpload.map((fileData, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 bg-white border ">
                                                      <div className="flex items-center">
                                                            <FileText className="w-5 h-5 text-gray-400 mr-3" />
                                                            <div>
                                                                  <p className="text-sm font-medium text-gray-900">{fileData.file.name}</p>
                                                                  <p className="text-xs text-gray-500">{(fileData.file.size / 1024).toFixed(1)} KB</p>
                                                            </div>
                                                      </div>

                                                      <div className="flex gap-2">
                                                            {fileData.isJsonForm ? (
                                                                  <FormRevisionFile
                                                                        file={fileData.file}
                                                                        filesWrapper={fileData}
                                                                        removeFilesListForUpload={(item) => {
                                                                              let newFilesList = filesListForUpload.filter((item2) => item2.file.name != item.file.name)
                                                                              setFilesListForUpload(newFilesList)
                                                                        }}
                                                                        autoUpload={false}
                                                                  />
                                                            ) : null}

                                                            {fileData.isJsonAquaTreeData ? (
                                                                  <ImportAquaTree
                                                                        file={fileData.file}
                                                                        filesWrapper={fileData}
                                                                        removeFilesListForUpload={(item) => {
                                                                              let newFilesList = filesListForUpload.filter((item2) => item2.file.name != item.file.name)
                                                                              setFilesListForUpload(newFilesList)
                                                                        }}
                                                                        autoUpload={false}
                                                                  />
                                                            ) : null}

                                                            {fileData.isZip ? (
                                                                  <ImportAquaTreeZip
                                                                        file={fileData.file}
                                                                        filesWrapper={fileData}
                                                                        removeFilesListForUpload={(item) => {
                                                                              let newFilesList = filesListForUpload.filter((item2) => item2.file.name != item.file.name)
                                                                              setFilesListForUpload(newFilesList)
                                                                        }}
                                                                        autoUpload={false}
                                                                  />
                                                            ) : null}

                                                            {fileData.isLoading ? (
                                                                  <button
                                                                        className="flex items-center gap-2 text-white text-sm font-medium bg-gray-800 w-[100px] px-2 py-1 rounded cursor-not-allowed"
                                                                        disabled
                                                                  >
                                                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                                        </svg>
                                                                        Loading
                                                                  </button>
                                                            ) : (
                                                                  <button
                                                                        data-testid="action-upload-51-button"
                                                                        className="flex items-center gap-1 text-white hover:text-white-700 text-sm font-medium bg-gray-800 w-[80px] px-2 py-1 rounded"
                                                                        onClick={() => {
                                                                              handleDirectUpload(fileData, index)
                                                                        }}
                                                                  >
                                                                        <LuUpload />
                                                                        Upload
                                                                  </button>
                                                            )}

                                                            <button
                                                                  data-testid="action-upload-51-button"
                                                                  className="flex items-center gap-1 text-white hover:text-white-700 text-sm font-medium bg-red-600 w-[80px] px-2 py-1 rounded"
                                                                  onClick={() => {
                                                                        if (fileData.isLoading) {
                                                                              toast.info('File is uploading, please wait')
                                                                              return
                                                                        }
                                                                        setFilesListForUpload(prev => prev.filter((_, i) => i !== index))
                                                                        clearFileInput() // Clear file input after removal
                                                                  }}
                                                            >
                                                                  <LuTrash2 />
                                                                  Remove
                                                            </button>
                                                      </div>
                                                </div>
                                          ))}
                                    </div>
                              </div>
                        )}
                  </div>

                  <div className="w-full max-w-full box-border overflow-x-hidden bg-white p-0 md:p-6">
                        {displayFileListItems()}
                  </div>

                  {/* chain details dialog */}
                  <Dialog
                        open={openDialog !== null && openDialog.isOpen && openDialog.dialogType == 'aqua_file_details'}
                        onOpenChange={openState => {
                              // setIsSelectedFileDialogOpen(openState)
                              if (!openState) {
                                    setSelectedFileInfo(null)
                                    setOpenDialog(null)
                              }
                        }}
                  >
                        <DialogContent showCloseButton={false} className="!max-w-[96vw] !w-[96vw] !h-[96vh] md:!h-[96vh] max-h-[96vh] !p-0 gap-0 flex flex-col">
                              {/* Close Button */}
                              <div className="absolute top-4 right-4 z-10">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500"
                                          onClick={() => {
                                                // setIsSelectedFileDialogOpen(false)
                                                setSelectedFileInfo(null)
                                                setOpenDialog(null)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>
                              {selectedFileInfo ? (
                                    <div className="flex flex-col flex-1 h-[calc(100%-60px)]">
                                          {/* Header - fixed height */}
                                          <DialogHeader className="!h-[60px] !min-h-[60px] !max-h-[60px] flex justify-center px-6">
                                                <DialogTitle style={{
                                                       textAlign: 'start',
                                                       maxWidth: '90%',
                                                       overflow: 'hidden',
                                                       textOverflow: 'ellipsis',
                                                       whiteSpace: 'nowrap'
                                                 }}>
                                                      {getAquaTreeFileName(selectedFileInfo.aquaTree!)}
                                                 </DialogTitle>
                                          </DialogHeader>
                                          {/* Content - takes all available space */}
                                          <div className="h-[calc(100%-60px)] overflow-y-auto">
                                                <CompleteChainView
                                                      callBack={function (_drawerStatus: IDrawerStatus): void {
                                                            setDrawerStatus(_drawerStatus)
                                                      }}
                                                      selectedFileInfo={selectedFileInfo}
                                                />
                                          </div>
                                    </div>
                              ) : null}
                              {/* Footer - fixed height */}
                              <DialogFooter className="!h-[60px] !min-h-[60px] !max-h-[60px] !p-0 flex items-center justify-center !px-6 ">
                                    <Button
                                          variant="outline"
                                          className="bg-black text-white-500 hover:bg-black-700 text-white cursor-pointer"
                                          onClick={() => {
                                                setSelectedFileInfo(null)
                                                setOpenDialog(null)
                                          }}
                                    >
                                          Cancel
                                    </Button>
                              </DialogFooter>
                        </DialogContent>
                  </Dialog>

                  {/* Upload Progress Dialog */}
                  <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogContent className="sm:max-w-md  [&>button]:hidden">
                              <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <DialogTitle className="text-lg font-semibold">
                                          {isMinimized ? 'Upload Progress' : `Uploading ${uploadQueue.length} file${uploadQueue.length > 1 ? 's' : ''}`}
                                    </DialogTitle>
                                    <div className="flex items-center space-x-2">
                                          <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} className="h-6 w-6">
                                                <Minimize2 className="h-4 w-4" />
                                          </Button>
                                          <Button data-testid="close-upload-dialog-button" variant="ghost" size="icon" onClick={() => setIsUploadDialogOpen(false)} className="h-6 w-6">
                                                <X className="h-4 w-4" />
                                          </Button>
                                    </div>
                              </DialogHeader>

                              {!isMinimized && (
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                          {uploadQueue.map((upload, index) => (
                                                <Card key={index} className="p-3">
                                                      <CardContent className="p-0">
                                                            <div className="flex items-center justify-between mb-2">
                                                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                                                        {getStatusIcon(upload.status)}
                                                                        <div className="flex-1 min-w-0">
                                                                              <p className="text-sm font-medium text-gray-900 truncate">{upload.file.name}</p>
                                                                              <p className="text-xs text-gray-500">{formatFileSize(upload.file.size)}</p>
                                                                        </div>
                                                                  </div>
                                                                  <div className="flex items-center space-x-2">
                                                                        <Badge variant="secondary" className={getStatusColor(upload.status)}>
                                                                              {upload.status}
                                                                        </Badge>
                                                                        {upload.status === 'error' && (
                                                                              <Button variant="ghost" size="sm" onClick={() => retryUpload(index)} className="text-xs">
                                                                                    Retry
                                                                              </Button>
                                                                        )}
                                                                        <Button variant="ghost" size="icon" onClick={() => removeFromQueue(index)} className="h-6 w-6">
                                                                              <X className="h-4 w-4" />
                                                                        </Button>
                                                                  </div>
                                                            </div>

                                                            {upload.status === 'uploading' && (
                                                                  <div className="space-y-1">
                                                                        <Progress value={upload.progress} className="h-2" />
                                                                        <p className="text-xs text-gray-500">{upload.progress}% complete</p>
                                                                  </div>
                                                            )}

                                                            {upload.status === 'error' && upload.error && <p className="text-xs text-red-600 mt-1">{upload.error}</p>}

                                                            {upload.status === 'success' && <p className="text-xs text-green-600 mt-1">Upload completed successfully</p>}
                                                      </CardContent>
                                                </Card>
                                          ))}

                                          {uploadQueue.some(upload => upload.status === 'success') && (
                                                <div className="flex justify-end gap-2 pt-2">
                                                      <Button
                                                            data-testid="clear-completed-button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={clearCompletedUploads}
                                                      >
                                                            Clear completed
                                                      </Button>
                                                      <Button
                                                            data-testid="close-button"
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => setIsUploadDialogOpen(false)}
                                                      >
                                                            Close
                                                      </Button>
                                                </div>
                                          )}
                                    </div>
                              )}
                        </DialogContent>
                  </Dialog>
            </div>
      )
}

export default FilesPage
