import { LuSave } from 'react-icons/lu'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useState } from 'react'

import JSZip from 'jszip'
import { IDropzoneAction } from '../../types/types'
import { toaster } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'

export const ImportAquaTreeZip = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)
      const [uploaded, setUploaded] = useState(false)

      const { metamaskAddress, setFiles, backend_url, session } = useStore(appStore)

      const uploadFileData = async () => {
            console.log('uploadFileData called...')

            if (!file) {
                  toaster.create({
                        description: 'No file selected!',
                        type: 'info',
                  })
                  return
            }

            const formData = new FormData()
            formData.append('file', file)
            formData.append('account', `${metamaskAddress}`)

            setUploading(true)
            try {
                  const url = `${backend_url}/explorer_aqua_zip`
                  //  console.log("url ", url)
                  const response = await axios.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              nonce: session?.nonce,
                        },
                  })

                  // return all user files
                  const res = response.data

                  setFiles([...res.data])
                  setUploaded(true)
                  setUploading(false)
                  toaster.create({
                        description: 'File uploaded successfuly',
                        type: 'success',
                  })
                  updateUploadedIndex(fileIndex)
                  return
            } catch (error) {
                  setUploading(false)
                  toaster.create({
                        description: `Failed to upload file: ${error}`,
                        type: 'error',
                  })
            }
      }

      const importFile = async () => {
            console.log('importFile called')
            const reader = new FileReader()

            reader.onload = async function (_e) {
                  try {
                        console.log('int try catch')
                        let hasAquaJson = false
                        const zip = new JSZip()
                        const zipData = await zip.loadAsync(file)

                        const fileNames = Object.keys(zipData.files)
                        console.log('fileNames ', fileNames)

                        for (const fileName in zipData.files) {
                              // Convert ASCII codes to string
                              const actualFileName = fileName
                                    .split(',')
                                    .map(code => String.fromCharCode(parseInt(code)))
                                    .join('')
                              console.log('fileName', actualFileName)

                              if (actualFileName === 'aqua.json') {
                                    hasAquaJson = true
                                    break
                              }
                        }

                        if (!hasAquaJson) {
                              toaster.create({
                                    description: 'Aqua Json not found.',
                                    type: 'info',
                              })
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
                  disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                  {uploading ? <span className="w-4 h-4 animate-spin border-2 border-green-600 border-t-transparent rounded-full" /> : <LuSave className="w-4 h-4" />}
                  Import
            </Button>
      )
}
