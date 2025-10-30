import {LuDownload} from 'react-icons/lu'
import {ensureDomainUrlHasSSL, extractFileHash, isAquaTree, isHttpUrl, isValidUrl} from '../../utils/functions'
import {useStore} from 'zustand'
import appStore from '../../store'
import {ApiFileInfo} from '../../models/FileInfo'

import {useState} from 'react'
import Aquafier, {AquaTree, Revision} from 'aqua-js-sdk'
import JSZip from 'jszip'
import {AquaJsonInZip, AquaNameWithHash} from '../../models/Aqua'
// import { toaster } from "@/components/ui/use-toast"
import {toast} from 'sonner'

// Helper function to determine if a file should be treated as binary based on extension
const isBinaryFile = (filename: string): boolean => {
      const binaryExtensions = [
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
            '.zip',
            '.rar',
            '.7z',
            '.tar',
            '.gz',
            '.jpg',
            '.jpeg',
            '.png',
            '.gif',
            '.bmp',
            '.tiff',
            '.webp',
            '.mp3',
            '.mp4',
            '.avi',
            '.mov',
            '.wmv',
            '.flv',
            '.mkv',
            '.exe',
            '.dll',
            '.so',
            '.dylib',
            '.bin',
            '.dat',
            '.iso',
      ]

      const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
      return binaryExtensions.includes(extension)
}

export const DownloadAquaChain = ({ file, index, children }: { file: ApiFileInfo; index: number; children?: React.ReactNode }) => {
      const { session } = useStore(appStore)
      const [downloading, setDownloading] = useState(false)

      const downloadLinkAquaJson = async () => {
            const zip = new JSZip()
            const aquafier = new Aquafier()
            let mainAquaFileName = ''
            let genesisHash = ''
            // fetch the genesis
            const revisionHashes = Object.keys(file.aquaTree!.revisions!)
            for (const revisionHash of revisionHashes) {
                  const revisionData = file.aquaTree!.revisions![revisionHash]
                  if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == '') {
                        genesisHash = revisionHash
                        break
                  }
            }
            mainAquaFileName = file.aquaTree!.file_index[genesisHash]

            if(!mainAquaFileName || !genesisHash){
                  toast.error(`an error occured creating zip file : genesis hash or main aqua file name is not defined`)
                  return      
            }

            let mainAquaFileNameWithAquaDotJson = `${mainAquaFileName}.aqua.json`
            zip.file(mainAquaFileNameWithAquaDotJson, JSON.stringify(file.aquaTree))

            const nameWithHashes: Array<AquaNameWithHash> = []
            for (const fileObj of file.fileObject) {

                  const isAquaTreeData = isAquaTree(fileObj.fileContent)
                   if (typeof fileObj.fileContent === 'string' && isValidUrl(fileObj.fileContent) && isHttpUrl(fileObj.fileContent)) {
                        try {
                              const actualUrlToFetch = ensureDomainUrlHasSSL(fileObj.fileContent)

                              // Fetch the file from the URL
                              const response = await fetch(actualUrlToFetch, {
                                    method: 'GET',
                                    headers: {
                                          Nonce: session?.nonce ?? '--error--', // Add the nonce directly as a custom header if needed
                                    },
                              })
                              const blob = await response.blob()

                              let hashData = extractFileHash(fileObj.fileContent)
                              if (hashData == undefined) {
                                    // Fix: Don't convert blob to string for binary files
                                    if (isBinaryFile(fileObj.fileName)) {
                                          // For binary files, use the blob directly or convert to ArrayBuffer
                                          const arrayBuffer = await blob.arrayBuffer()
                                          hashData = aquafier.getFileHash(new Uint8Array(arrayBuffer))
                                    } else {
                                          // For text files, convert to string
                                          const text = await blob.text()
                                          hashData = aquafier.getFileHash(text)
                                    }
                              }

                              nameWithHashes.push({
                                    name: fileObj.fileName,
                                    hash: hashData,
                              })

                              // Use the original filename, not with .json extension
                              zip.file(fileObj.fileName, blob, { binary: true })
                        } catch (error) {
                              console.error(`Error downloading ${fileObj.fileName}:`, error)
                              toast('Error downloading file', {
                                    description: `Error downloading ${fileObj.fileName}: ${error}`,
                                    // type: "error"
                              })
                        }
                  } else {
                        // Handle non-URL content
                        let hashData: string

                        if (isAquaTreeData) {
                              // It's an AquaTree, so stringify it as JSON
                              const jsonContent = JSON.stringify(fileObj.fileContent as AquaTree)
                              // Only add .json extension if it doesn't already have one
                              const fileName = fileObj.fileName.endsWith('.aqua.json') ? fileObj.fileName : `${fileObj.fileName}.aqua.json`
                              zip.file(fileName, jsonContent)
                              hashData = aquafier.getFileHash(jsonContent)
                        } else if (typeof fileObj.fileContent === 'string') {
                              // It's a plain text file, so add it directly without JSON.stringify
                              zip.file(fileObj.fileName, fileObj.fileContent)
                              hashData = aquafier.getFileHash(fileObj.fileContent)
                        } else if (fileObj.fileContent instanceof Uint8Array || fileObj.fileContent instanceof ArrayBuffer) {
                              // Handle binary data
                              zip.file(fileObj.fileName, fileObj.fileContent, {
                                    binary: true,
                              })

                              // Convert ArrayBuffer to Uint8Array for hashing if needed
                              const dataForHash = fileObj.fileContent instanceof ArrayBuffer ? new Uint8Array(fileObj.fileContent) : fileObj.fileContent
                              hashData = aquafier.getFileHash(dataForHash)
                        } else {
                              // For other types, use JSON.stringify (objects, etc.)
                              const jsonContent = JSON.stringify(fileObj.fileContent)
                              // Only add .json extension if it doesn't already have one and it's not a known binary file
                              let fileName = fileObj.fileName
                              zip.file(fileName, jsonContent)
                              hashData = aquafier.getFileHash(jsonContent)
                        }

                        nameWithHashes.push({
                              name: fileObj.fileName, // Use original filename in the hash record
                              hash: hashData,
                        })
                  }
            }


            let genesisRevision: Revision | undefined = file.aquaTree!.revisions[genesisHash]
            if (!genesisRevision) {
                  toast.error(`an error occured creating zip file : genesis revision`)
                  return
            }

            let fileHash = genesisRevision.file_hash
            if (!fileHash) {
                  toast.error(`an error occured creating zip file:  file hash`)
                  return
            }
            //add main aqua file
            nameWithHashes.push({
                  name: mainAquaFileNameWithAquaDotJson,
                  hash: fileHash,
            })



            //create aqua.json
            const aquaObject: AquaJsonInZip = {
                  genesis: mainAquaFileName,
                  name_with_hash: nameWithHashes,
            }
            zip.file('aqua.json', JSON.stringify(aquaObject))

            const nameWithoutExtension = mainAquaFileName.replace(/\.[^/.]+$/, '')
            // Generate the zip file
            zip.generateAsync({ type: 'blob' }).then(blob => {
                  // Create a download link
                  const link = document.createElement('a')
                  link.href = URL.createObjectURL(blob)

                  link.download = `${nameWithoutExtension}.zip`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
            })
      }

      const downloadSimpleAquaJson = async () => {
            // Convert the PageData object to a formatted JSON string
            const jsonString = JSON.stringify(file.aquaTree, null, 2)

            // Create a Blob from the JSON string
            const blob = new Blob([jsonString], { type: 'application/json' })

            // Create a URL for the Blob
            const url = URL.createObjectURL(blob)

            // Create a temporary anchor element and trigger the download
            const a = document.createElement('a')
            a.href = url
            a.download = `${file.fileObject[0].fileName}.aqua.json`
            document.body.appendChild(a)
            a.click()

            // Clean up
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast('Aqua Chain Downloaded successfully', {
                  description: `Aqua Chain Downloaded successfully`,
            })

            // Loop through each file object and download the content
            for (const fileObj of file.fileObject) {
                  // Check if fileContent is a string (URL)
                      if (typeof fileObj.fileContent === 'string' && isValidUrl(fileObj.fileContent) && isHttpUrl(fileObj.fileContent)) {
                        try {
                              const actualUrlToFetch = ensureDomainUrlHasSSL(fileObj.fileContent)

                              // Fetch the file from the URL
                              const response = await fetch(actualUrlToFetch, {
                                    method: 'GET',
                                    headers: {
                                          Nonce: session?.nonce ?? '--error--', // Add the nonce directly as a custom header if needed
                                    },
                              })
                              const blob = await response.blob()

                              // Create URL from blob
                              const url = URL.createObjectURL(blob)

                              // Create temporary anchor and trigger download
                              const a = document.createElement('a')
                              a.href = url
                              a.download = fileObj.fileName
                              document.body.appendChild(a)
                              a.click()

                              // Clean up
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                        } catch (error) {
                              console.error(`Error downloading ${fileObj.fileName}:`, error)
                              toast('Error downloading file', {
                                    description: `Error downloading ${fileObj.fileName}: ${error}`,
                              })
                        }
                  } else {
                        try {
                              let blob

                              // Handle different types of fileContent based on file extension
                              if (fileObj.fileContent instanceof Blob || fileObj.fileContent instanceof File) {
                                    // Already a Blob or File object
                                    blob = fileObj.fileContent
                              } else if (fileObj.fileContent instanceof Uint8Array || fileObj.fileContent instanceof ArrayBuffer) {
                                    // Binary data - determine MIME type based on extension
                                    const mimeType = getMimeType(fileObj.fileName)
                                    blob = new Blob([fileObj.fileContent as BlobPart], {
                                          type: mimeType,
                                    })
                              } else if (typeof fileObj.fileContent === 'string') {
                                    // Handle plain string content
                                    if (isBinaryFile(fileObj.fileName)) {
                                          // If it's supposed to be a binary file but we have a string,
                                          // it might be base64 encoded or corrupted
                                          console.warn(`Warning: ${fileObj.fileName} appears to be binary but stored as string`)
                                    }
                                    blob = new Blob([fileObj.fileContent], {
                                          type: 'text/plain',
                                    })
                              } else if (isAquaTree(fileObj.fileContent)) {
                                    // Handle AquaTree object
                                    blob = new Blob([JSON.stringify(fileObj.fileContent)], {
                                          type: 'application/json',
                                    })
                              } else if (typeof fileObj.fileContent === 'object') {
                                    // Handle other objects - check if it looks like corrupted binary data
                                    if (isBinaryFile(fileObj.fileName) && isCorruptedBinaryData(fileObj.fileContent)) {
                                          // Try to reconstruct binary data from object
                                          const uint8Array = reconstructBinaryFromObject(fileObj.fileContent)
                                          const mimeType = getMimeType(fileObj.fileName)
                                          blob = new Blob([uint8Array as BlobPart], { type: mimeType })
                                    } else {
                                          // Regular object, serialize as JSON
                                          blob = new Blob([JSON.stringify(fileObj.fileContent)], {
                                                type: 'application/json',
                                          })
                                    }
                              } else {
                                    throw new Error(`Unsupported fileContent type for ${fileObj.fileName}`)
                              }

                              // Create URL from blob
                              const url = URL.createObjectURL(blob)

                              // Create temporary anchor and trigger download
                              const a = document.createElement('a')
                              a.href = url
                              a.download = fileObj.fileName
                              document.body.appendChild(a)
                              a.click()

                              // Clean up
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                        } catch (error) {
                              console.error(`Error downloading ${fileObj.fileName}:`, error)
                              toast('Error downloading file', {
                                    description: `Error downloading ${fileObj.fileName}: ${error}`,
                              })
                        }
                  }
            }

            toast('Files Downloaded successfully', {
                  description: `Files Downloaded successfully`,
            })
      }

      const downloadAquaJson = async () => {
            try {
                  setDownloading(true)
                  let containsLink = false
                  //check if it contains a link revision
                  const allHashes = Object.keys(file.aquaTree!.revisions!)
                  for (const hashItem of allHashes) {
                        const revision: Revision = file.aquaTree!.revisions![hashItem]
                        if (revision.revision_type == 'link') {
                              containsLink = true
                              break
                        }
                  }

                  if (containsLink) {
                        await downloadLinkAquaJson()
                  } else {
                        await downloadSimpleAquaJson()
                  }

                  toast('Files downloaded successfully', {
                        description: `Files downloaded successfully`,
                  })
                  setDownloading(false)
            } catch (error) {
                  toast('Error downloading JSON', {
                        description: `Error downloading JSON: ${error}`,
                  })
                  setDownloading(false)
            }
      }

      return (
            <>
                  {/* Sign Button */}
                  {children ? (
                        <div
                              onClick={() => {
                                    if (!downloading) {
                                          downloadAquaJson()
                                    } else {
                                          toast('Download is already in progress', {
                                                description: 'Download is already in progress',
                                          })
                                    }
                              }}
                        >
                              {children}
                        </div>
                  ) : (
                        <button
                              data-testid={'download-aqua-tree-button-' + index}
                              onClick={() => {
                                    if (!downloading) {
                                          downloadAquaJson()
                                    } else {
                                          toast('Download is already in progress', {
                                                description: 'Download is already in progress',
                                          })
                                    }
                              }}
                              className={`w-full flex items-center justify-center space-x-1 bg-[#F3E8FE] text-purple-700 px-3 py-2 rounded transition-colors text-xs ${downloading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#E8D5FE]'}`}
                              disabled={downloading}
                        >
                              {downloading ? (
                                    <>
                                          <svg className="animate-spin h-3 w-3 mr-1 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                          </svg>
                                          <span>Download...</span>
                                    </>
                              ) : (
                                    <>
                                          <LuDownload className="w-4 h-4" />
                                          <span>Download</span>
                                    </>
                              )}
                        </button>
                  )}
            </>
      )
}

// Helper function to get MIME type based on file extension
const getMimeType = (filename: string): string => {
      const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
      const mimeTypes: { [key: string]: string } = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.zip': 'application/zip',
            '.rar': 'application/vnd.rar',
            '.7z': 'application/x-7z-compressed',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.webp': 'image/webp',
            '.mp3': 'audio/mpeg',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.wmv': 'video/x-ms-wmv',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
      }

      return mimeTypes[extension] || 'application/octet-stream'
}

// Helper function to detect if object looks like corrupted binary data
const isCorruptedBinaryData = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) return false

      // Check if it's an object with numeric keys (like the PDF example)
      const keys = Object.keys(obj)
      if (keys.length === 0) return false

      // Check if all keys are numeric strings and values are numbers
      return keys.every(key => {
            const numKey = parseInt(key)
            return !isNaN(numKey) && typeof obj[key] === 'number' && obj[key] >= 0 && obj[key] <= 255
      })
}

// Helper function to reconstruct binary data from object
const reconstructBinaryFromObject = (obj: any): Uint8Array => {
      const keys = Object.keys(obj)
            .map(k => parseInt(k))
            .sort((a, b) => a - b)
      const uint8Array = new Uint8Array(keys.length)

      keys.forEach((key, index) => {
            uint8Array[index] = obj[key.toString()]
      })

      return uint8Array
}
