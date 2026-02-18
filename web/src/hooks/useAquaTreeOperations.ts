import { useStore } from 'zustand'
import Aquafier, {
      AquaTree,
      AquaTreeWrapper,
      FileObject,
      getAquaTreeFileName,
} from 'aqua-js-sdk'
import appStore from '@/store'
import apiClient from '@/api/axiosInstance'
import { ApiFileInfo } from '@/models/FileInfo'
import {
      dummyCredential,
      ensureDomainUrlHasSSL,
      estimateFileSize,
      fetchSystemFiles,
      getAquaTreeFileObject,
      getLastRevisionVerificationHash,
      reorderRevisionsInAquaTree,
} from '@/utils/functions'
import { signMessageWithAppKit } from '@/utils/appkit-wallet-utils'
import { API_ENDPOINTS } from '@/utils/constants'
import { FormField, FormTemplate } from '@/components/aqua_forms/types'

type CustomInputType = string | File | number | File[]

interface UseAquaTreeOperationsReturn {
      getSystemFiles: (
            systemFileInfo: ApiFileInfo[],
            backendUrl: string,
            sessionAddress: string,
      ) => Promise<ApiFileInfo[]>
      findTemplateApiFileInfo: (
            allSystemFiles: ApiFileInfo[],
            selectedTemplate: FormTemplate,
      ) => ApiFileInfo
      createGenesisAquaTree: (
            completeFormData: Record<string, CustomInputType>,
            fileName: string,
            aquafier: Aquafier,
      ) => Promise<{ genesisAquaTree: AquaTree; fileObject: FileObject }>
      linkToSystemAquaTree: (
            genesisAquaTree: AquaTree,
            fileObject: FileObject,
            templateApiFileInfo: ApiFileInfo,
            aquafier: Aquafier,
      ) => Promise<AquaTree>
      processFileAttachments: (
            selectedTemplate: FormTemplate,
            completeFormData: Record<string, CustomInputType>,
            aquaTreeData: AquaTree,
            fileObject: FileObject,
            aquafier: Aquafier,
            saveAquaTreeFn: (aquaTree: AquaTree, fileObj: FileObject, isFinal: boolean, isWorkflow: boolean) => Promise<void>,
      ) => Promise<AquaTree>
      signAquaTree: (
            aquaTreeData: AquaTree,
            fileObject: FileObject,
            aquafier: Aquafier,
      ) => Promise<AquaTree>
      loadThisTreeFromSystem: (aquaTree: AquaTree) => Promise<ApiFileInfo | null>
}

export function useAquaTreeOperations(): UseAquaTreeOperationsReturn {
      const { session, backend_url, webConfig } = useStore(appStore)

      /**
       * Fetches system files, using the provided cache if available.
       * Falls back to fetching from the server if the cache is empty.
       */
      const getSystemFiles = async (
            systemFileInfo: ApiFileInfo[],
            backendUrl: string,
            sessionAddress: string,
      ): Promise<ApiFileInfo[]> => {
            let allSystemFiles = systemFileInfo

            if (systemFileInfo.length === 0) {
                  const url = ensureDomainUrlHasSSL(`${backendUrl}/system/aqua_tree`)
                  const systemFiles = await fetchSystemFiles(url, sessionAddress)
                  allSystemFiles = systemFiles
            }

            if (allSystemFiles.length === 0) {
                  throw new Error('Aqua tree for templates not found')
            }

            return allSystemFiles
      }

      /**
       * Finds the API file info for a given template among the system files.
       */
      const findTemplateApiFileInfo = (
            allSystemFiles: ApiFileInfo[],
            selectedTemplate: FormTemplate,
      ): ApiFileInfo => {
            const templateApiFileInfo = allSystemFiles.find(e => {
                  const nameExtract = getAquaTreeFileName(e!.aquaTree!)
                  const selectedName = `${selectedTemplate?.name}.json`
                  return nameExtract === selectedName
            })

            if (!templateApiFileInfo) {
                  throw new Error(`Aqua tree for ${selectedTemplate?.name} not found`)
            }

            return templateApiFileInfo
      }

      /**
       * Creates a genesis AquaTree from the provided form data and file name.
       */
      const createGenesisAquaTree = async (
            completeFormData: Record<string, CustomInputType>,
            fileName: string,
            aquafier: Aquafier,
      ): Promise<{ genesisAquaTree: AquaTree; fileObject: FileObject }> => {
            const estimateSize = estimateFileSize(JSON.stringify(completeFormData))
            const jsonString = JSON.stringify(completeFormData)
            const fileObject: FileObject = {
                  fileContent: jsonString,
                  fileName: fileName,
                  path: './',
                  fileSize: estimateSize,
            }

            const genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

            if (genesisAquaTree.isErr()) {
                  throw new Error('Error creating genesis aqua tree')
            }

            return { genesisAquaTree: genesisAquaTree.data.aquaTree!, fileObject }
      }

      /**
       * Links a genesis AquaTree to a system template AquaTree.
       */
      const linkToSystemAquaTree = async (
            genesisAquaTree: AquaTree,
            fileObject: FileObject,
            templateApiFileInfo: ApiFileInfo,
            aquafier: Aquafier,
      ): Promise<AquaTree> => {
            const mainAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: genesisAquaTree,
                  revision: '',
                  fileObject: fileObject,
            }

            const linkedAquaTreeFileObj = getAquaTreeFileObject(templateApiFileInfo)
            if (!linkedAquaTreeFileObj) {
                  throw new Error('System Aqua tree has error')
            }

            const linkedToAquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: templateApiFileInfo.aquaTree!,
                  revision: '',
                  fileObject: linkedAquaTreeFileObj,
            }

            const linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

            if (linkedAquaTreeResponse.isErr()) {
                  throw new Error('Error linking aqua tree')
            }

            return linkedAquaTreeResponse.data.aquaTree!
      }

      /**
       * Processes file attachments from the form, creating genesis revisions
       * for each file and linking them into the aqua tree.
       */
      const processFileAttachments = async (
            selectedTemplate: FormTemplate,
            completeFormData: Record<string, CustomInputType>,
            aquaTreeData: AquaTree,
            fileObject: FileObject,
            aquafier: Aquafier,
            saveAquaTreeFn: (aquaTree: AquaTree, fileObj: FileObject, isFinal: boolean, isWorkflow: boolean) => Promise<void>,
      ): Promise<AquaTree> => {
            const containsFileData = selectedTemplate?.fields.filter(
                  (e: FormField) => e.type === 'file' || e.type === 'scratchpad' || e.type === 'image' || e.type === 'document',
            )

            if (!containsFileData || containsFileData.length === 0) {
                  return aquaTreeData
            }

            const fileProcessingPromises = containsFileData.map(async (element: FormField) => {
                  if (element.is_array) {
                        const files: File[] = completeFormData[element.name] as File[]

                        if (!files || !Array.isArray(files) || files.length === 0) {
                              console.warn(`No files found for field: ${element.name}`)
                              return null
                        }

                        try {
                              const fileObjects = await Promise.all(
                                    files.map(async (file) => {
                                          if (typeof file === 'string' || !(file instanceof File)) {
                                                console.warn(`Invalid file type for field: ${element.name}. Expected File object, got:`, typeof file)
                                                return null
                                          }

                                          const arrayBuffer = await file.arrayBuffer()
                                          const uint8Array = new Uint8Array(arrayBuffer)

                                          const fileObjectPar: FileObject = {
                                                fileContent: uint8Array,
                                                fileName: file.name,
                                                path: './',
                                                fileSize: file.size,
                                          }

                                          return fileObjectPar
                                    }),
                              )

                              return fileObjects.filter(Boolean)
                        } catch (error) {
                              console.error(`Error processing files for field ${element.name}:`, error)
                              throw new Error(`Error processing files for field ${element.name}`)
                        }
                  } else {
                        const file: File = completeFormData[element.name] as File

                        if (!file) {
                              console.warn(`No file found for field: ${element.name}`)
                              return null
                        }

                        if (typeof file === 'string' || !(file instanceof File)) {
                              console.warn(`Invalid file type for field: ${element.name}. Expected File object, got:`, typeof file)
                              return null
                        }

                        try {
                              const arrayBuffer = await file.arrayBuffer()
                              const uint8Array = new Uint8Array(arrayBuffer)

                              const fileObjectPar: FileObject = {
                                    fileContent: uint8Array,
                                    fileName: file.name,
                                    path: './',
                                    fileSize: file.size,
                              }

                              return fileObjectPar
                        } catch (error) {
                              console.error(`Error processing file ${file.name}:`, error)
                              throw new Error(`Error processing file ${file.name}`)
                        }
                  }
            })

            const fileObjects = await Promise.all(fileProcessingPromises)
            const validFileObjects = fileObjects.flat().filter(obj => obj !== null) as FileObject[]

            let currentAquaTreeData = aquaTreeData

            for (const item of validFileObjects) {
                  const aquaTreeResponse = await aquafier.createGenesisRevision(item)

                  if (aquaTreeResponse.isErr()) {
                        throw new Error('Error creating aqua tree for file')
                  }

                  await saveAquaTreeFn(aquaTreeResponse.data.aquaTree!, item, true, true)

                  const aquaTreeWrapper: AquaTreeWrapper = {
                        aquaTree: currentAquaTreeData,
                        revision: '',
                        fileObject: fileObject,
                  }

                  const aquaTreeWrapper2: AquaTreeWrapper = {
                        aquaTree: aquaTreeResponse.data.aquaTree!,
                        revision: '',
                        fileObject: item,
                  }

                  const res = await aquafier.linkAquaTree(aquaTreeWrapper, aquaTreeWrapper2)

                  if (res.isErr()) {
                        throw new Error('Error linking file aqua tree')
                  }

                  currentAquaTreeData = res.data.aquaTree!
            }

            return currentAquaTreeData
      }

      /**
       * Signs an AquaTree using either MetaMask or AppKit inline signing,
       * depending on the configured AUTH_PROVIDER.
       */
      const signAquaTree = async (
            aquaTreeData: AquaTree,
            fileObject: FileObject,
            aquafier: Aquafier,
      ): Promise<AquaTree> => {
            const aquaTreeWrapper: AquaTreeWrapper = {
                  aquaTree: aquaTreeData,
                  revision: '',
                  fileObject: fileObject,
            }

            if (webConfig.AUTH_PROVIDER == 'metamask') {
                  const metamaskWrapper: AquaTreeWrapper = {
                        aquaTree: aquaTreeData,
                        revision: '',
                        fileObject: fileObject,
                  }

                  const signRes = await aquafier.signAquaTree(metamaskWrapper, 'metamask', dummyCredential())

                  if (signRes.isErr()) {
                        throw new Error('Error signing failed')
                  }

                  return signRes.data.aquaTree!
            } else {
                  const targetRevisionHash = getLastRevisionVerificationHash(aquaTreeData)
                  const messageToSign = `I sign this revision: [${targetRevisionHash}]`
                  const { signature, signerAddress } = await signMessageWithAppKit(messageToSign, session?.address!)

                  const signRes = await aquafier.signAquaTree(aquaTreeWrapper, 'inline', dummyCredential(), true, undefined, {
                        signature,
                        walletAddress: signerAddress,
                  })

                  if (signRes.isErr()) {
                        throw new Error('Error signing failed')
                  }

                  return signRes.data.aquaTree!
            }
      }

      /**
       * Loads a full ApiFileInfo from the system by posting ordered revision hashes.
       */
      const loadThisTreeFromSystem = async (aquaTree: AquaTree): Promise<ApiFileInfo | null> => {
            try {
                  const orderedRevisionHashes = reorderRevisionsInAquaTree(aquaTree)

                  const url = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.GET_AQUA_TREE}`)
                  const res = await apiClient.post(url, {
                        revisionHashes: orderedRevisionHashes,
                  }, {
                        headers: {
                              'Content-Type': 'application/json',
                              nonce: session?.nonce,
                        },
                  })
                  if (res.status === 200) {
                        return res.data.data
                  }
            } catch (_error) {
                  return null
            }
            return null
      }

      return {
            getSystemFiles,
            findTemplateApiFileInfo,
            createGenesisAquaTree,
            linkToSystemAquaTree,
            processFileAttachments,
            signAquaTree,
            loadThisTreeFromSystem,
      }
}
