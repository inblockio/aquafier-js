import { LuSave } from 'react-icons/lu'
import apiClient from '@/api/axiosInstance'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useState } from 'react'
import JSZip from 'jszip'
import { IDropzoneAction } from '../../types/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ensureDomainUrlHasSSL, fetchFiles } from '@/utils/functions'
import { extractEmbeddedAquaData } from '@/utils/pdf-digital-signature'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'

export const ImportAquaTreeFromPdf = ({ file, filesWrapper, removeFilesListForUpload }: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)
      const { metamaskAddress, setFiles, backend_url, session } = useStore(appStore)

      const uploadFileData = async () => {
            if (!file) {
                  toast.info('No file selected!')
                  return
            }

            setUploading(true)
            try {
                  // Read PDF and extract embedded aqua data
                  const arrayBuffer = await file.arrayBuffer()
                  const uint8Array = new Uint8Array(arrayBuffer)
                  const embeddedData = await extractEmbeddedAquaData(uint8Array)

                  if (!embeddedData.aquaJson) {
                        toast.error('No embedded aqua data found in PDF')
                        setUploading(false)
                        return
                  }

                  // Build a ZIP from the extracted embedded files
                  const zip = new JSZip()

                  // Collect asset filenames for quick lookup
                  const assetFileNames = new Set(embeddedData.assetFiles.map(f => f.filename))

                  // Add aqua.json
                  zip.file('aqua.json', JSON.stringify(embeddedData.aquaJson))

                  // Add aqua chain files (.aqua.json files)
                  for (const chainFile of embeddedData.aquaChainFiles) {
                        zip.file(chainFile.filename, chainFile.content)

                        // The backend expects the original asset file alongside each .aqua.json.
                        // During PDF signing, asset files whose content is an aqua tree get
                        // embedded only under the .aqua.json name (e.g. "foo.json" becomes
                        // "foo.json.aqua.json"). We need to also add the content under the
                        // original asset name so the backend can find it.
                        const assetName = chainFile.filename.replace(/\.aqua\.json$/, '')
                        if (assetName !== chainFile.filename && !assetFileNames.has(assetName)) {
                              zip.file(assetName, chainFile.content)
                              assetFileNames.add(assetName)
                        }
                  }

                  // Add asset files
                  for (const assetFile of embeddedData.assetFiles) {
                        if (assetFile.content instanceof ArrayBuffer) {
                              zip.file(assetFile.filename, new Uint8Array(assetFile.content))
                        } else {
                              zip.file(assetFile.filename, assetFile.content)
                        }
                  }

                  // Generate the ZIP blob
                  const zipBlob = await zip.generateAsync({ type: 'blob' })
                  const zipFile = new File([zipBlob], `${file.name}.aqua.zip`, { type: 'application/zip' })

                  // Upload to /explorer_aqua_zip endpoint
                  const formData = new FormData()
                  formData.append('file', zipFile)
                  formData.append('account', `${metamaskAddress}`)

                  const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_aqua_zip`)
                  await apiClient.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              nonce: session?.nonce,
                        },
                        reloadKeys: [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files],
                  })

                  const urlPath = `${backend_url}/explorer_files`
                  const url2 = ensureDomainUrlHasSSL(urlPath)
                  const filesApi = await fetchFiles(session!.address, url2, session!.nonce)
                  setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

                  setUploading(false)
                  toast.success('Aqua Sign imported successfully from PDF')
                  removeFilesListForUpload(filesWrapper)
            } catch (error) {
                  setUploading(false)
                  toast.error(`Failed to import Aqua Sign from PDF: ${error}`)
            }
      }

      return (
            <Button
                  data-testid="action-import-pdf-aqua-button"
                  size="sm"
                  variant="outline"
                  className="w-36 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  onClick={uploadFileData}
            >
                  {uploading ? <span className="w-4 h-4 animate-spin border-2 border-green-600 border-t-transparent rounded-full" /> : <LuSave className="w-4 h-4" />}
                  Import Aqua Sign
            </Button>
      )
}
