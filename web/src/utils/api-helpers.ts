import { ApiFileInfo } from '../models/FileInfo'
import { ApiFilePaginationData } from '@/types/types'
import { ensureDomainUrlHasSSL } from './network'
import apiClient from '@/api/axiosInstance'

export async function fetchSystemFiles(url: string, metamaskAddress: string = ''): Promise<Array<ApiFileInfo>> {
      try {
            const response = await apiClient.get(url, {
                  headers: {
                        metamask_address: metamaskAddress,
                  },
            })

            return response.data.data
      } catch (error) {
            console.error('Error fetching files:', error)
            return []
      }
}

export async function fetchFiles(publicMetaMaskAddress: string, url: string, nonce: string): Promise<{
      files: Array<ApiFileInfo>,
      pagination: ApiFilePaginationData
}> {
      try {
            const response = await apiClient.get(url, {
                  headers: {
                        metamask_address: publicMetaMaskAddress,
                        nonce: nonce,
                  },
            })

            return {
                  files: response.data.data,
                  pagination: response.data.pagination
            }
      } catch (error) {
            console.error('Error fetching files:', error)
            return {
                  files: [],
                  pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: 10,
                        hasNextPage: false,
                        hasPreviousPage: false,
                        endIndex: 0,
                        startIndex: 0,
                  }
            }
      }
}

export function getLatestApiFileInfObject(jsonArray: ApiFileInfo[]): ApiFileInfo | null {
      if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
            return null
      }

      let latestObject: ApiFileInfo | null = null
      let latestTimestamp = ''

      jsonArray.forEach(obj => {
            // Navigate through the nested structure to find revisions
            const aquaTree = obj.aquaTree
            if (aquaTree && aquaTree.revisions) {
                  // Get all revision keys and check their timestamps
                  Object.keys(aquaTree.revisions).forEach(revisionKey => {
                        const revision = aquaTree.revisions[revisionKey]
                        const timestamp = revision.local_timestamp

                        // Compare timestamps (they're in YYYYMMDDHHMMSS format, so string comparison works)
                        if (timestamp > latestTimestamp) {
                              latestTimestamp = timestamp
                              latestObject = obj
                        }
                  })
            }
      })

      return latestObject
}

export const fetchImage = async (fileUrl: string, nonce: string) => {
      try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl)
            const response = await apiClient.get(actualUrlToFetch, {
                  headers: { nonce: `${nonce}` },
                  responseType: 'arraybuffer',
            })

            // Get content type from headers
            let contentType = response.headers['content-type'] || ''

            // If content type is missing or generic, try to detect from URL
            if (contentType === 'application/octet-stream' || contentType === '') {
                  contentType = 'image/png'
            }

            if (contentType.startsWith('image')) {
                  const blob = new Blob([response.data], { type: contentType })
                  return URL.createObjectURL(blob)
            }

            return null
      } catch (error) {
            console.error('Error fetching file:', error)
            return null
      }
}

export async function handleLoadFromUrl(pdfUrlInput: string, fileName: string, toaster: any) {
      if (!pdfUrlInput.trim()) {
            toaster.error('Invalid URL', {
                  description: 'Please enter a valid PDF URL.',
                  type: 'error',
            })
            return {
                  file: null,
                  error: 'Invalid URL',
            }
      }
      try {
            const response = await fetch(pdfUrlInput)
            if (!response.ok) {
                  // throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                  return {
                        file: null,
                        error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
                  }
            }
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/pdf')) {
                  console.warn(`Content-Type is not application/pdf: ${contentType}. Attempting to load anyway.`)
                  // Potentially toast a warning here, but proceed for now
            }

            const arrayBuffer = await response.arrayBuffer()
            const filename = fileName
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
            const newFile = new File([blob], filename, { type: 'application/pdf' })

            //   resetPdfStateAndLoad(newFile);
            //   if (fileInputRef.current) { // Clear file input if URL is loaded
            //     fileInputRef.current.value = "";
            //   }

            return {
                  file: newFile,
                  error: null,
            }
      } catch (error) {
            console.error('Error loading PDF from URL:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
            //   toast({ title: "Load from URL Failed", description: `Could not load PDF from URL. ${errorMessage}`, variant: "destructive" });
            return {
                  file: null,
                  error: errorMessage,
            }
      }
}
