import { LuDock } from 'react-icons/lu'
import apiClient from '@/api/axiosInstance'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useState } from 'react'
import { ApiFileInfo } from '../../models/FileInfo'
import { checkIfFileExistInUserFiles, ensureDomainUrlHasSSL } from '../../utils/functions'
import { maxFileSizeForUpload } from '../../utils/constants'
import { IDropzoneAction } from '../../types/types'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { triggerWorkflowReload, RELOAD_KEYS } from '@/utils/reloadDatabase'
// export const FormRevisionFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {
export const FormRevisionFile = ({ file, filesWrapper, removeFilesListForUpload }: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)
      // const [uploaded, setUploaded] = useState(false)

      const { metamaskAddress, setFiles, files, backend_url, session } = useStore(appStore)

      const uploadFile = async () => {

            if (uploading) {
                  toast.info(`Wait for upload to complete`)
                  return
            }
            const fileExist = await checkIfFileExistInUserFiles(file, files.fileData)

            if (fileExist) {
                  toast.info('You already have the file. Delete before importing this')
                  return
            }

            if (!file) {
                  toast.info('No file selected!')
                  return
            }

            if (file.size > maxFileSizeForUpload) {
                  toast.info('File size exceeds 200MB limit. Please upload a smaller file.')
                  return
            }

            const formData = new FormData()
            formData.append('isForm', 'true')
            formData.append('file', file)
            formData.append('account', `${metamaskAddress}`)

            setUploading(true)
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_files`)
                  const response = await apiClient.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              nonce: session?.nonce,
                        },
                  })

                  const res = response.data

                  const fileInfo: ApiFileInfo = {
                        aquaTree: res.aquaTree,
                        fileObject: [res.fileObject],
                        linkedFileObjects: [],
                        mode: 'private',
                        owner: metamaskAddress ?? '',
                  }
                  // const base64Content = await encodeFileToBase64(file);
                  // Assuming the API returns an array of FileInfo objects
                  // const fileInfo: ApiFileInfo = {
                  //     fileObject: {
                  //         fileName: res.file.name,
                  //         fileContent: base64Content,
                  //         path: "aqua::",
                  //     },
                  //     // name: res.file.name,
                  //     // extension: res.file.extension,
                  //     // page_data: res.file.page_data,
                  //     mode: res.file.mode,
                  //     owner: res.file.owner,
                  //     aquaTree: null,
                  //     linkedFileObjects: []
                  // };

                  setFiles({ fileData: [...files.fileData, fileInfo], status: 'loaded' })
                  // setUploaded(true)
                  setUploading(false)
                  toast.success('File uploaded successfuly')
                  // updateUploadedIndex(fileIndex)
                  removeFilesListForUpload(filesWrapper)

                  // Trigger reload for all files and stats
                  await triggerWorkflowReload(RELOAD_KEYS.user_files, true);
                  await triggerWorkflowReload(RELOAD_KEYS.all_files, true);

                  return
            } catch (error) {
                  setUploading(false)
                  toast.error(`Failed to upload file: ${error}`)
            }

      }

      return (
            <Button
                  data-testid="create-form-3-button"
                  size="sm"
                  variant="secondary"
                  className="w-[130px] bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
                  onClick={uploadFile}
            // disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LuDock className="h-4 w-4 mr-2" />}
                  Create Form
            </Button>
      )
}
