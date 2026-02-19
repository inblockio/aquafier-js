import { ensureDomainUrlHasSSL } from './network'
import { isTextFile } from './file-detection'
import { ApiFileInfo } from '../models/FileInfo'
import Aquafier, { AquaTree, Revision } from 'aqua-js-sdk'
import apiClient from '@/api/axiosInstance'

/**
 * Reads a File object as text
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as string
 */
export function readFileAsText(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = event => {
                  if (event.target?.result) {
                        resolve(event.target.result as string)
                  } else {
                        reject(new Error('Failed to read file content'))
                  }
            }

            reader.onerror = error => {
                  reject(error)
            }

            reader.readAsText(file, 'utf-8')
      })
}

/**
 * Reads a File object as ArrayBuffer
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = event => {
                  if (event.target?.result) {
                        resolve(event.target.result as ArrayBuffer)
                  } else {
                        reject(new Error('Failed to read file content'))
                  }
            }

            reader.onerror = error => {
                  reject(error)
            }

            reader.readAsArrayBuffer(file)
      })
}

/**
 * Reads a File object as Data URL
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as Data URL string
 */
export function readFileAsDataURL(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = event => {
                  if (event.target?.result) {
                        resolve(event.target.result as string)
                  } else {
                        reject(new Error('Failed to read file content'))
                  }
            }

            reader.onerror = error => {
                  reject(error)
            }

            reader.readAsDataURL(file)
      })
}

/**
 * Converts a Blob (typically from an HTTP response) to a base64 string
 *
 * @param blob - The Blob object returned from fetch or XMLHttpRequest
 * @returns Promise that resolves with the base64 string (without the data URL prefix)
 */
export function blobToBase64(blob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        // Extract just the base64 part by removing the data URL prefix
                        // (e.g., "data:application/octet-stream;base64,")
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('FileReader did not return a string'))
                  }
            }

            reader.onerror = error => {
                  reject(new Error(`FileReader error: ${error}`))
            }

            // Read the blob as a data URL which gives us a base64 representation
            reader.readAsDataURL(blob)
      })
}

// Helper function to convert Blob to Data URL
export const blobToDataURL = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                  resolve(reader.result as string)
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
      })
}

export const readFileContent = async (file: File): Promise<string | Uint8Array> => {
      if (isTextFile(file)) {
            // If it's a text file, read as text
            return await readFileAsText(file)
      } else {
            //   ("binary data....")
            // Otherwise for binary files, read as ArrayBuffer
            const res = await readFileAsArrayBuffer(file)
            return new Uint8Array(res)
      }
}

// Function to convert file to base64
export async function fileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('Failed to convert file to base64'))
                  }
            }
            reader.onerror = error => reject(error)
      })
}

export function encodeFileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
      })
}

// Function to convert data URL to File object
export const dataURLToFile = (dataUrl: string, filename: string): File => {
      // Split the data URL to get the MIME type and base64 data
      const arr = dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])

      // Convert base64 to binary
      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
      }

      // Create and return File object
      return new File([u8arr], filename, { type: mime })
}

// Function to convert data URL to Uint8Array
export const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
      // Extract the base64 data
      const base64Data = dataUrl.split(',')[1]
      // Convert base64 to binary string
      const binaryString = atob(base64Data)

      // Create Uint8Array from binary string
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
      }

      return bytes
}

export function readJsonFile(file: File): Promise<any> {
      return new Promise((resolve, reject) => {
            if (file.type !== 'application/json') {
                  reject(new Error('The file is not a JSON file.'))
                  return
            }

            const reader = new FileReader()
            reader.onload = () => {
                  try {
                        const json = JSON.parse(reader.result as string)
                        resolve(json)
                  } catch (error) {
                        reject(new Error('Error parsing JSON content.'))
                  }
            }

            reader.onerror = () => {
                  reject(new Error('Error reading the file.'))
            }

            reader.readAsText(file)
      })
}

export const checkIfFileExistInUserFiles = async (file: File, files: ApiFileInfo[]): Promise<boolean> => {
      let fileExists = false
      // read the file and get the file hash
      const fileContent = await readFileContent(file)
      const aquafier = new Aquafier()
      const fileHash = aquafier.getFileHash(fileContent)
      //    (`type of ${typeof (fileContent)} file hash generated  ${fileHash} `)

      // loop through all the files the user has
      for (const fileItem of files) {
            //   (`looping ${JSON.stringify(fileItem.aquaTree)}`)
            const aquaTree: AquaTree = fileItem.aquaTree!
            //loop through the revisions
            // check if revsion type is file then compare the file hash if found exit loop
            const revisionsData: Array<Revision> = Object.values(aquaTree.revisions)
            for (const revision of revisionsData) {
                  //      (`--> looping ${JSON.stringify(revision)}`)
                  if (revision.revision_type == 'file') {
                        //            (`$$$ FILE -->looping ${revision.file_hash}`)
                        if (revision.file_hash === fileHash) {
                              fileExists = true
                              break
                        }
                  }
            }
      }

      return fileExists
}

export const fetchFileData = async (url: string, nonce: string): Promise<string | ArrayBuffer | null> => {
      try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(url)

            const response = await apiClient.get(actualUrlToFetch, {
                  headers: { nonce },
                  responseType: 'arraybuffer',
            })

            // Get MIME type from headers
            const contentType = response.headers['content-type'] || ''

            // Process based on content type
            if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/xml' || contentType === 'application/javascript') {
                  return new TextDecoder().decode(response.data)
            } else {
                  return response.data
            }
      } catch (e) {
            console.error('Error fetching file:', e)
            return null
      }
}
