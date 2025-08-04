import { LuUpload } from 'react-icons/lu'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useEffect, useRef, useState } from 'react'
import { ApiFileInfo } from '../../models/FileInfo'
import { checkIfFileExistInUserFiles } from '../../utils/functions'
import { maxFileSizeForUpload } from '../../utils/constants'
import { IDropzoneAction } from '../../types/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export const UploadFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex, autoUpload }: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)
      const [uploaded, setUploaded] = useState(false)

      const { metamaskAddress, addFile, files, backend_url, session } = useStore(appStore)

      const uploadFile = async () => {
            // let aquafier = new Aquafier();
            // let fileContent = await  readFileContent()
            // const existingChainFile = files.find(_file => _file.fileObject.find((e) => e.fileName == file.name) != undefined)
            if (!file) {
                  toast.info('No file selected!')
                  return
            }

            const fileExist = await checkIfFileExistInUserFiles(file, files)

            if (fileExist) {
                  toast.info( 'You already have the file. Delete before importing this')
                  updateUploadedIndex(fileIndex)

                  return
            }

            if (file.size > maxFileSizeForUpload) {
                  toast.error( 'File size exceeds 200MB limit. Please upload a smaller file.')
                  return
            }

            const formData = new FormData()
            formData.append('file', file)
            formData.append('account', `${metamaskAddress}`)

            setUploading(true)
            try {
                  const url = `${backend_url}/explorer_files`
                  //  console.log("url ", url)
                  const response = await axios.post(url, formData, {
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

                  // let newFilesData = [...files, fileInfo];
                  // console.log(`newFilesData -, ${JSON.stringify(newFilesData)}`)

                  addFile(fileInfo)

                  setUploaded(true)
                  setUploading(false)
                  toast.success('File uploaded successfuly')
                  updateUploadedIndex(fileIndex)
                  return
            } catch (error) {
                  setUploading(false)
                  toast.error( `Failed to upload file: ${error}`)
            }
      }

      // Use a ref to track if the upload has already been triggered
      const uploadInitiatedRef = useRef(false)

      useEffect(() => {
            if (autoUpload) {
                  // Only upload if it hasn't been initiated yet
                  if (!uploadInitiatedRef.current) {
                        uploadInitiatedRef.current = true

                        uploadFile()
                  }
            }
      }, [])

      return (
            <Button
                  data-testid="action-upload-51-button"
                  size="sm"
                  variant="secondary"
                  className="w-[80px] bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
                  onClick={uploadFile}
                  disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LuUpload className="h-4 w-4 mr-2" />}
                  Upload
            </Button>
      )
}
