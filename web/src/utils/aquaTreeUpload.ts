import { AquaTree, FileObject } from 'aqua-js-sdk'
import apiClient from '@/api/axiosInstance'
import { ensureDomainUrlHasSSL } from '@/utils/network'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'
import { toast } from 'sonner'

export interface SaveAquaTreeOptions {
      aquaTree: AquaTree
      fileObject: FileObject
      backendUrl: string
      nonce: string | undefined
      account: string
      isWorkflow?: boolean
      templateId?: string
      reloadKeys?: string[]
}

/**
 * Uploads an AquaTree and its associated file asset to the server.
 *
 * Constructs a multipart FormData payload containing the serialized AquaTree
 * JSON and an optional binary asset (Blob, File, ArrayBuffer, base64 data URI,
 * or plain string), then POSTs it to the explorer_aqua_file_upload endpoint.
 *
 * @returns `true` on success, `false` on failure (a toast is shown on error).
 */
export async function saveAquaTree(options: SaveAquaTreeOptions): Promise<boolean> {
      const {
            aquaTree,
            fileObject,
            backendUrl,
            nonce,
            account,
            isWorkflow = false,
            templateId = '',
            reloadKeys = [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files],
      } = options

      try {
            // Create a FormData object to send multipart data
            const formData = new FormData()

            // Add the aquaTree as a JSON file
            const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], {
                  type: 'application/json',
            })
            formData.append('file', aquaTreeBlob, fileObject.fileName)

            // Add the account from the session
            formData.append('account', account)
            formData.append('is_workflow', `${isWorkflow}`)

            // Workflow-specific template id
            if (templateId) {
                  formData.append('template_id', templateId)
            }

            // Check if we have an actual file to upload as an asset
            if (fileObject.fileContent) {
                  // Set has_asset to true
                  formData.append('has_asset', 'true')

                  // FIXED: Properly handle the file content as binary data
                  // If fileContent is already a Blob or File object, use it directly
                  if (fileObject.fileContent instanceof Blob || fileObject.fileContent instanceof File) {
                        formData.append('asset', fileObject.fileContent, fileObject.fileName)
                  }
                  // If it's an ArrayBuffer or similar binary data
                  else if (fileObject.fileContent instanceof ArrayBuffer || fileObject.fileContent instanceof Uint8Array) {
                        const fileBlob = new Blob([fileObject.fileContent as any], {
                              type: 'application/octet-stream',
                        })
                        formData.append('asset', fileBlob, fileObject.fileName)
                  }
                  // If it's a base64 string (common for image data)
                  else if (typeof fileObject.fileContent === 'string' && fileObject.fileContent.startsWith('data:')) {
                        // Convert base64 to blob
                        const response = await fetch(fileObject.fileContent)
                        const blob = await response.blob()
                        formData.append('asset', blob, fileObject.fileName)
                  }
                  // Fallback for other string formats (not recommended for binary files)
                  else if (typeof fileObject.fileContent === 'string') {
                        const fileBlob = new Blob([fileObject.fileContent], {
                              type: 'text/plain',
                        })
                        formData.append('asset', fileBlob, fileObject.fileName)
                  }
                  // If it's something else (like an object), stringify it (not recommended for files)
                  else {
                        console.warn('Warning: fileContent is not in an optimal format for file upload')
                        const fileBlob = new Blob([JSON.stringify(fileObject.fileContent)], {
                              type: 'application/json',
                        })
                        formData.append('asset', fileBlob, fileObject.fileName)
                  }
            } else {
                  formData.append('has_asset', 'false')
            }

            const url = ensureDomainUrlHasSSL(`${backendUrl}/explorer_aqua_file_upload`)
            await apiClient.post(url, formData, {
                  headers: {
                        nonce: nonce,
                        // Don't set Content-Type header - axios will set it automatically with the correct boundary
                  },
                  reloadKeys: reloadKeys,
            })

            return true
      } catch (error) {
            toast.error('Error uploading aqua tree', {
                  description: error instanceof Error ? error.message : 'Unknown error',
                  duration: 5000,
            })

            return false
      }
}
