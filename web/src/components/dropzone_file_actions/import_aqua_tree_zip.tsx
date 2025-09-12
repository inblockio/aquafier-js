import {LuSave} from 'react-icons/lu'
import axios from 'axios'
import {useStore} from 'zustand'
import appStore from '../../store'
import {useState} from 'react'

import JSZip from 'jszip'
import {IDropzoneAction} from '../../types/types'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {fetchFiles} from '@/utils/functions'

export const ImportAquaTreeZip = ({ file, filesWrapper, removeFilesListForUpload }: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)

      const { metamaskAddress, setFiles, backend_url, session } = useStore(appStore)

      const uploadFileData = async () => {
            if (!file) {
                  toast.info('No file selected!')
                  return
            }

            const formData = new FormData()
            formData.append('file', file)
            formData.append('account', `${metamaskAddress}`)

            setUploading(true)
            try {
                  const url = `${backend_url}/explorer_aqua_zip`
                  await axios.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              nonce: session?.nonce,
                        },
                  })

                  // return all user files
                  const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce)
                  setFiles({
                        fileData: files, status: 'loaded'
                  })
                  // setUploaded(true)
                  setUploading(false)
                  toast.success('File uploaded successfuly')
                  // updateUploadedIndex(fileIndex)

                  removeFilesListForUpload(filesWrapper)
                  return
            } catch (error) {
                  setUploading(false)
                  toast.error(`Failed to upload file: ${error}`)
            }
      }

      const importFile = async () => {

            if (uploading) {
                  toast.info(`Wait for upload to complete`)
                  return
            }
            const reader = new FileReader()

            reader.onload = async function (_e) {
                  try {
                        let hasAquaJson = false
                        const zip = new JSZip()
                        const zipData = await zip.loadAsync(file)

                        for (const fileName in zipData.files) {
                              // Convert ASCII codes to string
                              const actualFileName = fileName
                                    .split(',')
                                    .map(code => String.fromCharCode(parseInt(code)))
                                    .join('')

                              if (actualFileName === 'aqua.json') {
                                    hasAquaJson = true
                                    break
                              }
                        }

                        if (!hasAquaJson) {
                              toast.info('Aqua Json not found.')
                              return
                        }

                        await uploadFileData()
                  } catch (error) {
                        console.error('Error reading ZIP file:', error)
                        alert('Failed to read ZIP file.')
                  }
            }

            reader.readAsArrayBuffer(file)
      }

      return (
            <Button
                  data-testid="action-import-82-button"
                  size="sm"
                  variant="outline"
                  className="w-24 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  onClick={importFile}
            // disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                  {uploading ? <span className="w-4 h-4 animate-spin border-2 border-green-600 border-t-transparent rounded-full" /> : <LuSave className="w-4 h-4" />}
                  Import
            </Button>
      )
}
