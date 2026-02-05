import {LuImport} from 'react-icons/lu'
import apiClient from '@/api/axiosInstance'
import {useStore} from 'zustand'
import appStore from '../../store'
import {useState} from 'react'
import {IDropzoneAction} from '../../types/types'
import {Button} from '@/components/ui/button'
import {toast} from 'sonner'
import {ensureDomainUrlHasSSL, fetchFiles} from '@/utils/functions'

// export const ImportAquaChainFromFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {
export const ImportAquaChainFromFile = ({ file, filesWrapper, removeFilesListForUpload}: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)
      // const [uploaded, setUploaded] = useState(false)

      const { metamaskAddress, setFiles, session, backend_url } = useStore(appStore)

      const importAquaChain = async () => {

             if(uploading){
                  toast.info(`Wait for upload to complete`)
                  return
            }
            
            if (!file) {
                  toast.error( 'No file selected!')
                  return
            }

            const formData = new FormData()
            formData.append('file', file)
            formData.append('account', 'example')
            setUploading(true)
            try {
                  const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_aqua_file_upload`)
                   await apiClient.post(url, formData, {
                        headers: {
                              'Content-Type': 'multipart/form-data',
                              metamask_address: metamaskAddress,
                        },
                  })

                const urlPath = `${backend_url}/explorer_files`
                const url2 = ensureDomainUrlHasSSL(urlPath)
                  const filesApi = await fetchFiles(session!.address, url2, session!.nonce)
                              setFiles({ fileData: filesApi.files, pagination : filesApi.pagination, status: 'loaded' })

                              
                  toast.success( 'Aqua Chain imported successfully')
                  setUploading(false)
                  // setUploaded(true)
                  removeFilesListForUpload(filesWrapper)
                  return
            } catch (error) {
                  setUploading(false)
                  toast.error( `Failed to import chain: ${error}`)
            }
      }

      return (
            <Button
                  data-testid="import-action-42-button"
                  size="sm"
                  className="w-[80px] flex items-center gap-1 text-muted-foreground"
                  onClick={importAquaChain}
                  // disabled={uploadedIndexes.includes(fileIndex) || uploaded}
            >
                  {uploading ? <span className="w-4 h-4 animate-spin border-2 border-muted-foreground border-t-transparent rounded-full" /> : <LuImport className="w-4 h-4" />}
                  Import
            </Button>
      )
}
