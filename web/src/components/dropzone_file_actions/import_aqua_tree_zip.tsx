import { LuSave } from 'react-icons/lu'
import axios from 'axios'
import { useStore } from 'zustand'
import appStore from '../../store'
import { useState } from 'react'

import JSZip from 'jszip'
import { AquaJsonManifestFileInZip, IDropzoneAction, ImportZipAquaTreeConflictResolutionDialogProps } from '../../types/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { fetchFiles, getFileName, getGenesisHash } from '@/utils/functions'
import { ApiFileInfo } from '@/models/FileInfo'
import { FileText, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import Logger from '@/utils/Logger'
export const ImportAquaTreeZip = ({ file, filesWrapper, removeFilesListForUpload }: IDropzoneAction) => {
      const [uploading, setUploading] = useState(false)
      const [conflictFiles, setConflictFiles] = useState<Array<ImportZipAquaTreeConflictResolutionDialogProps>>([])
      const [submittingData, setSubmittingData] = useState(false)

      const { metamaskAddress, setFiles, backend_url, session, files } = useStore(appStore)

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

      const checkForConflicts = async (zipData: JSZip): Promise<ImportZipAquaTreeConflictResolutionDialogProps[]> => {
            let allFilesWithissues: Array<ImportZipAquaTreeConflictResolutionDialogProps> = []
            let allSystemFilesGenesisHashes = files.fileData.map((f: ApiFileInfo) => {
                  let hash = getGenesisHash(f.aquaTree!) ?? ""
                  return {
                        file: f,
                        hash: hash
                  }
            }).filter(h => h !== null)
            Logger.info('All system files genesis hashes:', allSystemFilesGenesisHashes)

            const fileData = zipData.files['aqua.json'] || Object.entries(zipData.files).find(([fileName, _fileData]) => {
                  try {
                        // Check if filename is encoded as comma-separated ASCII codes
                        if (/^[\d,]+$/.test(fileName)) {
                              const decodedName = fileName
                                    .split(',')
                                    .map(code => String.fromCharCode(parseInt(code)))
                                    .join('');
                              return decodedName === 'aqua.json';
                        }
                  } catch (error) {
                        // If decoding fails, skip this file
                        Logger.error('Error decoding filename:' + error)
                  }
                  return false;
            })?.[1];

            // Read the file content as string
            const jsonContent = await fileData.async('string')
            Logger.info('Aqua JSON Content:' + jsonContent)

            // Split the string into numbers, convert to chars, join back
            const decodedJson = jsonContent
                  .split(',')
                  .map(code => String.fromCharCode(parseInt(code)))
                  .join('')

            Logger.info('Decoded Aqua JSON:' + decodedJson)

            // Parse the JSON
            const aquaData: AquaJsonManifestFileInZip = JSON.parse(decodedJson)

            Logger.info('Parsed Aqua Data:', aquaData)

            // Loop through name_with_hash array
            if (aquaData.name_with_hash && Array.isArray(aquaData.name_with_hash)) {
                  Logger.info('Genesis file:' +  aquaData.genesis)
                  Logger.info('Processing' +  aquaData.name_with_hash.length+  '--files:')


                  let allAquaTrees = aquaData.name_with_hash.filter((item: { name: string; hash: string }) => item.name.endsWith('.aqua.json'));
                  Logger.info('All aqua trees in zip:'+ allAquaTrees.length)

                  for (const item of allAquaTrees) {
                        Logger.info('Processing: '+ item.name + '  with hash: '+ item.hash)

                        //read the file in the aqua file
                        const fileData = zipData.files[item.name] || Object.entries(zipData.files).find(([fileName, _fileData]) => {
                              try {
                                    // Check if filename is encoded as comma-separated ASCII codes
                                    if (/^[\d,]+$/.test(fileName)) {
                                          const decodedName = fileName
                                                .split(',')
                                                .map(code => String.fromCharCode(parseInt(code)))
                                                .join('');
                                          return decodedName === item.name;
                                    }
                              } catch (error) {
                                    // If decoding fails, skip this file
                              }
                              return false;
                        })?.[1];

                        if (!fileData) {
                              console.warn(`File ${item.name} not found in ZIP, skipping.`)
                              continue
                        }

                        const jsonContent = await fileData.async('string')
                        Logger.info(item.name + ' JSON Content--:'+ jsonContent)

                        // Split the string into numbers, convert to chars, join back
                        const decodedJson = jsonContent
                              .split(',')
                              .map(code => String.fromCharCode(parseInt(code)))
                              .join('')

                        Logger.info('Decoded ' + item.name + ' JSON:'+ decodedJson)

                        let aquaTree = JSON.parse(decodedJson)
                        let genesisHash = getGenesisHash(aquaTree)
                        // Your processing logic here
                        let existingFile = allSystemFilesGenesisHashes.find(fh => fh.hash.trim() === genesisHash?.trim())
                        if (existingFile) {
                              Logger.info(`File with hash ${item.hash} already exists as ${item.name}, skipping upload.`)
                              // fetch all the hashes of the local file and the hashes of the incoming files and compare
                              let localFileHashes = Object.keys(existingFile.file.aquaTree!.revisions)
                              let incomingFileHashes = Object.keys(aquaTree.revisions)

                              // Check if arrays are identical (same elements, order doesn't matter)
                              let localSet = new Set(localFileHashes)
                              let incomingSet = new Set(incomingFileHashes)


                              // Check if they have the same size and all elements match
                              let areIdentical = localSet.size === incomingSet.size &&
                                    [...localSet].every(hash => incomingSet.has(hash))

                              if (!areIdentical) {
                                    Logger.info('Arrays are not identical!')

                                    // Find elements in local but not in incoming
                                    let onlyInLocal = localFileHashes.filter(hash => !incomingSet.has(hash))
                                    if (onlyInLocal.length > 0) {
                                          Logger.info('Hashes only in local file:', onlyInLocal)
                                    }

                                    // Find elements in incoming but not in local
                                    let onlyInIncoming = incomingFileHashes.filter(hash => !localSet.has(hash))
                                    if (onlyInIncoming.length > 0) {
                                          Logger.info('Hashes only in incoming file:', onlyInIncoming)
                                    }

                                    // Summary log
                                    Logger.info('Local hashes:', localFileHashes)
                                    Logger.info('Incoming hashes:', incomingFileHashes)

                                    allFilesWithissues.push({
                                          incomingFileAquaTree: aquaTree,
                                          incomingFileName: item.name,
                                          localFile: existingFile.file
                                    })
                              } else {
                                    Logger.info('Arrays are identical (same elements, order may differ)')
                              }

                        }
                  }

            }

            return allFilesWithissues

      }
      const importFile = async () => {

            if (uploading) {
                  toast.info(`Wait for upload to complete`)
                  return
            }
            const reader = new FileReader()

            reader.onload = async function (_e) {
                  try {

                        const zip = new JSZip()
                        const zipData = await zip.loadAsync(file)



                        const aquaJsonFileName = Object.keys(zipData.files).find(fileName => {
                              Logger.info('Processing file in zip: '+ fileName)

                              // Convert ASCII codes to string
                              const actualFileName = fileName
                                    .split(',')
                                    .map(code => String.fromCharCode(parseInt(code)))
                                    .join('')

                              return actualFileName === 'aqua.json'
                        })

                        if (aquaJsonFileName) {
                              Logger.info('Found aqua.json file:'+ aquaJsonFileName)
                              let allFilesWithissues = await checkForConflicts(zipData)

                              if (allFilesWithissues.length > 0) {
                                    setConflictFiles(allFilesWithissues)
                                    return

                              }else{
                                    //proceed to upload
                                    await uploadFileData()
                              }
                        } else {
                              Logger.info('aqua.json not found')

                              toast.info('Aqua Json not found.')
                              return
                        }


                  } catch (error) {
                        console.error('Error reading ZIP file:', error)
                        alert('Failed to read ZIP file.')
                  }
            }

            reader.readAsArrayBuffer(file)
      }

      return (
            <>

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

                  {/* General Dialogs */}
                  <Dialog
                        open={conflictFiles.length > 0}
                        onOpenChange={openState => {
                              if (!openState) {
                                    setConflictFiles([])
                              }
                        }}
                  >
                        <DialogContent
                              className={

                                    "[&>button]:hidden !max-w-[65vw] !w-[65vw] h-[85vh] max-h-[85vh] sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[85vh] sm:max-h-[85vh] flex flex-col"
                              }>
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500 z-10 relative"
                                          onClick={() => {
                                                setConflictFiles([])

                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>

                              <ScrollArea className="h-full">

                                    <DialogHeader>
                                          <DialogTitle className="text-2xl mb-2">Conflict Resolution</DialogTitle>
                                          <p className="text-sm text-muted-foreground">
                                                The following files have conflicts with existing files in your system.If you choose to proceed the local files will be overwritten.
                                          </p>

                                          {conflictFiles.map((conflict, index) => (
                                                <div key={index} className="p-4 mt-4 border rounded bg-yellow-50">
                                                      <h3 className="font-semibold">Incoming File: {getFileName(conflict.incomingFileAquaTree!)} revisions ({Object.keys(conflict.incomingFileAquaTree.revisions).length})</h3>
                  
                                                      <p className="mt-2">Local File: {getFileName(conflict.localFile.aquaTree!)}  revisions ({Object.keys(conflict.localFile.aquaTree!.revisions).length})</p>

                                                      </div>
                                          ))}
                                    </DialogHeader>
                              </ScrollArea>
                              <DialogFooter className="mt-auto">

                                    <Button type="button" variant="outline" onClick={() => {
                                          setConflictFiles([])

                                    }} className="px-6">
                                          Cancel
                                    </Button>

                                    <Button
                                          data-testid="action-loading-create-button"
                                          type="submit"
                                          onClick={async () => {
                                                setSubmittingData(true)
                                                await uploadFileData()
                                                setSubmittingData(false)
                                                setConflictFiles([])
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                          disabled={submittingData}
                                    >
                                          {submittingData ? (
                                                <>
                                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                      Importing zip files...
                                                </>
                                          ) : (
                                                <>
                                                      <FileText className="mr-2 h-4 w-4" />
                                                      Accept file & Proceed
                                                </>
                                          )}
                                    </Button>
                              </DialogFooter>
                        </DialogContent>
                  </Dialog>
            </>
      )
}
